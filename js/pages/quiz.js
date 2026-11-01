// The exercises: a full-screen round of questions, then what you got right and what to practise again.
import { h, icon, alertBox } from "../ui.js";
import { MODES, pickOptions, checkTyped, core, splitNote, localDay, shuffle } from "../core.js";
import { store } from "../store.js";
import { speak } from "../speech.js";
import { wordText, speakButton, plural } from "./common.js";

const PRAISE = [[1, "Perfekt!"], [0.8, "Bra jobbat!"], [0.5, "Bra försök!"], [0, "Fortsätt öva!"]];
const TITLES = { right: "Rätt!", almost: "Nästan!", wrong: "Inte riktigt" };
const AUTO_NEXT = 900;              // ms: after a right pick the next word comes by itself

const sizeClass = (s) => (s.length > 28 ? "xs" : s.length > 18 ? "sm" : s.length > 11 ? "md" : "");
const keepFocus = (el) => { el.addEventListener("mousedown", (ev) => ev.preventDefault()); return el; };   // the keyboard stays up

function insertAtCursor(input, ch) {
  const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? s;
  input.value = input.value.slice(0, s) + ch + input.value.slice(e);
  input.focus({ preventScroll: true });
  input.setSelectionRange(s + ch.length, s + ch.length);
}

function ring(pct) {
  const r = 46, c = 2 * Math.PI * r;
  return h("div", { class: "sum-ring", html: `<svg viewBox="0 0 110 110" width="124" height="124" aria-hidden="true">
    <circle cx="55" cy="55" r="${r}" class="ring-track"/>
    <circle cx="55" cy="55" r="${r}" class="ring-fill" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 55 55)"/></svg>` },
  h("div", { class: "sum-ring-text" }, `${Math.round(pct * 100)}%`));
}

/**
 * mode: "sv-el" | "el-sv" | "type"; words: this round's words; pool: the chosen words; all: every word
 * (wrong options come from the pool first); person: who's practising; repick(): a new round's words.
 */
export function startQuiz({ mode, words, pool, all, person, repick, onEnd }) {
  const M = MODES[mode];
  const autoSpeak = () => Boolean(store.pref("speak", false));
  let list = words, answers = [], i = 0, timer = null, saved = false, closed = false;
  let current = null;               // the question on screen: { word, done, moved, choose(k), grade(giveUp) }

  const fill = h("div", { class: "quiz-bar-fill" });
  const counter = h("div", { class: "quiz-count" });
  const closeBtn = h("button", { type: "button", class: "quiz-close", "aria-label": "End the round" }, icon("close", 24));
  const promptSlot = h("div", { class: "q-prompt" });
  const answerSlot = h("div", { class: "q-answer" });
  const footSlot = h("div", { class: "q-foot", "aria-live": "polite" });
  const stage = h("div", { class: "quiz-stage" }, promptSlot, answerSlot, footSlot);
  const root = h("div", { class: `quiz mode-${mode}`, role: "dialog", "aria-modal": "true", "aria-label": M.title },
    h("div", { class: "quiz-top" }, closeBtn, h("div", { class: "quiz-bar" }, fill), counter), stage);

  // Typing: one answer box for the whole round, so the keyboard stays up from word to word
  let input = null, submitBtn = null, dunnoBtn = null, typeForm = null;
  if (M.type) {
    input = h("input", { class: "type-input", type: "text", placeholder: "Skriv på svenska…", autocomplete: "off", autocorrect: "off",
      autocapitalize: "none", spellcheck: "false", enterkeyhint: "go", lang: "sv", "aria-label": "Your answer in Swedish" });
    const keys = h("div", { class: "sv-keys" }, ["å", "ä", "ö"].map((ch) =>
      keepFocus(h("button", { type: "button", class: "sv-key", tabindex: "-1", "aria-label": ch, onclick: () => insertAtCursor(input, ch) }, ch))));
    submitBtn = h("button", { type: "submit", class: "btn primary wide" }, "Check");
    dunnoBtn = keepFocus(h("button", { type: "button", class: "btn plain dunno", onclick: () => current?.grade?.(true) }, "I don't know"));
    typeForm = h("form", { class: "type-form", novalidate: true, onsubmit: (ev) => {
      ev.preventDefault();
      if (current?.done) next(); else current?.grade?.(false);
    } }, input, keys, keepFocus(submitBtn), dunnoBtn);
  }

  document.getElementById("layer").appendChild(root);
  document.documentElement.classList.add("locked");
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open")));

  // With the keyboard up, fit into what's left of the screen
  const vv = window.visualViewport;
  const fit = () => { if (!vv || closed) return; root.style.height = `${vv.height}px`; root.style.top = `${vv.offsetTop}px`; };
  vv?.addEventListener("resize", fit);
  vv?.addEventListener("scroll", fit);
  fit();

  const onKey = (ev) => {
    if (ev.key === "Escape") { closeBtn.click(); return; }
    if (!current || M.type || document.querySelector(".alert-wrap")) return;
    if (!current.done && /^[1-9]$/.test(ev.key)) current.choose(Number(ev.key) - 1);
    else if (current.done && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); next(); }
  };
  document.addEventListener("keydown", onKey);

  closeBtn.addEventListener("click", async () => {
    if (!current || !answers.length) { save(); close(); return; }     // nothing answered yet, or the summary
    const ok = await alertBox({ title: "End this round?", message: `Your ${plural(answers.length, "answer")} so far still count.`,
      buttons: [{ text: "Keep going", value: false, style: "cancel" }, { text: "End round", value: true, style: "bold" }] });
    if (ok) { save(); close(); }
  });

  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    document.removeEventListener("keydown", onKey);
    vv?.removeEventListener("resize", fit);
    vv?.removeEventListener("scroll", fit);
    input?.blur();
    root.classList.remove("open");
    document.documentElement.classList.remove("locked");
    setTimeout(() => root.remove(), 320);
    onEnd?.();
  }

  function save() {
    if (saved || !answers.length) return;
    saved = true;
    store.recordRound(person.id, mode, answers.map((a) => ({ id: a.id, res: a.res })), localDay());
  }

  function progress() {
    fill.style.width = `${(Math.min(i, list.length) / list.length) * 100}%`;
    counter.textContent = i < list.length ? `${i + 1} / ${list.length}` : "";
  }

  function showPrompt(word) {
    const { main, note } = splitNote(word[M.ask]);
    const sv = M.ask === "sv";
    promptSlot.replaceChildren(h("div", { class: "q-card" },
      h("div", { class: "q-lang" }, sv ? "Svenska" : "Ελληνικά"),
      h("div", { class: `q-word ${sizeClass(main)}`, lang: sv ? "sv" : "el" }, main),
      note ? h("div", { class: "q-note" }, note) : null,
      sv ? speakButton(word.sv, 22, "q-speak") : null));
  }

  function feedback(result, why, word, extra = null) {
    return h("div", { class: `feedback fb-${result}` },
      h("div", { class: "fb-head" }, icon(result === "right" ? "check" : result === "almost" ? "info" : "close", 20), TITLES[result]),
      why ? h("div", { class: "fb-why" }, why) : null,
      word ? h("div", { class: "fb-pair" }, wordText(word.sv, "fb-sv"), h("span", { class: "fb-eq" }, "="), h("span", { class: "fb-el" }, word.el),
        speakButton(word.sv, 18, "fb-speak")) : null,
      extra);
  }

  function ask() {
    const word = list[i];
    clearTimeout(timer);
    showPrompt(word);
    footSlot.replaceChildren();
    if (M.type) askTyped(word); else askChoice(word);
  }

  function next() {
    if (!current || !current.done || current.moved) return;
    current.moved = true;
    clearTimeout(timer);
    i++;
    progress();
    if (i >= list.length) summary(); else ask();
  }

  // -- pick one ---------------------------------------------------------------
  function askChoice(word) {
    const show = M.answer;
    const options = pickOptions(word, pool, all, mode);
    const rightAt = options.indexOf(word);
    const buttons = options.map((o, k) => h("button", { type: "button", class: "opt", lang: show === "sv" ? "sv" : "el", onclick: () => choose(k) },
      h("span", { class: "opt-key", "aria-hidden": "true" }, String(k + 1)), wordText(o[show], "opt-text")));
    function choose(k) {
      if (current.done || k >= options.length) return;
      current.done = true;
      const right = k === rightAt || core(options[k][show]) === core(word[show]);
      buttons[k].classList.add(right ? "right" : "wrong");
      buttons[rightAt].classList.add("right");
      buttons.forEach((b, j) => { if (j !== k && j !== rightAt) b.classList.add("dim"); });
      answers.push({ id: word.id, res: right ? "right" : "wrong" });
      if (autoSpeak() && show === "sv") speak(word.sv);
      if (right) {
        footSlot.replaceChildren(feedback("right", "", null));
        timer = setTimeout(next, AUTO_NEXT);
      } else {
        footSlot.replaceChildren(feedback("wrong", "", word), h("button", { type: "button", class: "btn primary wide", onclick: next }, "Continue"));
      }
    }
    current = { word, done: false, moved: false, choose };
    answerSlot.replaceChildren(h("div", { class: "options" }, buttons));
    if (autoSpeak() && M.ask === "sv") speak(word.sv);
  }

  // -- type it ------------------------------------------------------------------
  function askTyped(word) {
    input.value = "";
    input.className = "type-input";
    submitBtn.textContent = "Check";
    dunnoBtn.hidden = false;
    if (!answerSlot.contains(typeForm)) answerSlot.replaceChildren(typeForm);
    current = { word, done: false, moved: false, grade: (giveUp) => grade(word, giveUp) };
    input.focus({ preventScroll: true });
  }

  function grade(word, giveUp) {
    if (current.done) return;
    const typed = giveUp ? "" : input.value;
    if (!giveUp && !typed.trim()) { input.focus({ preventScroll: true }); return; }
    current.done = true;
    const { result, why } = checkTyped(typed, word.sv);
    const rec = { id: word.id, res: result };
    answers.push(rec);
    input.classList.add(`is-${result}`);
    submitBtn.textContent = "Continue";
    dunnoBtn.hidden = true;
    if (autoSpeak()) speak(word.sv);
    // a right answer the list doesn't know (another word for it): count it yourself
    const fix = result !== "right" && typed.trim() ? keepFocus(h("button", { type: "button", class: "link-btn fb-fix", onclick: (ev) => {
      rec.res = "right";
      ev.currentTarget.replaceWith(h("span", { class: "fb-fixed" }, icon("check", 15), "Counted as right"));
    } }, "I was right")) : null;
    footSlot.replaceChildren(feedback(result, giveUp ? "" : why, word, fix));
    input.focus({ preventScroll: true });
  }

  // -- the end of the round -------------------------------------------------------
  function summary() {
    save();
    current = null;
    input?.blur();
    const n = answers.length;
    const right = answers.filter((a) => a.res === "right").length;
    const almost = answers.filter((a) => a.res === "almost").length;
    const pct = n ? (right + almost) / n : 0;
    const praise = PRAISE.find(([min]) => pct >= min - 1e-9)[1];
    const missed = answers.filter((a) => a.res !== "right").map((a) => [list.find((w) => w.id === a.id), a.res]).filter(([w]) => w);
    stage.replaceChildren(h("div", { class: "summary" },
      ring(pct),
      h("div", { class: "sum-title" }, praise),
      h("div", { class: "sum-sub" }, `${right + almost} of ${n} right${almost ? ` · ${almost} almost` : ""}`),
      missed.length ? null : h("div", { class: "sum-perfect" }, "Every word right."),
      h("div", { class: "sum-buttons" },
        missed.length ? h("button", { type: "button", class: "btn primary wide", onclick: () => restart(shuffle(missed.map(([w]) => w))) },
          missed.length === 1 ? "Practise the one you missed" : `Practise the ${missed.length} you missed`) : null,
        h("button", { type: "button", class: `btn ${missed.length ? "tinted" : "primary"} wide`, onclick: () => {
          const fresh = repick();
          if (fresh.words.length) { pool = fresh.pool; all = fresh.all; restart(fresh.words); } else close();
        } }, "New round"),
        h("button", { type: "button", class: "btn plain wide", onclick: close }, "Done")),
      missed.length ? [
        h("div", { class: "sum-caption" }, "Words to practise · tap to hear"),
        h("div", { class: "group sum-list" }, missed.map(([w, res]) => h("button", { type: "button", class: "word-row", onclick: () => speak(w.sv) },
          h("span", { class: `dot ${res === "almost" ? "dot-almost" : "dot-wrong"}` }),
          h("span", { class: "word-texts" }, wordText(w.sv, "word-sv"), h("span", { class: "word-el" }, w.el)),
          speakButton(w.sv, 18, "row-speaker")))),
      ] : null));
    stage.scrollTop = 0;
    progress();
  }

  function restart(nextWords) {
    list = nextWords;
    answers = [];
    i = 0;
    saved = false;
    stage.replaceChildren(promptSlot, answerSlot, footSlot);
    answerSlot.replaceChildren();
    progress();
    ask();
  }

  progress();
  ask();
}
