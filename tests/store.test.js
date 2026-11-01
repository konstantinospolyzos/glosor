// Syncing with Google Drive (js/store.js), with a stand-in for Drive.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { store } from "../js/store.js";
import { applyOp, emptyData } from "../js/data.js";

Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true });

const DAY = 86400000;
const addOp = (id, name, words) => ({ type: "addWords", chapters: [{ id, name, created: "2026-11-01", words }] });
const base = applyOp(emptyData(), addOp("c1", "Kapitel 1", [{ id: "w1", sv: "hej", el: "γεια" }]));

/** A pretend Drive holding one data file */
function fakeDrive(file) {
  const drive = {
    file, uploads: [], created: [], removed: [], backupsList: [],
    tokenValid: () => true,
    setHint() {},
    async about() { return { user: { emailAddress: "k@example.com", displayName: "Konstantinos Polyzos" } }; },
    async getMeta(id) { return drive.file && id === drive.file.id ? { id, version: drive.file.version } : null; },
    async find() { return drive.file ? { id: drive.file.id, version: drive.file.version } : null; },
    async download() { return structuredClone(drive.file.data); },
    async upload(id, data) {
      drive.uploads.push(data);
      drive.file = { id, version: String(Number(drive.file.version) + 1), data: structuredClone(data) };
      return { id, version: drive.file.version };
    },
    async create(data, opts = {}) {
      drive.created.push({ data, ...opts });
      if (opts.kind === "backup") { drive.backupsList.unshift({ id: `b${drive.created.length}`, createdTime: new Date().toISOString() }); return {}; }
      drive.file = { id: "f-new", version: "1", data: structuredClone(data) };
      return { id: "f-new", version: "1" };
    },
    async backups() { return [...drive.backupsList]; },
    async remove(id) { drive.removed.push(id); },
  };
  return drive;
}

beforeEach(() => {
  store.meta = { mode: "drive", fileId: "f1", version: "1", link: null, pending: [], lastSync: null, email: "k@example.com", lastBackup: Date.now() };
  store._syncing = false;
  store._again = false;
  store.persist = () => {};
  store.syncSoon = () => {};
});

test("the other phone changed the file: both changes end up in Drive", async () => {
  // the other phone added Kapitel 2 and practised
  const theirs = [addOp("c2", "Kapitel 2", [{ id: "w2", sv: "tack", el: "ευχαριστώ" }]),
    { type: "answers", person: "p2", mode: "sv-el", at: 5, day: "2026-11-01", items: [{ id: "w1", res: "right" }] }].reduce(applyOp, base);
  const drive = fakeDrive({ id: "f1", version: "2", data: theirs });
  store.drive = drive;
  // this phone, still on version 1, practised and fixed a word
  const mine = [{ type: "answers", person: "p1", mode: "type", at: 6, day: "2026-11-01", items: [{ id: "w1", res: "right" }] }];
  store.base = base;
  store.data = mine.reduce(applyOp, base);
  store.meta.pending = [...mine];
  await store.sync();
  assert.equal(drive.uploads.length, 1);
  const saved = drive.uploads[0];
  assert.deepEqual(saved.chapters.map((c) => c.name), ["Kapitel 1", "Kapitel 2"]);
  assert.equal(saved.progress.p1.words.w1.b, 2);
  assert.equal(saved.progress.p2.words.w1.b, 1);
  assert.deepEqual(store.meta.pending, []);
  assert.equal(store.meta.version, "3");
  assert.deepEqual(store.data, saved);
});

test("nothing new here: Drive's copy is taken, nothing uploaded", async () => {
  const theirs = applyOp(base, addOp("c2", "Kapitel 2", [{ id: "w2", sv: "tack", el: "ευχαριστώ" }]));
  const drive = fakeDrive({ id: "f1", version: "2", data: theirs });
  store.drive = drive;
  store.base = base;
  store.data = base;
  await store.sync();
  assert.equal(drive.uploads.length, 0);
  assert.equal(store.data.chapters.length, 2);
});

test("first time with Drive: no file yet, this phone's words become the file", async () => {
  const drive = fakeDrive(null);
  store.drive = drive;
  store.meta = { ...store.meta, fileId: null, version: null, adopting: true, email: null };
  store.base = null;
  store.data = base;
  await store.sync();
  assert.equal(drive.created.length, 1);
  assert.equal(drive.created[0].data.chapters[0].name, "Kapitel 1");
  assert.equal(store.meta.fileId, "f-new");
  assert.equal(store.meta.name, "Konstantinos Polyzos");
});

test("first time with Drive, both have words: the person chooses", async () => {
  const theirs = applyOp(emptyData(), addOp("c9", "Från Drive", [{ id: "w9", sv: "ja", el: "ναι" }]));
  const drive = fakeDrive({ id: "f1", version: "4", data: theirs });
  store.drive = drive;
  store.meta = { ...store.meta, fileId: null, version: null, adopting: true };
  store.data = base;
  store.chooser = async () => "drive";
  await store.sync();
  assert.equal(store.data.chapters[0].name, "Från Drive");
  assert.equal(drive.uploads.length, 0);
});

test("a weekly copy in Drive, the last eight kept", async () => {
  const drive = fakeDrive({ id: "f1", version: "1", data: base });
  drive.backupsList = Array.from({ length: 8 }, (_, i) => ({ id: `old${i}`, createdTime: new Date(Date.now() - (8 + i * 7) * DAY).toISOString() }));
  store.drive = drive;
  store.meta.lastBackup = null;
  store._backingUp = false;
  await store._backupIfDue(base);
  const copy = drive.created.find((c) => c.kind === "backup");
  assert.match(copy.name, /^glosor-backup-\d{4}-\d{2}-\d{2}\.json$/);
  assert.deepEqual(drive.removed, ["old7"]);
});
