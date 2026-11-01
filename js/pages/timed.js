// Tidsjakt: as many words as you can in 60 seconds. Pick-one questions, Swedish → Greek and
// Greek → Swedish mixed; a right answer moves straight on, a wrong one costs you a moment.
import { h, icon } from "../ui.js";
import { MODES, TIME_LIMIT, TIME_OPTIONS, pickOptions, core, splitNote, localDay, shuffle, bestTime } from "../core.js";
import { store } from "../store.js";
import { speak } from "../speech.js";
import { wordText, speakButton, plural, currentProgress } from "./common.js";

const RIGHT_PAUSE = 250;           // ms on a right answer before the next word
const WRONG_PAUSE = 900;           // ms to see the right answer after a wrong one

const sizeClass = (s) => (s.length > 28 ? "xs" : s.length > 18 ? "sm" : s.length > 11 ? "md" : "");

/** Everyone's best, when more than one person practises with this file */
function everyonesBest() {
  const d = store.data;
  if (d.people.length < 2) return null;
  const rows = d.people.map((p) => [p, bestTime(d.progress[p.id]?.rounds)]).sort((a, b) => b[1] - a[1]);
  return h("div", { class: "time-bests" }, h("div", { class: "sum-caption" }, "Best scores"),
    h("div", { class: "group" }, rows.map(([p, best], i) => h("div", { class: "info-row" },
      h("span", { class: "info-label" }, `${i === 0 && best ? "🏆 " : ""}${p.name}`), h("span", { class: "info-value strong" }, plural(best, "word"))))));
}

/** pool: the chosen words; all: every word (wrong options); person: who's practising */
export function startTimed({ pool, all, person, repick, onEnd }) {
  let answers = [], queue = [], timer = null, tick = null, endsAt = 0, closed = false, running = false, current = null;

  const fill = h("div", { class: "quiz-bar-fill time-fill" });
  const counter = h("div", { class: "quiz-count time-count" });
  const closeBtn = h("button", { type: "button", class: "quiz-close", "aria-label": "Stop" }, icon("close", 24));
  const stage = h("div", { class: "quiz-stage" });
  const root = h("div", { class: "quiz mode-time", role: "dialog", "aria-modal": "true", "aria-label": MODES.time.title },
    h("div", { class: "quiz-top" }, closeBtn, h("div", { class: "quiz-bar" }, fill), counter), stage);
  document.getElementById("layer").appendChild(root);
  document.documentElement.classList.add("locked");
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open")));

  const onKey = (ev) => {
    if (ev.key === "Escape") { closeBtn.click(); return; }
    if (!running && ev.key === "Enter") stage.querySelector(".start-btn")?.click();
    if (running && current && /^[1-9]$/.test(ev.key)) current.choose(Number(ev.key) - 1);
  };
  document.addEventListener("keydown", onKey);
  closeBtn.addEventListener("click", () => { if (running) finish(); else close(); });

  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    clearInterval(tick);
    document.removeEventListener("keydown", onKey);
    root.classList.remove("open");
    document.documentElement.classList.remove("locked");
    setTimeout(() => root.remove(), 320);
    onEnd?.();
  }

  // the clock: a bar that empties, and the seconds left
  function showClock() {
    const left = Math.max(0, endsAt - Date.now());
    fill.style.width = `${(left / (TIME_LIMIT * 1000)) * 100}%`;
    fill.classList.toggle("low", left < 10000);
    counter.textContent = `${Math.ceil(left / 1000)} s`;
    if (!left) finish();
  }

  function nextWord() {
    if (!queue.length) queue = shuffle(pool);
    return queue.pop();
  }

  function intro() {
    running = false;
    const best = bestTime(currentProgress().rounds);
    fill.style.width = "100%";
    fill.classList.remove("low");
    counter.textContent = `${TIME_LIMIT} s`;
    stage.replaceChildren(h("div", { class: "summary time-intro" },
      h("div", { class: "time-big" }, icon("timer", 64)),
      h("div", { class: "sum-title" }, MODES.time.title),
      h("div", { class: "sum-sub" }, `As many words as you can in ${TIME_LIMIT} seconds. Swedish and Greek mixed; a wrong answer costs you a moment.`),
      store.data.people.length < 2 && best ? h("div", { class: "time-best" }, `Your best: ${plural(best, "word")}`) : null,
      h("div", { class: "sum-buttons" },
        h("button", { type: "button", class: "btn primary wide start-btn", onclick: start }, "Start")),
      everyonesBest()));
  }

  function start() {
    answers = [];
    queue = [];
    running = true;
    endsAt = Date.now() + TIME_LIMIT * 1000;
    clearInterval(tick);
    tick = setInterval(showClock, 100);
    showClock();
    ask();
  }

  function ask() {
    if (!running) return;
    const word = nextWord();
    const mode = Math.random() < 0.5 ? "sv-el" : "el-sv";
    const M = MODES[mode];
    const options = pickOptions(word, pool, all, mode, TIME_OPTIONS);
    const rightAt = options.indexOf(word);
    const { main, note } = splitNote(word[M.ask]);
    const sv = M.ask === "sv";
    const buttons = options.map((o, k) => h("button", { type: "button", class: "opt", lang: M.answer, onclick: () => choose(k) },
      h("span", { class: "opt-key", "aria-hidden": "true" }, String(k + 1)), wordText(o[M.answer], "opt-text")));
    const score = answers.filter((a) => a.res === "right").length;
    function choose(k) {
      if (!running || current.done || k >= options.length) return;
      current.done = true;
      const right = k === rightAt || core(options[k][M.answer]) === core(word[M.answer]);
      buttons[k].classList.add(right ? "right" : "wrong");
      buttons[rightAt].classList.add("right");
      answers.push({ id: word.id, res: right ? "right" : "wrong" });
      if (store.pref("speak", false)) speak(word.sv);
      timer = setTimeout(ask, right ? RIGHT_PAUSE : WRONG_PAUSE);
    }
    current = { word, done: false, choose };
    stage.replaceChildren(
      h("div", { class: "time-score" }, h("span", null, String(score)), ` ${score === 1 ? "word" : "words"}`),
      h("div", { class: "q-card" },
        h("div", { class: "q-lang" }, sv ? "Svenska" : "Ελληνικά"),
        h("div", { class: `q-word ${sizeClass(main)}`, lang: M.ask }, main),
        note ? h("div", { class: "q-note" }, note) : null),
      h("div", { class: "options" }, buttons));
  }

  function finish() {
    if (!running) return;
    running = false;
    current = null;
    clearTimeout(timer);
    clearInterval(tick);
    fill.style.width = "0%";
    counter.textContent = "0 s";
    const before = bestTime(currentProgress().rounds);
    if (answers.length) store.recordRound(person.id, "time", answers, localDay());
    const right = answers.filter((a) => a.res === "right").length;
    const record = right > before && before > 0;
    const seen = new Set();
    const missed = answers.filter((a) => a.res !== "right" && !seen.has(a.id) && seen.add(a.id))
      .map((a) => pool.find((w) => w.id === a.id) || all.find((w) => w.id === a.id)).filter(Boolean);
    stage.replaceChildren(h("div", { class: "summary" },
      h("div", { class: "time-result" }, String(right)),
      h("div", { class: "sum-title" }, record ? "Nytt rekord!" : right ? "Bra jobbat!" : "Försök igen!"),
      h("div", { class: "sum-sub" }, `${plural(right, "word")} in ${TIME_LIMIT} seconds${answers.length > right ? ` · ${answers.length - right} wrong` : ""}`),
      store.data.people.length < 2 ? h("div", { class: "time-best" }, `Your best: ${plural(Math.max(right, before), "word")}`) : null,
      h("div", { class: "sum-buttons" },
        h("button", { type: "button", class: "btn primary wide start-btn", onclick: () => {
          const fresh = repick();
          if (fresh.pool.length) { pool = fresh.pool; all = fresh.all; }
          start();
        } }, "Play again"),
        h("button", { type: "button", class: "btn plain wide", onclick: close }, "Done")),
      everyonesBest(),
      missed.length ? [
        h("div", { class: "sum-caption" }, "Missed · tap to hear"),
        h("div", { class: "group sum-list" }, missed.map((w) => h("button", { type: "button", class: "word-row", onclick: () => speak(w.sv) },
          h("span", { class: "dot dot-wrong" }),
          h("span", { class: "word-texts" }, wordText(w.sv, "word-sv"), h("span", { class: "word-el" }, w.el)),
          speakButton(w.sv, 18, "row-speaker")))),
      ] : null));
    stage.scrollTop = 0;
  }

  intro();
}
