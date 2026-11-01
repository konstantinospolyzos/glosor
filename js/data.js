// The data file: chapters of words, the people practising, and each person's progress.
// Every change is an "operation" (applyOp), so two phones can change the file at the same time:
// the store replays the changes it hasn't saved yet on top of the newest copy from Google Drive.
import { APP_NAME, MAX_BOX, nextBox, sameName, uid, wordKey, exerciseKey, BLANK, withSynonym, withoutSynonym, withAnswer, withoutAnswer } from "./core.js";

export const DATA_VERSION = 1;
const DAYS_KEPT = 400;
const ROUNDS_KEPT = 200;

export function emptyData() {
  return { app: APP_NAME, version: DATA_VERSION, updated: null, chapters: [], people: [{ id: "p1", name: "Me" }], progress: {}, settings: {} };
}

const text = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** A sentence exercise as stored (see parseExercise), or null when it isn't one */
export function cleanExercise(x, id = x?.id) {
  if (!x || typeof x !== "object" || typeof id !== "string" || !id) return null;
  const t = (v) => (typeof v === "string" ? v.trim() : "");
  const out = { id, kind: x.kind, text: t(x.text) };
  if (!out.text) return null;
  if (x.kind === "ordna") {
    const alts = Array.isArray(x.alts) ? x.alts.map(t).filter(Boolean) : [];
    if (alts.length) out.alts = alts;
  } else if (x.kind === "välj") {
    const options = Array.isArray(x.options) ? x.options.map(t).filter(Boolean) : [];
    if (options.length < 2 || !out.text.includes(BLANK)) return null;
    out.options = options;
  } else if (x.kind === "fyll") {
    out.answer = t(x.answer);
    if (!out.answer || !out.text.includes(BLANK)) return null;
    if (t(x.hint)) out.hint = t(x.hint);
  } else return null;
  if (t(x.el)) out.el = t(x.el);
  if (t(x.tip)) out.tip = t(x.tip);
  return out;
}

const cleanExercises = (list) => {
  const ids = new Set();
  return (Array.isArray(list) ? list : []).map((x) => {
    const id = typeof x?.id === "string" && x.id && !ids.has(x.id) ? x.id : uid("x");
    ids.add(id);
    return cleanExercise(x, id);
  }).filter(Boolean);
};

/** A word as stored: id, Swedish, Greek, and its forms when it has them (the first form is the Swedish) */
export function cleanWord(w, id = w.id) {
  const sv = text(w?.sv), el = text(w?.el);
  const forms = Array.isArray(w?.forms) && w.forms.length >= 2 && w.forms.length <= 5 ? w.forms.map((f) => text(f) || "-") : null;
  if (forms) forms[0] = sv;
  return { id, sv, el, ...(forms ? { forms } : {}) };
}
const count = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

function cleanProgress(p) {
  const words = {};
  for (const [id, r] of Object.entries(p?.words && typeof p.words === "object" ? p.words : {})) {
    if (!r || typeof r !== "object") continue;
    words[id] = { b: Math.min(MAX_BOX, count(r.b)), r: count(r.r), a: count(r.a), w: count(r.w), t: count(r.t) };
  }
  const days = [...new Set((Array.isArray(p?.days) ? p.days : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(-DAYS_KEPT);
  const rounds = (Array.isArray(p?.rounds) ? p.rounds : []).filter((r) => r && typeof r === "object")
    .map((r) => ({ at: count(r.at), mode: text(r.mode), n: count(r.n), right: count(r.right), almost: count(r.almost) }))
    .slice(-ROUNDS_KEPT);
  return { words, days, rounds };
}

/** Check and tidy a data file (from Drive or a backup) */
export function normalize(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.chapters)) throw new Error("This isn't a Glosor file.");
  const chapterIds = new Set(), wordIds = new Set();
  const chapters = [];
  for (const c of raw.chapters) {
    if (!c || typeof c !== "object") continue;
    const id = typeof c.id === "string" && c.id && !chapterIds.has(c.id) ? c.id : uid("c");
    chapterIds.add(id);
    const words = [];
    for (const w of Array.isArray(c.words) ? c.words : []) {
      const sv = text(w?.sv), el = text(w?.el);
      if (!sv || !el) continue;
      const wid = typeof w.id === "string" && w.id && !wordIds.has(w.id) ? w.id : uid("w");
      wordIds.add(wid);
      words.push(cleanWord(w, wid));
    }
    const exercises = cleanExercises(c.exercises);
    chapters.push({ id, name: text(c.name) || "Untitled", created: typeof c.created === "string" ? c.created : null, words,
      ...(exercises.length ? { exercises } : {}) });
  }
  const personIds = new Set();
  const people = (Array.isArray(raw.people) ? raw.people : []).filter((p) => p && typeof p.id === "string" && p.id && !personIds.has(p.id))
    .map((p) => { personIds.add(p.id); return { id: p.id, name: text(p.name) || "Me" }; });
  if (!people.length) people.push({ id: "p1", name: "Me" });
  const progress = {};
  for (const [id, p] of Object.entries(raw.progress && typeof raw.progress === "object" ? raw.progress : {})) progress[id] = cleanProgress(p);
  const settings = raw.settings && typeof raw.settings === "object" ? { ...raw.settings } : {};
  return { app: APP_NAME, version: DATA_VERSION, updated: raw.updated || null, chapters, people, progress, settings };
}

export function describeData(d) {
  if (!d || !d.chapters.length) return "no words yet";
  const n = d.chapters.length, w = d.chapters.reduce((a, c) => a + c.words.length, 0);
  return `${n} chapter${n !== 1 ? "s" : ""}, ${w} word${w !== 1 ? "s" : ""}`;
}

export const allWords = (d) => d.chapters.flatMap((c) => c.words);
export const allExercises = (d) => d.chapters.flatMap((c) => c.exercises || []);

/** Apply one change to a copy of the data */
export function applyOp(data, op) {
  const d = structuredClone(data);
  switch (op.type) {
    case "addWords":            // new chapters, or new words for a chapter (by id, or else by name)
      for (const c of op.chapters || []) {
        let ch = d.chapters.find((x) => x.id === c.id) || d.chapters.find((x) => sameName(x.name, c.name));
        if (!ch) {
          ch = { id: c.id, name: text(c.name) || "Untitled", created: c.created || null, words: [] };
          d.chapters.push(ch);
        }
        const have = new Set(ch.words.map(wordKey));
        const ids = new Set(d.chapters.flatMap((x) => x.words.map((w) => w.id)));
        for (const w of c.words || []) {
          if (!w?.sv || !w?.el || have.has(wordKey(w)) || ids.has(w.id)) continue;
          ch.words.push(cleanWord(w));
          have.add(wordKey(w));
          ids.add(w.id);
        }
        const haveX = new Set((ch.exercises || []).map(exerciseKey));
        for (const x of c.exercises || []) {
          const clean = cleanExercise(x);
          if (!clean || haveX.has(exerciseKey(clean))) continue;
          ch.exercises = [...(ch.exercises || []), clean];
          haveX.add(exerciseKey(clean));
        }
      }
      break;
    case "putChapter": {        // renamed or edited
      const exercises = cleanExercises(op.chapter.exercises);
      const ch = { id: op.chapter.id, name: text(op.chapter.name) || "Untitled", created: op.chapter.created || null,
        words: op.chapter.words.map((w) => cleanWord(w)), ...(exercises.length ? { exercises } : {}) };
      const i = d.chapters.findIndex((x) => x.id === ch.id);
      if (i >= 0) d.chapters[i] = ch; else d.chapters.push(ch);
      break;
    }
    case "deleteChapter":
      d.chapters = d.chapters.filter((c) => c.id !== op.id);
      break;
    case "putPerson": {
      const i = d.people.findIndex((p) => p.id === op.person.id);
      const p = { id: op.person.id, name: text(op.person.name) || "Me" };
      if (i >= 0) d.people[i] = p; else d.people.push(p);
      break;
    }
    case "deletePerson":
      d.people = d.people.filter((p) => p.id !== op.id);
      delete d.progress[op.id];
      if (!d.people.length) d.people.push({ id: "p1", name: "Me" });
      break;
    case "answers": {           // a finished round: each word moves up or back, and the day counts
      const p = d.progress[op.person] || (d.progress[op.person] = { words: {}, days: [], rounds: [] });
      let right = 0, almost = 0;
      for (const it of op.items || []) {
        const rec = p.words[it.id] || { b: 0, r: 0, a: 0, w: 0, t: 0 };
        rec.b = nextBox(rec.b, it.res, op.mode);
        if (it.res === "right") { rec.r++; right++; } else if (it.res === "almost") { rec.a++; almost++; } else rec.w++;
        rec.t = Math.max(rec.t || 0, op.at || 0);
        p.words[it.id] = rec;
      }
      if (op.day && !p.days.includes(op.day)) p.days = [...p.days, op.day].sort().slice(-DAYS_KEPT);
      if (op.items?.length) p.rounds = [...p.rounds, { at: op.at || 0, mode: op.mode, n: op.items.length, right, almost }].slice(-ROUNDS_KEPT);
      break;
    }
    case "accept": {            // another answer that counts: a word's synonym, or another answer for a gap
      const s = text(op.text);
      if (!s) break;
      for (const c of d.chapters) {
        const w = op.word && c.words.find((x) => x.id === op.word);
        if (w) {
          w.sv = op.remove ? withoutSynonym(w.sv, s) : withSynonym(w.sv, s);
          if (w.forms) w.forms[0] = w.sv;
        }
        const x = op.exercise && (c.exercises || []).find((e) => e.id === op.exercise);
        if (x?.kind === "fyll") x.answer = op.remove ? withoutAnswer(x.answer, s) : withAnswer(x.answer, s);
      }
      break;
    }
    case "resetProgress":
      delete d.progress[op.person];
      break;
    case "setSetting":
      d.settings[op.key] = op.value;
      break;
    case "replaceAll":
      return normalize(op.data);
    default:
      throw new Error(`Unknown change: ${op.type}`);
  }
  return d;
}
