// Practise: choose the words, then one of the three exercises. Your progress underneath.
import { h, icon, segmented, caption, alertBox } from "../ui.js";
import { store } from "../store.js";
import { allWords } from "../data.js";
import { MODES, summarize, streak, localDay } from "../core.js";
import { currentPerson, currentRecords, currentProgress, selection, setSelection, poolFor, mistakes, levelBar, dot, plural, LEVELS } from "./common.js";
import { openAddWords, addExample } from "./words.js";

export const ROUND_SIZES = [[10, "10"], [20, "20"], [0, "All"]];

// [mode, tile colour, tile text or icon name]
const EXERCISES = [["sv-el", "ex-blue", "Å→α"], ["el-sv", "ex-indigo", "α→Å"], ["type", "ex-orange", "keyboard"], ["time", "ex-green", "timer"]];

export function renderPractise(ctx) {
  const data = store.data;
  const all = allWords(data);
  const person = currentPerson();
  const records = currentRecords();
  if (!all.length) return ["Learn your Swedish words", emptyPractise(ctx)];
  const subtitle = `${plural(all.length, "word")} in ${plural(data.chapters.length, "chapter")}`;

  const sel = selection(data, records);
  const pool = poolFor(data, records, sel);
  const missed = mistakes(data, records);
  const chosen = (id) => Array.isArray(sel) && sel.includes(id);
  const pick = (next) => { setSelection(next); ctx.refresh(); };
  const toggleChapter = (id) => {
    const ids = Array.isArray(sel) ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : [id];
    pick(ids.length ? ids : "all");
  };
  const chip = (text, n, on, onClick, tone = "") => h("button", { type: "button", class: `pick-chip ${on ? "on" : ""} ${tone}`, "aria-pressed": String(on), onclick: onClick },
    on ? icon("check", 14) : null, text, h("span", { class: "pick-n" }, n));

  const count = store.pref("count", 10);
  const roundN = count && count < pool.length ? count : pool.length;
  const sizes = segmented(ROUND_SIZES.map(([, t]) => t), Math.max(0, ROUND_SIZES.findIndex(([n]) => n === count)), (i) => {
    store.setPref("count", ROUND_SIZES[i][0]);
    ctx.refresh();
  }, "small");

  const words = h("div", { class: "card pick-card" },
    h("div", { class: "pick-chips" },
      chip("All words", all.length, sel === "all", () => pick("all")),
      data.chapters.map((c) => chip(c.name, c.words.length, chosen(c.id), () => toggleChapter(c.id))),
      missed.length ? chip("Missed", missed.length, sel === "mistakes", () => pick("mistakes"), "warn") : null),
    h("div", { class: "round-row" }, h("span", { class: "round-text" }, `Round: ${plural(roundN, "word")}`), sizes));

  const tooFew = new Set(all.map((w) => w.el)).size < 2;
  const exercises = h("div", { class: "exercises" }, EXERCISES.map(([mode, tone, glyph]) => {
    const M = MODES[mode];
    const off = !M.type && tooFew;
    return h("button", { type: "button", class: "exercise", disabled: off || null, onclick: () => ctx.startQuiz(mode) },
      h("span", { class: `ex-icon ${tone}` }, /^[a-z]+$/.test(glyph) ? icon(glyph, 26) : h("span", { class: "ex-glyph" }, glyph)),
      h("span", { class: "ex-text" }, h("span", { class: "ex-title" }, M.title), h("span", { class: "ex-sub" }, off ? "Needs at least two words" : M.text)),
      icon("chevron", 16, "chev"));
  }));

  return [subtitle, caption("Words to practise"), words, caption("Exercise"), exercises, progressCard(person, records)];
}

function progressCard(person, records) {
  const data = store.data;
  const prog = currentProgress();
  const s = summarize(allWords(data), records);
  const days = streak(prog.days, localDay());
  const last = prog.rounds.at(-1);
  const legend = ["known", "learning", "weak", "new"].filter((k) => s[k]).map((k) =>
    h("span", { class: "legend-item" }, dot(k), `${s[k]} ${LEVELS[k][0].toLowerCase()}`));
  const when = (at) => {
    const d = new Date(at);
    const day = localDay(d) === localDay() ? "today" : d.toLocaleDateString([], { day: "numeric", month: "short" });
    return `${day} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };
  return h("div", { class: "card progress-card" },
    h("div", { class: "progress-top" },
      h("div", null, h("div", { class: "caption" }, data.people.length > 1 ? `${person.name}'s progress` : "Your progress"),
        h("div", { class: "progress-big" }, `${s.known}`, h("span", { class: "progress-of" }, ` of ${s.total} known`))),
      days ? h("div", { class: "streak", title: "Days in a row" }, icon("flame", 20), h("span", null, plural(days, "day")), h("span", { class: "streak-sub" }, "in a row")) : null),
    levelBar(s, 8),
    h("div", { class: "legend" }, legend),
    last ? h("div", { class: "last-round" }, `Last round: ${last.right + last.almost} of ${last.n} right · ${MODES[last.mode]?.title || ""} · ${when(last.at)}`)
      : h("div", { class: "last-round" }, "Words move up each time you get them right, and come back more often when you miss them."));
}

function emptyPractise(ctx) {
  return h("div", { class: "card empty-state" },
    h("img", { class: "empty-logo", src: "icons/icon-192.png", alt: "" }),
    h("div", { class: "empty-title" }, "Välkommen!"),
    h("div", { class: "empty-text" }, "Add the word list from your Swedish class, then practise it three ways: pick the Greek, pick the Swedish, or type the Swedish."),
    h("button", { type: "button", class: "btn primary", onclick: () => openAddWords(ctx) }, icon("plus", 19), "Add words"),
    h("button", { type: "button", class: "btn plain", onclick: () => addExample(ctx) }, icon("sparkle", 18), "Try it with 20 example words"));
}
