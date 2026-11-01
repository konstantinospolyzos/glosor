// Pieces the pages share: who's practising, which words are chosen, word lines, the progress bar.
import { h, icon, splitBar } from "../ui.js";
import { store } from "../store.js";
import { allWords } from "../data.js";
import { isMistake, splitNote } from "../core.js";
import { speak, canSpeak } from "../speech.js";

export const LEVELS = {
  known: ["Known", "var(--green)"],
  learning: ["Learning", "var(--orange)"],
  weak: ["Missed", "var(--red)"],
  new: ["New", "var(--gray3)"],
};

/** The person practising on this phone */
export function currentPerson() {
  const d = store.data;
  return d.people.find((p) => p.id === store.pref("person")) || d.people[0];
}

/** That person's word records: {wordId: {b, r, a, w, t}} */
export const currentRecords = () => store.data.progress[currentPerson().id]?.words || {};
export const currentProgress = () => store.data.progress[currentPerson().id] || { words: {}, days: [], rounds: [] };

export const mistakes = (data, records) => allWords(data).filter((w) => isMistake(records[w.id]));

/** The words chosen on Practise: "all", "mistakes" or a list of chapter ids (checked against the data) */
export function selection(data, records) {
  const sel = store.pref("sel", "all");
  if (sel === "mistakes") return mistakes(data, records).length ? "mistakes" : "all";
  if (Array.isArray(sel)) {
    const ids = sel.filter((id) => data.chapters.some((c) => c.id === id));
    return ids.length ? ids : "all";
  }
  return "all";
}
export const setSelection = (sel) => store.setPref("sel", sel);

export function poolFor(data, records, sel) {
  if (sel === "mistakes") return mistakes(data, records);
  if (Array.isArray(sel)) return data.chapters.filter((c) => sel.includes(c.id)).flatMap((c) => c.words);
  return allWords(data);
}

/** Known / learning / missed / new as one bar */
export const levelBar = (s, height = 8) => splitBar(["known", "learning", "weak", "new"].map((k) => [s[k], LEVELS[k][1]]), height);

export const dot = (lvl) => h("span", { class: "dot", style: { background: LEVELS[lvl][1] }, title: LEVELS[lvl][0] });

/** A word with its note in brackets shown smaller */
export function wordText(text, cls = "") {
  const { main, note } = splitNote(text);
  return h("span", { class: cls }, main, note ? h("span", { class: "word-note" }, ` ${note}`) : null);
}

export function speakButton(sv, size = 20, extra = "") {
  if (!canSpeak()) return null;
  return h("button", { type: "button", class: `speak-btn ${extra}`, "aria-label": "Listen",
    onclick: (ev) => { ev.stopPropagation(); speak(sv); } }, icon("speaker", size));
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
