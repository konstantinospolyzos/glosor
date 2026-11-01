// Glosor: the word logic. Reading pasted word lists, checking typed answers, choosing the words for a
// round and the wrong options for the pick-one exercises. No page code here, so the tests run it in Node.

export const APP_NAME = "Glosor";
export const APP_VERSION = "1.0";

/** The three exercises. ask: the side you see; answer: the side you give. */
export const MODES = {
  "sv-el": { key: "sv-el", title: "Svenska → Ελληνικά", text: "See the Swedish, pick the Greek", ask: "sv", answer: "el", type: false },
  "el-sv": { key: "el-sv", title: "Ελληνικά → Svenska", text: "See the Greek, pick the Swedish", ask: "el", answer: "sv", type: false },
  type: { key: "type", title: "Skriv på svenska", text: "See the Greek, type the Swedish", ask: "el", answer: "sv", type: true },
};

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

function pair(a, b) {
  a = clean(a); b = clean(b);
  if (!a || !b) return null;
  const ga = hasGreek(a), gb = hasGreek(b);
  if (ga === gb) return null;                   // one side Swedish, the other Greek
  return ga ? { sv: b, el: a } : { sv: a, el: b };
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
    const p = hash ? null : splitLine(line);
    if (p) {
      if (!cur) { cur = { name: null, words: [] }; chapters.push(cur); }
      if (!cur.words.some((w) => wordKey(w) === wordKey(p))) cur.words.push(p);
    } else if (hash || TITLE_RX.test(line) || (first && !hasGreek(line))) {
      const name = clean(line);
      if (cur && !cur.words.length) cur.name = name;          // two titles in a row: the last one names it
      else { cur = { name, words: [] }; chapters.push(cur); }
    } else {
      skipped.push({ line: raw.trim(), why: hasGreek(line) ? "Couldn't tell the Swedish from the Greek" : "No Greek word in this line" });
    }
    first = false;
  }
  return { chapters: chapters.filter((c) => c.words.length), skipped };
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
    const words = [];
    let dupes = 0;
    for (const w of pc.words) {
      if (have.has(wordKey(w))) { dupes++; continue; }
      have.add(wordKey(w));
      words.push({ id: uid("w"), sv: w.sv, el: w.el });
    }
    if (planned) { planned.words.push(...words); planned.dupes += dupes; return; }
    out.push({ id: target ? target.id : uid("c"), name: target ? target.name : name, target, words, dupes });
  });
  return out;
}

/** The chapter as text: what Share sends and Edit shows (the same format the paste reads) */
export function chapterText(ch, withTitle = true) {
  return [withTitle ? ch.name : null, ...ch.words.map((w) => `${w.sv} = ${w.el}`)].filter(Boolean).join("\n");
}

/** Edited text -> the chapter's words, keeping each word's id (and so its progress) when it's still there */
export function applyEdit(chapter, text) {
  const { chapters, skipped } = parseWordList(text);
  const parsed = chapters.flatMap((c) => c.words);
  const byKey = new Map(), bySv = new Map(), byEl = new Map();
  for (const w of chapter.words) {
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
    words.push({ id, sv: p.sv, el: p.el });
  }
  return { words, skipped };
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
 * Right: the word (with or without its en/ett/att). Almost: the wrong en/ett, a missing å/ä/ö,
 * or one small typo (two in long words).
 */
export function checkTyped(typed, expected) {
  const t = core(typed);
  if (!t) return { result: "wrong", why: "" };
  let best = { result: "wrong", why: "" };
  for (const alt of alternatives(expected)) {
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
  const weight = (w) => (MAX_BOX + 1 - Math.max(0, Math.min(MAX_BOX, records?.[w.id]?.b ?? 0))) ** 2;
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
