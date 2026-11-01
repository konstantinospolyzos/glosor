// Glosor: the word logic. Reading pasted word lists, checking typed answers, choosing the words for a
// round and the wrong options for the pick-one exercises. No page code here, so the tests run it in Node.

export const APP_NAME = "Glosor";
export const APP_VERSION = "1.5";

/** The three exercises. ask: the side you see; answer: the side you give. */
export const MODES = {
  "sv-el": { key: "sv-el", title: "Svenska → Ελληνικά", text: "See the Swedish, pick the Greek", ask: "sv", answer: "el", type: false },
  "el-sv": { key: "el-sv", title: "Ελληνικά → Svenska", text: "See the Greek, pick the Swedish", ask: "el", answer: "sv", type: false },
  type: { key: "type", title: "Skriv på svenska", text: "See the Greek, type the Swedish", ask: "el", answer: "sv", type: true },
  listen: { key: "listen", title: "Lyssna", text: "Hear the Swedish, pick the Greek", ask: "sv", answer: "el", type: false, listen: true },
  gender: { key: "gender", title: "En eller ett?", text: "Is it en or ett?", ask: "sv", answer: "sv", type: false, gender: true },
  ovning: { key: "ovning", title: "Övningar", text: "Sentences on each chapter's grammar", ask: "sv", answer: "sv", type: true, ovning: true },
  // Böj ordet: type a form of the word. drill: which forms (see formQuestion)
  bestamd: { key: "bestamd", title: "Bestämd form", text: "en kock → kocken", ask: "sv", answer: "sv", type: true, forms: true, drill: "bestamd" },
  plural: { key: "plural", title: "Singular & plural", text: "en kock → kockar, kockar → en kock", ask: "sv", answer: "sv", type: true, forms: true, drill: "plural" },
  verb: { key: "verb", title: "Infinitiv & imperativ", text: "talar → tala, tala!", ask: "sv", answer: "sv", type: true, forms: true, drill: "verb" },
  forms: { key: "forms", title: "Alla former", text: "Every form: plural, past tense, adjectives", ask: "sv", answer: "sv", type: true, forms: true, drill: "all" },
  // against the clock: pick ones, Swedish → Greek and Greek → Swedish mixed
  time: { key: "time", title: "Tidsjakt", text: "As many words as you can in 60 seconds", ask: "sv", answer: "el", type: false, timed: true },
};

export const TIME_LIMIT = 60;      // seconds in a Tidsjakt
export const TIME_OPTIONS = 4;     // fewer answers to pick from: it's about speed

/** Your best Tidsjakt: the most right answers in one run */
export const bestTime = (rounds) => (rounds || []).filter((r) => r.mode === "time").reduce((m, r) => Math.max(m, r.right || 0), 0);

// How well a word is known: 0 (new, or missed last time) up to 5. A right pick moves it up one,
// a right typed answer two (typing is harder), a miss back to 0.
export const MAX_BOX = 5;
export const KNOWN_BOX = 4;
export const OPTIONS = 5;          // answers to pick from

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
const GREEK_RX = /[Ͱ-Ͽἀ-῿]/;
const LATIN_RX = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
export const hasGreek = (s) => GREEK_RX.test(String(s || ""));

/** "äta (äter, åt, ätit)" -> { main: "äta", note: "(äter, åt, ätit)" }: the note is shown smaller */
export function splitNote(text) {
  const s = String(text || "").trim();
  const i = s.indexOf("(");
  if (i <= 0) return { main: s, note: "" };
  return { main: s.slice(0, i).trim(), note: s.slice(i).trim() };
}

/** "idag / i dag" -> ["idag", "i dag"]; notes in brackets don't count */
export function alternatives(text) {
  return String(text || "").replace(/\([^)]*\)/g, " ").split("/")
    .map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
}

// Synonyms in a note: "tala (syn. prata)", "(syn. ingen orsak, inga problem)", "(synonym: jobba)"
const SYN_RX = /\(\s*(?:syn(?:onym(?:er)?)?|συν(?:ώνυμο)?)(?:\.\s*|:\s*|\s+)([^)]*)\)/gi;
const synList = (s) => String(s || "").split(/\s*[,/]\s*|\s+(?:eller|or)\s+/i).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
export const synonymsOf = (text) => [...String(text || "").matchAll(SYN_RX)].flatMap((m) => synList(m[1]));

/** Every answer that counts: each way of saying it, and its synonyms */
export const answersOf = (text) => [...alternatives(text), ...synonymsOf(text)];

const tidy = (s) => String(s || "").replace(/[()]/g, " ").replace(/[.!?]+\s*$/, "").replace(/\s+/g, " ").trim();

/** "tala" + "prata" -> "tala (syn. prata)"; a second one joins the note: "tala (syn. prata, snacka)" */
export function withSynonym(sv, syn) {
  const s = tidy(syn);
  if (!s || answersOf(sv).some((a) => core(a) === core(s))) return sv;
  const m = new RegExp(SYN_RX.source, "i").exec(sv);
  if (!m) return `${String(sv).trim()} (syn. ${s})`;
  const end = m.index + m[0].length - 1;
  return `${sv.slice(0, end).trimEnd()}, ${s}${sv.slice(end)}`;
}

export function withoutSynonym(sv, syn) {
  const gone = core(syn);
  return String(sv || "").replace(SYN_RX, (all, list) => {
    const kept = synList(list).filter((x) => core(x) !== gone);
    return kept.length ? `(syn. ${kept.join(", ")})` : "";
  }).replace(/\s+/g, " ").trim();
}

/** A gap's answers: "heter" + "kallas" -> "heter / kallas" */
export function withAnswer(answer, more) {
  const s = tidy(more);
  return !s || alternatives(answer).some((a) => core(a) === core(s)) ? answer : `${answer} / ${s}`;
}
export function withoutAnswer(answer, gone) {
  const kept = alternatives(answer).filter((a) => core(a) !== core(gone));
  return kept.length ? kept.join(" / ") : answer;
}

/** The Greek, compared: no accents, case, brackets or punctuation */
const meaningKey = (el) => String(el || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[()[\].,!?;:"“”«»'’·]/g, " ").replace(/\s+/g, " ").trim();
/** Other words in the lists with exactly the same Greek: asked that Greek, any of them is right */
export const sameMeaning = (w, all) => {
  const k = meaningKey(w?.el);
  return k ? (all || []).filter((o) => o && o.id !== w.id && meaningKey(o.el) === k) : [];
};

/** What answers are compared on: lower case, no notes in brackets, no punctuation, single spaces */
export function core(text) {
  return String(text || "").normalize("NFC").toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[.,!?;:"“”„«»'’‘`´¡¿…]/g, " ")
    .replace(/\s+/g, " ").trim();
}

/** Without the dots and rings: "hejda" for "hejdå", "bror" for "brör" */
export const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");

/** The word to read aloud: the first way of saying it, without its note */
export const speakable = (sv) => alternatives(sv)[0] || String(sv || "").trim();

/** Same word in a list: same Swedish and same Greek */
export const wordKey = (w) => `${core(w.sv)}\u0001${core(w.el)}`;
export const sameName = (a, b) => core(a) === core(b);

/** en/ett words, att verbs, the rest: the wrong options look like the right one */
export function kindOf(w) {
  const k = formKind(w);
  if (k) return k === "adj" ? "other" : k;
  const s = core(w.sv);
  if (/^(en|ett) /.test(s)) return "noun";
  if (/^att /.test(s)) return "verb";
  return "other";
}

let seq = 0;
export function uid(prefix) {
  seq = (seq + 1) % 1296;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36).padStart(2, "0")}${Math.random().toString(36).slice(2, 6)}`;
}

export function shuffle(list, rnd = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Reading a pasted word list
//   Kapitel 3                     <- a title starts a chapter (optional)
//   en hund = ένας σκύλος         <- one word a line: Swedish, a separator, Greek (either order)
//   äta (äter, åt, ätit) = τρώω   <- a note in brackets is shown, but not needed when typing
//   idag / i dag = σήμερα         <- either answer is right
// Separators: = – - : ; | tab →. Every word line needs Greek on one side, which is how the
// Swedish and the Greek are told apart (and how "Kapitel 3 – Familj" stays a title).
// ---------------------------------------------------------------------------
const BULLET_RX = /^(?:[-*•·▪◦]|\d{1,3}[.)])\s+/;
const TITLE_RX = /^(?:kapitel|chapter|κεφάλαιο|κεφ\.|lektion|lesson|avsnitt|tema|del|vecka|week)\b/i;
const SPLITTERS = [/\t+/, /\s*(?:→|->|=>)\s*/, /\s*=+\s*/, /\s+-+\s+|\s*[–—]+\s*/, /\s*\|\s*/, /\s*;\s*/, /\s*:\s*/];
// leftover separators at the ends of a side (a ; at the end stays: it's the Greek question mark)
const EDGE_RX = /^[\s\-–—=:;|,→>]+|[\s\-–—=:|,→>]+$/g;

const clean = (s) => String(s || "").replace(EDGE_RX, "").replace(/\s+/g, " ").trim();

// a side with forms keeps its "-" (no such form) and "|" at the ends
const cleanSide = (s) => (s.includes("|") ? s.replace(/^[\s=:;,→>]+|[\s=:;,→>]+$/g, "").replace(/\s+/g, " ").trim() : clean(s));

function pair(a, b) {
  a = cleanSide(a); b = cleanSide(b);
  if (!a || !b) return null;
  const ga = hasGreek(a), gb = hasGreek(b);
  if (ga === gb) return null;                   // one side Swedish, the other Greek
  return withForms(ga ? { sv: b, el: a } : { sv: a, el: b });
}

/** "en kock | kocken | kockar | kockarna" -> sv "en kock" and its forms ("-" for one that doesn't exist) */
function withForms(p) {
  if (!p.sv.includes("|")) return p;
  const forms = p.sv.split("|").map((f) => f.replace(/\s+/g, " ").trim() || "-");
  if (forms.length < 2 || forms[0] === "-") return { sv: forms.filter((f) => f !== "-").join(" ") || p.sv, el: p.el };
  return { sv: forms[0], el: p.el, forms };
}

/** One line -> {sv, el}, or null */
export function splitLine(line) {
  for (const rx of SPLITTERS) {
    const m = rx.exec(line);
    if (!m || m.index === 0) continue;
    const p = pair(line.slice(0, m.index), line.slice(m.index + m[0].length));
    if (p) return p;
  }
  // no separator: split where the Greek starts (Swedish first) or ends (Greek first)
  const gi = line.search(GREEK_RX), li = line.search(LATIN_RX);
  if (gi < 0 || li < 0) return null;
  if (li < gi) return pair(line.slice(0, gi), line.slice(gi));
  let end = gi;
  for (let i = gi; i < line.length; i++) if (GREEK_RX.test(line[i])) end = i;
  return pair(line.slice(end + 1), line.slice(0, end + 1));
}

/** Text -> { chapters: [{name|null, words: [{sv, el}]}], skipped: [{line, why}] } */
export function parseWordList(text) {
  const chapters = [], skipped = [];
  let cur = null, first = true;
  for (const raw of String(text || "").replace(/\r\n?/g, "\n").split("\n")) {
    let line = raw.replace(/[   ]/g, " ").trim();
    if (!line || /^[-=_*~.·•]{3,}$/.test(line)) continue;
    const hash = line.startsWith("#");
    line = line.replace(/^#+\s*/, "").replace(BULLET_RX, "").trim();
    if (!line) continue;
    const x = hash ? null : parseExercise(line);
    const p = hash || x ? null : splitLine(line);
    if (x) {
      if (x.error) skipped.push({ line: raw.trim(), why: x.error });
      else {
        if (!cur) { cur = { name: null, words: [], exercises: [] }; chapters.push(cur); }
        if (!cur.exercises.some((e) => exerciseKey(e) === exerciseKey(x))) cur.exercises.push(x);
      }
    } else if (p) {
      if (!cur) { cur = { name: null, words: [], exercises: [] }; chapters.push(cur); }
      if (!cur.words.some((w) => wordKey(w) === wordKey(p))) cur.words.push(p);
    } else if (hash || TITLE_RX.test(line) || (first && !hasGreek(line))) {
      const name = clean(line);
      if (cur && !cur.words.length && !cur.exercises.length) cur.name = name;   // two titles in a row: the last one names it
      else { cur = { name, words: [], exercises: [] }; chapters.push(cur); }
    } else {
      skipped.push({ line: raw.trim(), why: hasGreek(line) ? "Couldn't tell the Swedish from the Greek" : "No Greek word in this line" });
    }
    first = false;
  }
  return { chapters: chapters.filter((c) => c.words.length || c.exercises.length), skipped };
}

/**
 * What saving a pasted list would do: each chapter is new, or adds to the chapter with the same name
 * (only the words it doesn't have yet). An unnamed list gets defaultName.
 * -> [{ id, name, target (existing chapter or null), words: [{id, sv, el}], dupes }]
 */
export function planAdd(chapters, parsed, defaultName) {
  const out = [];
  parsed.forEach((pc, i) => {
    const name = pc.name || (i === 0 ? defaultName : `${defaultName} (${i + 1})`);
    const target = chapters.find((c) => sameName(c.name, name)) || null;
    const planned = out.find((o) => sameName(o.name, name));       // the same title twice in the paste
    const have = new Set([...(target?.words || []), ...(planned?.words || [])].map(wordKey));
    const haveX = new Set([...(target?.exercises || []), ...(planned?.exercises || [])].map(exerciseKey));
    const exercises = (pc.exercises || []).filter((x) => !haveX.has(exerciseKey(x)) && haveX.add(exerciseKey(x))).map((x) => ({ id: uid("x"), ...x }));
    const words = [];
    let dupes = 0;
    for (const w of pc.words) {
      if (have.has(wordKey(w))) { dupes++; continue; }
      have.add(wordKey(w));
      words.push({ id: uid("w"), sv: w.sv, el: w.el, ...(w.forms ? { forms: w.forms } : {}) });
    }
    if (planned) { planned.words.push(...words); planned.exercises.push(...exercises); planned.dupes += dupes; return; }
    out.push({ id: target ? target.id : uid("c"), name: target ? target.name : name, target, words, exercises, dupes });
  });
  return out;
}

/** The chapter as text: what Share sends and Edit shows (the same format the paste reads) */
export function chapterText(ch, withTitle = true) {
  return [withTitle ? ch.name : null, ...ch.words.map((w) => `${w.forms ? w.forms.join(" | ") : w.sv} = ${w.el}`),
    ...(ch.exercises || []).map(exerciseLine)].filter(Boolean).join("\n");
}

/** Edited text -> the chapter's words, keeping each word's id (and so its progress) when it's still there */
export function applyEdit(chapter, text) {
  const { chapters, skipped } = parseWordList(text);
  return { words: matchWords(chapter.words, chapters.flatMap((c) => c.words)),
    exercises: matchExercises(chapter.exercises || [], chapters.flatMap((c) => c.exercises)), skipped };
}

/** New words for a chapter, each keeping the id (and so the progress) of the old word it matches */
export function matchWords(oldWords, parsed) {
  const byKey = new Map(), bySv = new Map(), byEl = new Map();
  for (const w of oldWords) {
    if (!byKey.has(wordKey(w))) byKey.set(wordKey(w), w);
    if (!bySv.has(core(w.sv))) bySv.set(core(w.sv), w);
    if (!byEl.has(core(w.el))) byEl.set(core(w.el), w);
  }
  const used = new Set(), seen = new Set();
  const words = [];
  for (const p of parsed) {
    if (seen.has(wordKey(p))) continue;
    seen.add(wordKey(p));
    // the same pair, or the same Swedish with a corrected Greek, or the other way round
    const old = [byKey.get(wordKey(p)), bySv.get(core(p.sv)), byEl.get(core(p.el))].find((w) => w && !used.has(w.id));
    const id = old ? old.id : uid("w");
    used.add(id);
    words.push({ id, sv: p.sv, el: p.el, ...(p.forms ? { forms: p.forms } : {}) });
  }
  return words;
}

// ---------------------------------------------------------------------------
// Övningar: sentence exercises, one a line in a chapter's list
//   [fyll] Jag ___ Maria. (heta) = heter              type the missing word (the hint in brackets is optional)
//   [välj] ___ kommer du ifrån? = Varifrån | Var | Vad   pick it: the first answer is the right one
//   [ordna] Varifrån kommer du?                       build the sentence from its words (|| another right order;
//                                                     ^ keeps a name's capital letter at the start)
// Each can end with  // the Greek  and  !! a short rule shown after answering.
// ---------------------------------------------------------------------------
export const BLANK = "___";
const KINDS = { fyll: "fyll", fill: "fyll", välj: "välj", valj: "välj", ordna: "ordna", order: "ordna" };
export const EXERCISE_LABELS = { fyll: "Fyll i", välj: "Välj rätt", ordna: "Bygg meningen" };

/** One line -> an exercise, {error} for an exercise line that's wrong, or null for any other line */
export function parseExercise(line) {
  const m = /^\[([a-zåäö]+)\]\s*(.+)$/i.exec(line.trim());
  if (!m) return null;
  const kind = KINDS[m[1].toLowerCase()];
  if (!kind) return { error: `Unknown exercise [${m[1]}]` };
  let rest = m[2], tip = "", el = "";
  const t = rest.indexOf(" !! ");
  if (t >= 0) { tip = rest.slice(t + 4).trim(); rest = rest.slice(0, t); }
  const g = rest.indexOf(" // ");
  if (g >= 0) { el = rest.slice(g + 4).trim(); rest = rest.slice(0, g); }
  rest = rest.trim();
  const extra = { ...(el ? { el } : {}), ...(tip ? { tip } : {}) };
  if (kind === "ordna") {
    const alts = rest.split(" || ").map((s) => s.trim()).filter(Boolean);
    if (!alts.length || alts.some((a) => sentenceTokens(a).words.length < 2)) return { error: "A sentence to build needs at least two words" };
    return { kind, text: alts[0], ...(alts.length > 1 ? { alts: alts.slice(1) } : {}), ...extra };
  }
  const eq = rest.lastIndexOf(" = ");
  if (eq < 0) return { error: `[${kind}] needs " = " and the answer` };
  let text = rest.slice(0, eq).trim();
  const after = rest.slice(eq + 3).trim();
  if (!text.includes(BLANK)) return { error: `[${kind}] needs ${BLANK} where the answer goes` };
  if (kind === "välj") {
    const options = after.split("|").map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) return { error: "[välj] needs the right answer and at least one wrong one, split by |" };
    return { kind, text, options, ...extra };
  }
  let hint = "";
  const h = /\s*\(([^)]*)\)\s*$/.exec(text);
  if (h) { hint = h[1].trim(); text = text.slice(0, h.index).trim(); }
  if (!after) return { error: "[fyll] needs the answer after =" };
  return { kind, text, answer: after, ...(hint ? { hint } : {}), ...extra };
}

/** The exercise as a line again (what Edit shows) */
export function exerciseLine(x) {
  const tail = `${x.el ? ` // ${x.el}` : ""}${x.tip ? ` !! ${x.tip}` : ""}`;
  if (x.kind === "ordna") return `[ordna] ${[x.text, ...(x.alts || [])].join(" || ")}${tail}`;
  if (x.kind === "välj") return `[välj] ${x.text} = ${x.options.join(" | ")}${tail}`;
  return `[fyll] ${x.text}${x.hint ? ` (${x.hint})` : ""} = ${x.answer}${tail}`;
}

export const exerciseKey = (x) => `${x.kind}\u0001${core(x.text.replace(/^\^/, ""))}`;

/** Edited or replaced exercises keep their id (and progress) when their sentence is the same */
export function matchExercises(old, parsed) {
  const byKey = new Map(old.map((x) => [exerciseKey(x), x]));
  const seen = new Set();
  return parsed.filter((x) => !seen.has(exerciseKey(x)) && seen.add(exerciseKey(x)))
    .map((x) => ({ ...x, id: byKey.get(exerciseKey(x))?.id || uid("x") }));
}

/** "Varifrån kommer du?" -> words ["varifrån", "kommer", "du"], end "?" (the first word in small letters unless ^) */
export function sentenceTokens(sentence) {
  let s = String(sentence || "").trim();
  const keep = s.startsWith("^");
  if (keep) s = s.slice(1);
  const m = /[.!?…]+$/.exec(s);
  const end = m ? m[0] : "";
  if (m) s = s.slice(0, m.index);
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length && !keep && !/^[A-ZÅÄÖ]{2,}$/.test(words[0])) words[0] = words[0][0].toLowerCase() + words[0].slice(1);
  return { words, end };
}

/** A built sentence vs the right one(s), not minding the first capital letter */
export function checkOrder(built, x) {
  const norm = (ws) => ws.join(" ").toLowerCase();
  return [x.text, ...(x.alts || [])].some((s) => norm(sentenceTokens(s).words) === norm(built));
}

/** The sentence with its gap filled in, for the answer shown afterwards */
export const filled = (x, answer) => x.text.replace(BLANK, answer);

/** An exercise as a question the exercise screen asks */
export function exerciseQuestion(x) {
  const first = (s) => alternatives(s)[0] || s;
  const say = (s) => s.replace(/^\^/, "");
  if (x.kind === "ordna") {
    return { id: x.id, kind: "ordna", x, sv: say(x.text), el: x.el || "", fb: say(x.text), say: say(x.text), tip: x.tip || "" };
  }
  const answer = x.kind === "välj" ? x.options[0] : x.answer;
  const full = filled(x, first(answer));
  return { id: x.id, kind: x.kind, x, sv: answer, el: x.el || "", fb: full, say: full, tip: x.tip || "", hint: x.hint || "" };
}

// ---------------------------------------------------------------------------
// Checking a typed answer
// ---------------------------------------------------------------------------
const LEAD_RX = /^(en|ett|att) (.+)$/;
const lead = (s) => { const m = LEAD_RX.exec(s); return m ? { lead: m[1], rest: m[2] } : { lead: "", rest: s }; };
const isArticle = (x) => x === "en" || x === "ett";

/** Edits between two words, a swap of two letters counting as one */
export function distance(a, b) {
  const n = a.length, m = b.length;
  if (!n) return m;
  if (!m) return n;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...new Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[n][m];
}

/**
 * typed vs the list's Swedish -> { result: "right" | "almost" | "wrong", why }
 * Any way of saying it counts ("idag / i dag"), and its synonyms ("tala (syn. prata)").
 * Right: the word (with or without its en/ett/att). Almost: the wrong en/ett, a missing å/ä/ö,
 * or one small typo (two in long words).
 */
export function checkTyped(typed, expected) {
  const t = core(typed);
  if (!t) return { result: "wrong", why: "" };
  let best = { result: "wrong", why: "" };
  for (const alt of answersOf(expected)) {
    const e = core(alt);
    if (!e) continue;
    if (t === e) return { result: "right", why: "" };
    const T = lead(t), E = lead(e);
    if (T.rest === E.rest) {
      if (isArticle(E.lead) && isArticle(T.lead)) {
        best = { result: "almost", why: `It's “${E.lead} ${E.rest}”, not “${T.lead} ${T.rest}”` };
        continue;
      }
      if (isArticle(E.lead) && !T.lead) return { result: "right", why: `With its article: ${E.lead} ${E.rest}` };
      return { result: "right", why: "" };
    }
    if (best.result === "almost") continue;
    if (fold(T.rest) === fold(E.rest)) { best = { result: "almost", why: "Check å, ä and ö" }; continue; }
    const tol = E.rest.length >= 8 ? 2 : E.rest.length >= 4 ? 1 : 0;
    if (tol && distance(fold(T.rest), fold(E.rest)) <= tol) best = { result: "almost", why: "Small spelling mistake" };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------
/** Where a word goes after an answer */
export function nextBox(box, result, mode) {
  const b = Number.isFinite(box) ? Math.max(0, Math.min(MAX_BOX, box)) : 0;
  if (result === "wrong") return 0;
  return Math.min(MAX_BOX, b + (mode === "type" && result === "right" ? 2 : 1));
}

/** "new" (never answered), "weak" (missed last time), "learning" or "known" */
export function level(rec) {
  if (!rec || !((rec.r || 0) + (rec.a || 0) + (rec.w || 0))) return "new";
  if ((rec.b || 0) >= KNOWN_BOX) return "known";
  if (!rec.b) return "weak";
  return "learning";
}

/** Missed last time it was asked */
export const isMistake = (rec) => Boolean(rec) && (rec.b || 0) === 0 && (rec.w || 0) > 0;

export function summarize(words, records) {
  const s = { total: words.length, new: 0, weak: 0, learning: 0, known: 0, pct: 0 };
  let sum = 0;
  for (const w of words) {
    const rec = records?.[w.id];
    s[level(rec)]++;
    sum += rec ? Math.min(MAX_BOX, rec.b || 0) : 0;
  }
  s.pct = words.length ? Math.round((100 * sum) / (MAX_BOX * words.length)) : 0;
  return s;
}

/**
 * The words for a round: all of them (shuffled) when the round is that long, otherwise a draw where
 * the words you know least come up most (a missed or new word 36 times as often as one you know well).
 */
export function pickRound(words, records, count, rnd = Math.random) {
  const list = [...words];
  if (!count || count >= list.length) return shuffle(list, rnd);
  const now = Date.now();
  const weight = (w) => {
    const rec = records?.[w.id];
    return (MAX_BOX + 1 - Math.max(0, Math.min(MAX_BOX, rec?.b ?? 0))) ** 2 * (isDue(rec, now) ? 1 : 0.2);
  };
  const weights = list.map(weight);
  const out = [];
  for (let k = 0; k < count; k++) {
    let r = rnd() * weights.reduce((a, x) => a + x, 0), i = 0;
    while (i < list.length - 1 && r >= weights[i]) { r -= weights[i]; i++; }
    out.push(list[i]);
    list.splice(i, 1);
    weights.splice(i, 1);
  }
  return shuffle(out, rnd);
}

/**
 * The answers to pick from: the right word and up to n-1 others, from the chosen chapters first, then from
 * all of them, the same kind of word first (en/ett words with en/ett words). Never two with the same text,
 * and never one that also fits the question (two Swedish words with the same Greek).
 */
export function pickOptions(answer, pool, all, mode, n = OPTIONS, rnd = Math.random) {
  const { ask, answer: show } = MODES[mode];
  const taken = new Set([core(answer[show])]);
  const askKey = core(answer[ask]);
  const kind = kindOf(answer);
  const tiers = [pool.filter((w) => kindOf(w) === kind), pool.filter((w) => kindOf(w) !== kind),
    all.filter((w) => kindOf(w) === kind), all.filter((w) => kindOf(w) !== kind)];
  const picked = [];
  for (const tier of tiers) {
    for (const w of shuffle(tier, rnd)) {
      if (picked.length >= n - 1) break;
      const k = core(w[show]);
      if (w.id === answer.id || taken.has(k) || core(w[ask]) === askKey) continue;
      taken.add(k);
      picked.push(w);
    }
  }
  return shuffle([answer, ...picked], rnd);
}

// ---------------------------------------------------------------------------
// Coming back over days: a word you got right comes back after a few days, longer each time
// ---------------------------------------------------------------------------
export const INTERVAL_DAYS = [0, 1, 2, 4, 7, 14];       // by box, in calendar days

export function isDue(rec, now = Date.now()) {
  if (!rec || !rec.t) return true;
  const b = Math.max(0, Math.min(MAX_BOX, rec.b || 0));
  return localDay(new Date(now)) >= addDays(localDay(new Date(rec.t)), INTERVAL_DAYS[b]);
}

/** Seen before and due again today (new words don't count) */
export const isReview = (rec, now = Date.now()) => Boolean(rec) && (rec.r || 0) + (rec.a || 0) + (rec.w || 0) > 0 && isDue(rec, now);

// ---------------------------------------------------------------------------
// Word forms: nouns (en kock | kocken | kockar | kockarna), verbs (tala | talar | talade | talat | tala!),
// adjectives (stor | stort | stora). "-" means there's no such form.
// ---------------------------------------------------------------------------
export const FORM_LABELS = {
  noun: [["obestämd form", "a …"], ["bestämd form", "the …"], ["plural", "more than one"], ["bestämd plural", "the … (plural)"]],
  verb: [["infinitiv", "to …"], ["presens", "now"], ["preteritum", "past"], ["supinum", "har …"], ["imperativ", "command!"]],
  adj: [["en-form", "en-word"], ["ett-form", "ett-word"], ["plural", "plural"]],
};
const ARTICLE_RX = /^\(?(en|ett)\)?\s+(.+)$/i;

export function formKind(w) {
  const f = w?.forms;
  if (!Array.isArray(f)) return null;
  if (f.length === 4 && ARTICLE_RX.test(f[0])) return "noun";
  if (f.length === 5) return "verb";
  if (f.length === 3) return "adj";
  return null;
}

/** Each Böj ordet drill: its question ids ("<word id>#f") and the words it asks */
export const FORM_DRILLS = { all: "f", bestamd: "b", plural: "p", verb: "v" };

const FORM_TIPS = {
  noun: [null,
    "The …: en-words take -en or -n (en kock → kocken, en flicka → flickan), ett-words -et or -t (ett hus → huset, ett äpple → äpplet).",
    "Plural: -or (flicka → flickor), -ar (kock → kockar), -er (park → parker), -n (äpple → äpplen), or no ending (hus → hus).",
    "The … in the plural: kockar → kockarna, parker → parkerna, äpplen → äpplena, hus → husen."],
  verb: ["Infinitive from the present: talar → tala, köper → köpa, bor → bo.", null, null, null,
    "Imperative: the present without -r (talar → tala!, bor → bo!) or without -er (köper → köp!)."],
};
const SINGULAR = ["singular", "en / ett …"];
const SINGULAR_TIP = "Singular: one, with en or ett (kockar → en kock, äpplen → ett äpple, hus → ett hus).";

/**
 * A Böj ordet question: one word, one form asked.
 * drill "all": any form (verbs sometimes give the present and ask the infinitive);
 * "bestamd": nouns, the … (with opts.plural also the plural and the … plural), given "en kock";
 * "plural": nouns, singular → plural (en kock → kockar) or plural → singular (kockar → en kock);
 * "verb": verbs, the infinitive and the imperative, given the present.
 */
export function formQuestion(w, rnd = Math.random, drill = "all", opts = {}) {
  const kind = formKind(w);
  if (!kind) return null;
  const f = w.forms;
  const ok = (t) => f[t] && f[t] !== "-";
  let targets;
  if (drill === "bestamd") {
    if (kind !== "noun") return null;
    targets = (opts.plural ? [1, 2, 3] : [1]).filter(ok);
  } else if (drill === "plural") {
    if (kind !== "noun" || !ok(0) || !ok(2)) return null;
    targets = [2, 0];
  } else if (drill === "verb") {
    if (kind !== "verb") return null;
    targets = (ok(1) ? [0, 4] : [4]).filter(ok);
  } else {
    targets = (kind === "verb" ? [0, 1, 2, 3, 4] : kind === "noun" ? [1, 2, 3] : [1, 2]).filter(ok);
    if (kind === "verb" && !ok(1)) targets.splice(targets.indexOf(0), 1);
  }
  if (!targets.length) return null;
  const t = targets[Math.floor(rnd() * targets.length)];
  const toSingular = drill === "plural" && t === 0;
  const given = toSingular ? 2 : kind === "verb" && (t === 0 || (drill === "verb" && ok(1))) ? 1 : 0;
  const [label, hint] = toSingular ? SINGULAR : FORM_LABELS[kind][t];
  const tip = drill === "all" ? "" : toSingular ? SINGULAR_TIP : FORM_TIPS[kind]?.[t] || "";
  // "form", not "kind": a question with a kind is an Övning (fyll / välj / ordna)
  return { id: `${w.id}#${FORM_DRILLS[drill] || "f"}`, word: w.id, sv: f[t], el: w.el, prompt: f[given], label, hint, form: kind,
    fb: `${splitNote(f[given]).main} → ${f[t]}`, ...(tip ? { tip } : {}) };
}

/** En or ett: from "ett hus", "(ett) kaffe" */
export function genderOf(w) {
  const m = ARTICLE_RX.exec(String(w?.forms?.[0] || w?.sv || "").split("/")[0].trim());
  if (!m) return null;
  const noun = splitNote(m[2]).main;
  return noun ? { article: m[1].toLowerCase(), noun } : null;
}

export function genderQuestion(w) {
  const g = genderOf(w);
  return g ? { id: `${w.id}#g`, word: w.id, sv: `${g.article} ${g.noun}`, el: w.el, prompt: g.noun, article: g.article } : null;
}

/** What counts when typing a word: verbs also by their present form (μιλάω is "talar" as much as "tala") */
export function typingAnswer(w) {
  return formKind(w) === "verb" && w.forms[1] !== "-" ? `${w.sv} / ${w.forms[1]}` : w.sv;
}

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Days in a row with practice, up to today (or yesterday, if today's isn't done yet) */
export function streak(days, today) {
  const set = new Set(days || []);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// ---------------------------------------------------------------------------
// Example words, to try the app before the first real list
// ---------------------------------------------------------------------------
export const EXAMPLE = `Exempel
hej = γεια
tack = ευχαριστώ
ja = ναι
nej = όχι
god morgon = καλημέρα
hejdå = αντίο
förlåt = συγγνώμη
en hund = ένας σκύλος
en katt = μια γάτα
ett hus = ένα σπίτι
en bil = ένα αυτοκίνητο
ett äpple = ένα μήλο
vatten = νερό
kaffe = καφές
äta (äter, åt, ätit) = τρώω
dricka (dricker, drack, druckit) = πίνω
stor = μεγάλος
liten = μικρός
idag / i dag = σήμερα
imorgon / i morgon = αύριο`;
