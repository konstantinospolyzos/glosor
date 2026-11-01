// Practise: choose the words, then an exercise. Your progress underneath.
import { h, icon, segmented, caption, alertBox, toggle, toast } from "../ui.js";
import { store } from "../store.js";
import { allWords } from "../data.js";
import { MODES, summarize, streak, localDay, bestTime } from "../core.js";
import { currentPerson, currentRecords, currentProgress, selection, setSelection, poolFor, mistakes, reviews, questionsFor, exercisesFor, withPlural, levelBar, dot, plural, LEVELS } from "./common.js";
import { canSpeak } from "../speech.js";
import { openAddWords, addExample } from "./words.js";

export const ROUND_SIZES = [[10, "10"], [20, "20"], [0, "All"]];

// [caption, [mode, tile colour, tile text or icon name]...]
const EXERCISES = [
  ["Words", [["sv-el", "ex-blue", "Å→α"], ["el-sv", "ex-indigo", "α→Å"], ["type", "ex-orange", "keyboard"], ["listen", "ex-teal", "speaker"]]],
  ["Grammar", [["ovning", "ex-red", "doc"], ["gender", "ex-pink", "en/ett"]]],
  ["Böj ordet", [["bestamd", "ex-purple", "-en"], ["plural", "ex-mint", "-ar"], ["verb", "ex-violet", "tala!"], ["forms", "ex-grape", "edit"]]],
  ["Game", [["time", "ex-green", "timer"]]],
];

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
  const due = reviews(data, records);
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
      data.chapters.map((c) => chip(c.name, c.words.length || `${c.exercises?.length || 0} ex.`, chosen(c.id), () => toggleChapter(c.id))),
      due.length ? chip("Due today", due.length, sel === "due", () => pick("due"), "due") : null,
      missed.length ? chip("Missed", missed.length, sel === "mistakes", () => pick("mistakes"), "warn") : null),
    h("div", { class: "round-row" }, h("span", { class: "round-text" }, `Round: ${plural(roundN, "word")}`), sizes));

  const tooFew = new Set(all.map((w) => w.el)).size < 2;
  const best = bestTime(currentProgress().rounds);
  // why an exercise can't start with the words chosen (or null when it can)
  const blocked = (M) => {
    if (M.ovning) {
      const n = exercisesFor(data, records, sel).length;
      return n ? null : "No exercises in these chapters yet";
    }
    if (M.gender) return questionsFor("gender", pool).length ? null : "No en/ett words in the chosen chapters";
    if (M.forms) return questionsFor(M.key, pool).length ? null
      : M.drill === "bestamd" ? "No nouns with their forms in these chapters yet"
      : M.drill === "plural" ? "No nouns with a plural in these chapters yet"
      : M.drill === "verb" ? "No verbs with their forms in these chapters yet" : "No word forms in these chapters yet";
    if (!pool.length) return "No words in the chosen chapters yet";
    if (M.listen && !canSpeak()) return "This phone can't read words aloud";
    return !M.type && tooFew ? "Needs at least two words" : null;
  };
  const card = ([mode, tone, glyph]) => {
    const M = MODES[mode];
    const why = blocked(M);
    const nx = mode === "ovning" && !why ? exercisesFor(data, records, sel).length : 0;
    const text = mode === "bestamd" && withPlural() ? "en kock → kocken, kockar, kockarna" : M.text;
    const sub = why || (mode === "time" && best ? `${text} · best ${best}` : nx ? `${text} · ${nx}` : text);
    const button = h("button", { type: "button", class: "exercise", disabled: why ? true : null, onclick: () => ctx.startQuiz(mode) },
      h("span", { class: `ex-icon ${tone}` }, /^[a-z]+$/.test(glyph) ? icon(glyph, 26) : h("span", { class: `ex-glyph ${glyph.length > 4 ? "small" : ""}` }, glyph)),
      h("span", { class: "ex-text" }, h("span", { class: "ex-title" }, M.title), h("span", { class: "ex-sub" }, sub)),
      icon("chevron", 16, "chev"));
    if (mode !== "bestamd") return button;
    // the plural switch, under its exercise
    return [button, h("label", { class: "form-row switch-row ex-option" },
      h("span", { class: "ex-option-text" }, h("span", null, "Plural too"), h("span", { class: "ex-sub" }, "kockar, kockarna")),
      toggle(withPlural(), (on) => { store.setPref("plural", on); ctx.refresh(); }, "Bestämd form: plural too"))];
  };
  const groups = EXERCISES.flatMap(([name, list]) => [caption(name), h("div", { class: "exercises" }, list.map(card))]);

  // the review button sits at the bottom, the words and exercises at the top: choose, then go up there
  const reviewDue = () => {
    pick("due");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast(`${plural(due.length, "word")} chosen · pick an exercise`);
  };
  return [subtitle, caption("Words to practise"), words, ...groups, progressCard(person, records, due, reviewDue)];
}

function progressCard(person, records, due, pickDue) {
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
    due.length ? h("button", { type: "button", class: "due-row", onclick: pickDue },
      icon("sync", 18), h("span", { class: "due-text" }, `${plural(due.length, "word")} to review today`), icon("chevron", 14, "chev")) : null,
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
