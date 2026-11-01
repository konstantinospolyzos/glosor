// Pieces the pages share: who's practising, which words are chosen, word lines, the progress bar.
import { h, icon, splitBar, alertBox, askText } from "../ui.js";
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

/**
 * The name of who's practising, at the top of every page. With two or more people a tap switches who
 * uses this phone; with one it renames (the first name from Google, or "Me" until you give one).
 */
export function nameChip(refresh) {
  const data = store.data;
  const me = currentPerson();
  const unnamed = data.people.length === 1 && me.name === "Me";
  const many = data.people.length > 1;
  return h("button", { type: "button", class: `name-chip ${unnamed ? "unnamed" : ""}`, "aria-label": many ? "Who's practising" : "Your name",
    onclick: async () => {
      if (many) {
        const id = await alertBox({ title: "Who's practising?", message: "Each person has their own progress.",
          buttons: [...data.people.map((p) => ({ text: p.name, value: p.id, style: p.id === me.id ? "bold" : "" })),
            { text: "Cancel", value: null, style: "cancel" }] });
        if (id) { store.setPref("person", id); refresh(); }
        return;
      }
      const name = await askText({ title: "Your name", value: unnamed ? "" : me.name, placeholder: "Your name" });
      if (name) store.savePerson({ ...me, name });
    } },
  h("span", { class: "name-avatar" }, unnamed ? icon("people", 16) : me.name.trim()[0].toUpperCase()),
  h("span", { class: "name-text" }, unnamed ? "Add your name" : me.name),
  many ? icon("chevronDown", 13) : null);
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
