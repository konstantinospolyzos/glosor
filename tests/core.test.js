// The word logic (js/core.js) and the data file (js/data.js). Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseWordList, splitLine, planAdd, applyEdit, chapterText, checkTyped, nextBox, level, summarize, pickRound,
  pickOptions, streak, alternatives, speakable, splitNote, distance, isMistake, EXAMPLE, kindOf,
} from "../js/core.js";
import { applyOp, emptyData, normalize } from "../js/data.js";

// a predictable "random": cycles through fixed values
const fakeRandom = (values = [0.1, 0.7, 0.3, 0.9, 0.5, 0.2, 0.8, 0.4, 0.6, 0.05]) => { let i = 0; return () => values[i++ % values.length]; };

// ---------------------------------------------------------------------------
// Reading word lists
// ---------------------------------------------------------------------------
test("one word a line, any of the usual separators", () => {
  const cases = [
    ["en hund = ένας σκύλος", "en hund", "ένας σκύλος"],
    ["en hund=ένας σκύλος", "en hund", "ένας σκύλος"],
    ["en hund – ένας σκύλος", "en hund", "ένας σκύλος"],
    ["en hund - ένας σκύλος", "en hund", "ένας σκύλος"],
    ["en hund\tένας σκύλος", "en hund", "ένας σκύλος"],
    ["en hund : ένας σκύλος", "en hund", "ένας σκύλος"],
    ["en hund → ένας σκύλος", "en hund", "ένας σκύλος"],
    ["en hund; ένας σκύλος", "en hund", "ένας σκύλος"],
    ["en hund ένας σκύλος", "en hund", "ένας σκύλος"],          // no separator: where the Greek starts
    ["ένας σκύλος = en hund", "en hund", "ένας σκύλος"],        // Greek first
    ["ένας σκύλος en hund", "en hund", "ένας σκύλος"],
  ];
  for (const [line, sv, el] of cases) assert.deepEqual(splitLine(line), { sv, el }, line);
});

test("a hyphen inside a word doesn't split it", () => {
  assert.deepEqual(splitLine("e-post = email"), null);                       // no Greek: not a word line
  assert.deepEqual(splitLine("e-post = ηλεκτρονικό ταχυδρομείο"), { sv: "e-post", el: "ηλεκτρονικό ταχυδρομείο" });
});

test("Greek question mark stays with the Greek", () => {
  assert.deepEqual(splitLine("Hur mår du? = Τι κάνεις;"), { sv: "Hur mår du?", el: "Τι κάνεις;" });
});

test("titles, bullets, numbers and lines it can't read", () => {
  const { chapters, skipped } = parseWordList(`
Kapitel 3 – Familj
1. en mamma = μια μαμά
2) en pappa – ένας μπαμπάς
• ett barn = ένα παιδί
- en bror = ένας αδελφός
en syster
----
# Kapitel 4
ett hus = ένα σπίτι
en hund = ένας σκύλος
en hund = ένας σκύλος
σκύλος γάτα
`);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].name, "Kapitel 3 – Familj");
  assert.deepEqual(chapters[0].words.map((w) => w.sv), ["en mamma", "en pappa", "ett barn", "en bror"]);
  assert.equal(chapters[1].name, "Kapitel 4");
  assert.equal(chapters[1].words.length, 2, "the same word twice counts once");
  assert.deepEqual(skipped.map((s) => s.line), ["en syster", "σκύλος γάτα"]);
  assert.equal(skipped[0].why, "No Greek word in this line");
});

test("a list without a title: one unnamed chapter", () => {
  const { chapters } = parseWordList("hej = γεια\ntack = ευχαριστώ");
  assert.equal(chapters.length, 1);
  assert.equal(chapters[0].name, null);
  assert.equal(chapters[0].words.length, 2);
});

test("two titles in a row: the last one names the chapter", () => {
  const { chapters } = parseWordList("Rivstart A1+A2\nKapitel 2\nhej = γεια");
  assert.equal(chapters[0].name, "Kapitel 2");
});

test("the example list reads completely", () => {
  const { chapters, skipped } = parseWordList(EXAMPLE);
  assert.equal(skipped.length, 0);
  assert.equal(chapters.length, 1);
  assert.equal(chapters[0].name, "Exempel");
  assert.equal(chapters[0].words.length, 20);
});

test("adding to a chapter with the same name only adds the new words", () => {
  const existing = [{ id: "c1", name: "Kapitel 1", words: [{ id: "w1", sv: "hej", el: "γεια" }] }];
  const parsed = parseWordList("kapitel 1\nhej = γεια\ntack = ευχαριστώ\nKapitel 2\nja = ναι").chapters;
  const plan = planAdd(existing, parsed, "Kapitel 3");
  assert.equal(plan.length, 2);
  assert.equal(plan[0].target.id, "c1");
  assert.equal(plan[0].id, "c1");
  assert.deepEqual(plan[0].words.map((w) => w.sv), ["tack"]);
  assert.equal(plan[0].dupes, 1);
  assert.equal(plan[1].target, null);
  assert.equal(plan[1].name, "Kapitel 2");
  // no title in the paste: the name from the form
  assert.equal(planAdd(existing, parseWordList("ja = ναι").chapters, "Kapitel 3")[0].name, "Kapitel 3");
});

test("editing keeps the progress of words that are still there", () => {
  const ch = { id: "c1", name: "K", words: [
    { id: "w1", sv: "hej", el: "γεια" }, { id: "w2", sv: "tack", el: "ευχαριστο" }, { id: "w3", sv: "nej", el: "όχι" }] };
  const text = chapterText(ch, false).replace("ευχαριστο", "ευχαριστώ").replace("nej = όχι\n", "").replace("nej = όχι", "") + "\nja = ναι";
  const { words } = applyEdit(ch, text);
  assert.deepEqual(words.map((w) => w.sv), ["hej", "tack", "ja"]);
  assert.equal(words[0].id, "w1");
  assert.equal(words[1].id, "w2", "corrected Greek, same word");
  assert.notEqual(words[2].id, "w3");
});

// ---------------------------------------------------------------------------
// Typed answers
// ---------------------------------------------------------------------------
test("right answers", () => {
  assert.equal(checkTyped("en hund", "en hund").result, "right");
  assert.equal(checkTyped("  En Hund ", "en hund").result, "right");
  assert.equal(checkTyped("hund", "en hund").result, "right");
  assert.match(checkTyped("hund", "en hund").why, /en hund/);
  assert.equal(checkTyped("att äta", "äta (äter, åt, ätit)").result, "right");
  assert.equal(checkTyped("äta", "att äta").result, "right");
  assert.equal(checkTyped("i dag", "idag / i dag").result, "right");
  assert.equal(checkTyped("hur mår du", "Hur mår du?").result, "right");
});

test("almost: wrong en/ett, missing å ä ö, a small typo", () => {
  const art = checkTyped("ett hund", "en hund");
  assert.equal(art.result, "almost");
  assert.match(art.why, /en hund/);
  assert.equal(checkTyped("hejda", "hejdå").result, "almost");
  assert.equal(checkTyped("hejda", "hejdå").why, "Check å, ä and ö");
  assert.equal(checkTyped("en hnud", "en hund").result, "almost");              // two letters swapped
  assert.equal(checkTyped("frukost", "frukosten").result, "almost");            // long word: two letters off
});

test("wrong answers", () => {
  assert.equal(checkTyped("", "en hund").result, "wrong");
  assert.equal(checkTyped("en katt", "en hund").result, "wrong");
  assert.equal(checkTyped("ja", "nu").result, "wrong");                         // short words: no typo allowance
  assert.equal(checkTyped("bil", "bok").result, "wrong");
});

test("distance counts a swap as one", () => {
  assert.equal(distance("hund", "hnud"), 1);
  assert.equal(distance("kitten", "sitting"), 3);
  assert.equal(distance("", "abc"), 3);
});

test("notes and alternatives", () => {
  assert.deepEqual(alternatives("säga (säger / sa / sagt) / prata"), ["säga", "prata"]);
  assert.equal(speakable("äta (äter, åt, ätit)"), "äta");
  assert.deepEqual(splitNote("äta (äter, åt, ätit)"), { main: "äta", note: "(äter, åt, ätit)" });
  assert.equal(kindOf({ sv: "ett hus" }), "noun");
  assert.equal(kindOf({ sv: "att bo" }), "verb");
  assert.equal(kindOf({ sv: "stor" }), "other");
});

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------
test("how a word moves", () => {
  assert.equal(nextBox(0, "right", "sv-el"), 1);
  assert.equal(nextBox(0, "right", "type"), 2);
  assert.equal(nextBox(0, "almost", "type"), 1);
  assert.equal(nextBox(4, "right", "type"), 5);
  assert.equal(nextBox(5, "right", "el-sv"), 5);
  assert.equal(nextBox(4, "wrong", "sv-el"), 0);
  assert.equal(nextBox(undefined, "right", "sv-el"), 1);
});

test("levels and the chapter summary", () => {
  assert.equal(level(undefined), "new");
  assert.equal(level({ b: 0, r: 0, a: 0, w: 1 }), "weak");
  assert.equal(level({ b: 3, r: 3, a: 0, w: 0 }), "learning");
  assert.equal(level({ b: 1, r: 1, a: 0, w: 0 }), "learning", "right once: learning, not missed");
  assert.equal(level({ b: 4, r: 2, a: 0, w: 0 }), "known");
  assert.equal(isMistake({ b: 0, w: 1 }), true);
  assert.equal(isMistake({ b: 1, w: 1 }), false);
  const words = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const s = summarize(words, { a: { b: 5, r: 3 }, b: { b: 2, r: 2 }, c: { b: 0, w: 1 } });
  assert.deepEqual(s, { total: 4, new: 1, weak: 1, learning: 1, known: 1, pct: 35 });   // (5+2+0+0)/20
});

test("a round: all words when it's that long, otherwise the weak ones more often", () => {
  const words = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}` }));
  assert.equal(pickRound(words, {}, 20).length, 10);
  assert.equal(new Set(pickRound(words, {}, 0).map((w) => w.id)).size, 10);
  // nine words known perfectly, one new: over many rounds of 1, the new one comes up about 36/45 of the time
  const recs = Object.fromEntries(words.slice(1).map((w) => [w.id, { b: 5, r: 5 }]));
  let hits = 0;
  for (let i = 0; i < 2000; i++) if (pickRound(words, recs, 1)[0].id === "w0") hits++;
  assert.ok(hits > 1450 && hits < 1750, `new word picked ${hits} of 2000`);
  // no word twice in a round
  const r = pickRound(words, recs, 5, fakeRandom());
  assert.equal(new Set(r.map((w) => w.id)).size, 5);
});

test("options: five different ones, the same kind first, never a second right answer", () => {
  const pool = [
    { id: "1", sv: "en hund", el: "ένας σκύλος" }, { id: "2", sv: "en katt", el: "μια γάτα" },
    { id: "3", sv: "ett hus", el: "ένα σπίτι" }, { id: "4", sv: "en bil", el: "ένα αυτοκίνητο" },
    { id: "5", sv: "ett barn", el: "ένα παιδί" }, { id: "6", sv: "stor", el: "μεγάλος" },
    { id: "7", sv: "bra", el: "καλά" }, { id: "8", sv: "fint", el: "καλά" }, { id: "9", sv: "en vovve", el: "ένας σκύλος" },
  ];
  const opts = pickOptions(pool[0], pool, pool, "sv-el", 5, fakeRandom());
  assert.equal(opts.length, 5);
  assert.ok(opts.includes(pool[0]));
  assert.equal(new Set(opts.map((w) => w.el)).size, 5, "no Greek twice");
  assert.ok(!opts.some((w) => w.id === "9"), "en vovve has the same Greek: it would be right too");
  assert.ok(opts.every((w) => /^(en|ett) /.test(w.sv)), "only en/ett words while there are enough");
  // Greek -> Swedish: "fint" also means καλά, so it can't be offered for "bra"
  for (let i = 0; i < 50; i++) assert.ok(!pickOptions(pool[6], pool, pool, "el-sv").some((w) => w.id === "8"));
  // too few words in the chosen chapter: the others fill in
  assert.equal(pickOptions(pool[0], [pool[0], pool[1]], pool, "el-sv").length, 5);
  // only two words at all: two options
  assert.equal(pickOptions(pool[0], [pool[0], pool[1]], [pool[0], pool[1]], "sv-el").length, 2);
});

test("days in a row", () => {
  assert.equal(streak([], "2026-11-01"), 0);
  assert.equal(streak(["2026-10-30", "2026-10-31", "2026-11-01"], "2026-11-01"), 3);
  assert.equal(streak(["2026-10-30", "2026-10-31"], "2026-11-01"), 2, "today not done yet");
  assert.equal(streak(["2026-10-29", "2026-10-31"], "2026-11-01"), 1);
  assert.equal(streak(["2026-02-28", "2026-03-01"], "2026-03-01"), 2);
});

// ---------------------------------------------------------------------------
// The data file
// ---------------------------------------------------------------------------
const addOp = (name, words, id = "c-new") => ({ type: "addWords", chapters: [{ id, name, created: "2026-11-01", words }] });

test("adding, editing and deleting chapters", () => {
  let d = emptyData();
  d = applyOp(d, addOp("Kapitel 1", [{ id: "w1", sv: "hej", el: "γεια" }], "c1"));
  d = applyOp(d, addOp("kapitel 1", [{ id: "w1b", sv: "hej", el: "γεια" }, { id: "w2", sv: "tack", el: "ευχαριστώ" }], "c-other"));
  assert.equal(d.chapters.length, 1, "same name: added to it");
  assert.deepEqual(d.chapters[0].words.map((w) => w.id), ["w1", "w2"]);
  d = applyOp(d, { type: "putChapter", chapter: { ...d.chapters[0], name: "Kapitel 1 – Hej", words: [d.chapters[0].words[1]] } });
  assert.equal(d.chapters[0].name, "Kapitel 1 – Hej");
  assert.equal(d.chapters[0].words.length, 1);
  d = applyOp(d, { type: "deleteChapter", id: "c1" });
  assert.equal(d.chapters.length, 0);
});

test("a round's answers move the words and count the day", () => {
  let d = emptyData();
  const op = { type: "answers", person: "p1", mode: "type", at: 1000, day: "2026-11-01",
    items: [{ id: "w1", res: "right" }, { id: "w2", res: "almost" }, { id: "w3", res: "wrong" }] };
  d = applyOp(d, op);
  const p = d.progress.p1;
  assert.deepEqual(p.words.w1, { b: 2, r: 1, a: 0, w: 0, t: 1000 });
  assert.deepEqual(p.words.w2, { b: 1, r: 0, a: 1, w: 0, t: 1000 });
  assert.deepEqual(p.words.w3, { b: 0, r: 0, a: 0, w: 1, t: 1000 });
  assert.deepEqual(p.days, ["2026-11-01"]);
  assert.deepEqual(p.rounds, [{ at: 1000, mode: "type", n: 3, right: 1, almost: 1 }]);
  d = applyOp(d, { ...op, at: 2000 });
  assert.equal(d.progress.p1.words.w1.b, 4);
  assert.deepEqual(d.progress.p1.days, ["2026-11-01"], "the same day once");
  d = applyOp(d, { type: "resetProgress", person: "p1" });
  assert.equal(d.progress.p1, undefined);
});

test("two phones practising at the same time: both rounds count", () => {
  const base = applyOp(emptyData(), addOp("K", [{ id: "w1", sv: "hej", el: "γεια" }], "c1"));
  const phoneA = { type: "answers", person: "p1", mode: "sv-el", at: 1, day: "2026-11-01", items: [{ id: "w1", res: "right" }] };
  const phoneB = { type: "answers", person: "p2", mode: "type", at: 2, day: "2026-11-01", items: [{ id: "w1", res: "right" }] };
  const merged = [phoneA, phoneB].reduce(applyOp, base);
  assert.equal(merged.progress.p1.words.w1.b, 1);
  assert.equal(merged.progress.p2.words.w1.b, 2);
});

test("people", () => {
  let d = applyOp(emptyData(), { type: "putPerson", person: { id: "p1", name: "Konstantinos" } });
  d = applyOp(d, { type: "putPerson", person: { id: "p2", name: "Maria" } });
  assert.deepEqual(d.people.map((p) => p.name), ["Konstantinos", "Maria"]);
  d = applyOp(d, { type: "deletePerson", id: "p1" });
  d = applyOp(d, { type: "deletePerson", id: "p2" });
  assert.equal(d.people.length, 1, "there's always someone");
});

test("a damaged file is tidied, a wrong one refused", () => {
  assert.throws(() => normalize({ entries: [] }), /Glosor/);
  const d = normalize({ chapters: [
    { id: "c1", name: "  K  ", words: [{ id: "w1", sv: "hej", el: "γεια" }, { id: "w1", sv: "tack", el: "ευχαριστώ" }, { sv: "", el: "x" }] },
    { id: "c1", name: "", words: "nope" }],
  progress: { p1: { words: { w1: { b: 9, r: "2" } }, days: ["2026-11-01", "bad", "2026-11-01"] } } });
  assert.equal(d.chapters.length, 2);
  assert.notEqual(d.chapters[1].id, "c1");
  assert.equal(d.chapters[0].name, "K");
  assert.equal(d.chapters[0].words.length, 2);
  assert.notEqual(d.chapters[0].words[1].id, "w1", "ids are unique");
  assert.equal(d.chapters[1].name, "Untitled");
  assert.deepEqual(d.people, [{ id: "p1", name: "Me" }]);
  assert.deepEqual(d.progress.p1.words.w1, { b: 5, r: 2, a: 0, w: 0, t: 0 });
  assert.deepEqual(d.progress.p1.days, ["2026-11-01"]);
});
