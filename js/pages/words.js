// Words: the chapters, a search over every word, adding a list, editing and sharing a chapter.
import { h, icon, sheet, alertBox, toast, caption, footer, group, shareText, pickFile, segmented } from "../ui.js";
import { store } from "../store.js";
import { allWords } from "../data.js";
import { parseWordList, planAdd, chapterText, applyEdit, matchWords, sameName, summarize, level, core, fold, EXAMPLE } from "../core.js";
import { currentRecords, levelBar, dot, wordText, speakButton, setSelection, plural, LEVELS } from "./common.js";
import { speak } from "../speech.js";

let query = "";
const searchKey = (s) => fold(core(s));

export function renderWords(ctx) {
  const data = store.data;
  const records = currentRecords();
  const words = allWords(data);
  if (!data.chapters.length) return ["Your word lists", emptyWords(ctx)];
  const subtitle = `${plural(data.chapters.length, "chapter")} · ${plural(words.length, "word")}`;

  const search = h("input", { class: "search-input", type: "search", placeholder: "Search Swedish or Greek", value: query,
    autocomplete: "off", autocorrect: "off", autocapitalize: "none", spellcheck: "false", enterkeyhint: "search", "aria-label": "Search the words" });
  const results = h("div", { class: "results" });
  const list = h("div", { class: "chapter-list" }, data.chapters.map((c) => chapterCard(ctx, c, records)));
  const addBtn = h("button", { type: "button", class: "btn tinted wide", onclick: () => openAddWords(ctx) }, icon("plus", 19), "Add words");
  const update = () => {
    query = search.value;
    const q = searchKey(query);
    list.hidden = addBtn.hidden = Boolean(q);
    if (!q) { results.replaceChildren(); return; }
    const hits = [];
    for (const c of data.chapters) for (const w of c.words) {
      if (searchKey(w.sv).includes(q) || searchKey(w.el).includes(q)) hits.push([w, c]);
    }
    results.replaceChildren(hits.length
      ? h("div", { class: "group" }, hits.slice(0, 80).map(([w, c]) => wordRow(w, records, c.name)))
      : h("div", { class: "empty-small" }, `No word with “${query.trim()}”`));
  };
  search.addEventListener("input", update);
  search.addEventListener("keydown", (ev) => { if (ev.key === "Enter") search.blur(); });
  update();
  return [subtitle, h("div", { class: "search-wrap" }, icon("search", 17, "search-icon"), search), results, list, addBtn];
}

function chapterCard(ctx, c, records) {
  const s = summarize(c.words, records);
  return h("button", { type: "button", class: "card chapter-card", onclick: () => openChapter(ctx, c.id) },
    h("div", { class: "chapter-head" },
      h("div", { class: "chapter-name" }, c.name),
      h("div", { class: "chapter-pct" }, `${s.pct}%`),
      icon("chevron", 15, "chev")),
    h("div", { class: "chapter-sub" }, `${plural(s.total, "word")}${s.known ? ` · ${s.known} known` : ""}${s.weak ? ` · ${s.weak} missed` : ""}`),
    levelBar(s, 6));
}

function wordRow(w, records, chapterName = "") {
  return h("button", { type: "button", class: "word-row", onclick: () => speak(w.sv) },
    dot(level(records[w.id])),
    h("span", { class: "word-texts" },
      wordText(w.sv, "word-sv"),
      w.forms ? h("span", { class: "word-forms" }, w.forms.slice(1).filter((f) => f !== "-").join(" · ")) : null,
      h("span", { class: "word-el" }, w.el, chapterName ? h("span", { class: "word-chapter" }, ` · ${chapterName}`) : null)),
    speakButton(w.sv, 18, "row-speaker"));
}

function emptyWords(ctx) {
  return h("div", { class: "card empty-state" },
    icon("book", 44, "empty-icon"),
    h("div", { class: "empty-title" }, "No words yet"),
    h("div", { class: "empty-text" }, "Add the word list from your Swedish class: one word a line, Swedish = Greek. Each list becomes a chapter you can practise."),
    h("button", { type: "button", class: "btn primary", onclick: () => openAddWords(ctx) }, icon("plus", 19), "Add words"),
    h("button", { type: "button", class: "btn plain", onclick: () => addExample(ctx) }, icon("sparkle", 18), "Try it with 20 example words"));
}

export function addExample(ctx) {
  const plan = planAdd(store.data.chapters, parseWordList(EXAMPLE).chapters, "Exempel").filter((p) => p.words.length);
  if (!plan.length) { toast("The example words are already there"); return; }
  store.addChapters(plan);
  setSelection([plan[0].id]);
  toast("✓  20 example words added");
  ctx.go("practise");
}

// ---------------------------------------------------------------------------
// One chapter
// ---------------------------------------------------------------------------
export function openChapter(ctx, id) {
  const body = h("div", { class: "form" });
  let sh = null;
  function build() {
    const ch = store.data.chapters.find((c) => c.id === id);
    if (!ch) { sh?.close(); return; }
    sh?.setTitle(ch.name);
    const records = currentRecords();
    const s = summarize(ch.words, records);
    const legend = ["known", "learning", "weak", "new"].filter((k) => s[k]).map((k) =>
      h("span", { class: "legend-item" }, dot(k), `${s[k]} ${LEVELS[k][0].toLowerCase()}`));
    body.replaceChildren(
      h("div", { class: "card chapter-summary" },
        h("div", { class: "summary-top" }, h("div", { class: "summary-big" }, plural(s.total, "word")), h("div", { class: "chapter-pct" }, `${s.pct}%`)),
        levelBar(s, 8),
        h("div", { class: "legend" }, legend)),
      h("div", { class: "button-row" },
        h("button", { type: "button", class: "btn primary", onclick: () => { setSelection([ch.id]); sh.close(); ctx.go("practise"); } }, icon("cards", 19), "Practise"),
        h("button", { type: "button", class: "btn tinted", onclick: () => shareChapter(ch) }, icon("share", 19), "Share")),
      caption("Words · tap one to hear it"),
      h("div", { class: "group" }, ch.words.map((w) => wordRow(w, records))),
      h("button", { type: "button", class: "btn destructive-row", onclick: () => removeChapter(ch, sh) }, "Delete chapter"));
  }
  build();
  const off = store.on((kind) => { if (kind === "data") build(); });
  sh = sheet({ title: store.data.chapters.find((c) => c.id === id)?.name || "Chapter", body, onClose: off,
    left: { text: "Close" }, right: { text: "Edit", onClick: () => openEditChapter(id) } });
}

async function shareChapter(ch) {
  const how = await shareText(chapterText(ch), ch.name);
  if (how === "copied") toast("✓  Copied: paste it in a message");
  else if (how === "failed") alertBox({ title: "Couldn't share", message: "Open the chapter's Edit page and copy the words from there." });
}

async function removeChapter(ch, sh) {
  const ok = await alertBox({ title: `Delete “${ch.name}”?`, message: `Its ${plural(ch.words.length, "word")} and your progress on them go away.`,
    buttons: [{ text: "Cancel", value: false, style: "cancel" }, { text: "Delete", value: true, style: "destructive" }] });
  if (!ok) return;
  store.deleteChapter(ch.id);
  sh.close();
  toast(`Deleted ${ch.name}`);
}

function openEditChapter(id) {
  const ch = store.data.chapters.find((c) => c.id === id);
  if (!ch) return;
  const name = h("input", { class: "form-input left", type: "text", value: ch.name, autocomplete: "off", "aria-label": "Chapter name" });
  const text = h("textarea", { class: "words-input", rows: "14", autocomplete: "off", autocorrect: "off", autocapitalize: "none", spellcheck: "false",
    "aria-label": "Words, one a line" });
  text.value = chapterText(ch, false);
  const note = footer("");
  const check = () => {
    const { words, skipped } = applyEdit(ch, text.value);
    note.textContent = `${plural(words.length, "word")}${skipped.length ? ` · ${plural(skipped.length, "line")} can't be read: “${skipped[0].line}”` : ""}`;
    return { words, skipped };
  };
  text.addEventListener("input", check);
  check();
  const body = h("div", { class: "form" },
    caption("Name"), group(h("label", { class: "form-row" }, name)),
    caption("Words"), group(h("div", { class: "text-wrap" }, text)), note,
    footer("One word a line: Swedish = Greek. Fix a spelling and the word keeps its progress."));
  sheet({ title: "Edit chapter", body, left: { text: "Cancel" }, right: { text: "Save", bold: true, onClick: async (api) => {
    const { words, skipped } = check();
    if (!words.length) { alertBox({ title: "No words left", message: "A chapter needs at least one word. To remove it, use Delete chapter." }); return; }
    if (skipped.length) {
      const ok = await alertBox({ title: `Leave out ${plural(skipped.length, "line")}?`,
        message: skipped.slice(0, 3).map((s) => `“${s.line}”: ${s.why}`).join("\n"),
        buttons: [{ text: "Fix it", value: false, style: "cancel" }, { text: "Leave out", value: true, style: "bold" }] });
      if (!ok) return;
    }
    store.saveChapter({ ...ch, name: name.value.trim() || ch.name, words });
    api.close();
    toast("✓  Saved");
  } } });
}

// ---------------------------------------------------------------------------
// Adding words
// ---------------------------------------------------------------------------
export function openAddWords(ctx, prefill = "") {
  const nextName = () => `Kapitel ${store.data.chapters.length + 1}`;
  const text = h("textarea", { class: "words-input", rows: "11", autocomplete: "off", autocorrect: "off", autocapitalize: "none", spellcheck: "false",
    placeholder: "Kapitel 3\nen hund = ένας σκύλος\nhejdå = αντίο\näta (äter, åt, ätit) = τρώω", "aria-label": "The word list" });
  text.value = prefill;
  const name = h("input", { class: "form-input", type: "text", value: nextName(), autocomplete: "off", "aria-label": "Chapter name" });
  const nameRow = group(h("label", { class: "form-row" }, h("span", { class: "form-label" }, "Chapter"), name));
  const preview = h("div", { class: "preview" });
  let plan = [], replacements = [], replace = null;     // replace: null until chosen (then it follows the paste)
  let sh = null;
  // a chapter you already have: add only its new words, or replace it (an updated list, word forms added...)
  const modeSlot = h("div", { class: "mode-slot" });

  const update = () => {
    const { chapters, skipped } = parseWordList(text.value);
    nameRow.hidden = !chapters.some((c) => !c.name);
    const defaultName = name.value.trim() || nextName();
    plan = planAdd(store.data.chapters, chapters, defaultName);
    const named = (pc, i) => pc.name || (i === 0 ? defaultName : `${defaultName} (${i + 1})`);
    replacements = plan.filter((p) => p.target).map((p) => {
      const words = matchWords(p.target.words, chapters.filter((pc, i) => sameName(named(pc, i), p.name)).flatMap((pc) => pc.words));
      const kept = words.filter((w) => p.target.words.some((o) => o.id === w.id)).length;
      const forms = words.some((w) => w.forms && !p.target.words.find((o) => o.id === w.id)?.forms);
      return { target: p.target, words, kept, removed: p.target.words.length - kept, forms };
    });
    const replacing = replacements.length && (replace ?? replacements.some((r) => r.forms));
    modeSlot.replaceChildren(...(replacements.length ? [segmented(["Add new words", "Replace chapter"], replacing ? 1 : 0, (i) => { replace = i === 1; update(); }, "full"),
      h("div", { class: "mode-note" }, replacing
        ? "The chapter becomes exactly this list. Words still in it keep their progress."
        : "Only words the chapter doesn't have yet are added.")] : []));
    const total = replacing
      ? replacements.reduce((a, r) => a + r.words.length, 0) + plan.filter((p) => !p.target).reduce((a, p) => a + p.words.length, 0)
      : plan.reduce((a, p) => a + p.words.length, 0);
    const rows = plan.map((p) => {
      const r = replacing && replacements.find((x) => x.target === p.target);
      const ok = r ? r.words.length : p.words.length;
      return h("div", { class: "preview-row" },
        icon(ok ? "check" : "info", 18, ok ? "ok" : "muted"),
        h("span", null, h("b", null, p.name), " · ",
          r ? `replaced: ${plural(r.words.length, "word")}, ${r.kept} keep their progress${r.removed ? `, ${r.removed} removed` : ""}`
            : !p.words.length ? `nothing new (all ${p.dupes} already there)`
              : p.target ? `adds ${plural(p.words.length, "word")}${p.dupes ? ` (${p.dupes} already there)` : ""}`
                : `new chapter, ${plural(p.words.length, "word")}`));
    });
    const skip = skipped.length ? h("div", { class: "preview-skip" },
      h("b", null, `Left out ${plural(skipped.length, "line")}:`),
      skipped.slice(0, 4).map((s) => h("div", null, `“${s.line}”: ${s.why}`)),
      skipped.length > 4 ? h("div", null, `and ${skipped.length - 4} more`) : null) : null;
    preview.replaceChildren(...rows, ...(skip ? [skip] : []));
    preview.hidden = !rows.length && !skip;
    sh?.setRight({ text: !total ? "Add" : replacing ? "Save" : `Add ${total}`, disabled: !total });
    sh && (sh.replacing = replacing);
  };
  text.addEventListener("input", update);
  name.addEventListener("input", update);

  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) { toast("Nothing copied yet"); return; }
      text.value = text.value.trim() ? `${text.value.trimEnd()}\n${clip}` : clip;
      update();
    } catch {
      text.focus();
      toast("Tap the box, then Paste");
    }
  };
  const fromFile = async () => {
    const file = await pickFile(".txt,.csv,.tsv,.md,.json,text/plain,text/csv,application/json");
    if (!file) return;
    let content = await file.text();
    if (/\.json$/i.test(file.name)) {
      try {     // a Glosor backup: its chapters as text
        const raw = JSON.parse(content);
        if (Array.isArray(raw.chapters)) content = raw.chapters.map((c) => chapterText({ name: c.name, words: (c.words || []).filter((w) => w?.sv && w?.el) })).join("\n\n");
      } catch { /* read it as text */ }
    }
    text.value = content;
    update();
  };

  const body = h("div", { class: "form" },
    h("div", { class: "add-help" },
      "Paste the word list: ", h("b", null, "one word a line, Swedish = Greek"), " (either order). A first line like ",
      h("b", null, "Kapitel 3"), " names the chapter. Word forms go between | : ", h("b", null, "en kock | kocken | kockar | kockarna"), "."),
    h("div", { class: "pill-row" },
      h("button", { type: "button", class: "pill-btn", onclick: paste }, icon("paste", 17), "Paste"),
      h("button", { type: "button", class: "pill-btn", onclick: fromFile }, icon("doc", 17), "From a file")),
    group(h("div", { class: "text-wrap" }, text)),
    nameRow,
    modeSlot,
    preview);
  sh = sheet({ title: "Add words", body, left: { text: "Cancel" }, right: { text: "Add", bold: true, disabled: true, onClick: (api) => {
    const replacing = Boolean(api.replacing);
    const doing = plan.filter((p) => p.words.length && !(replacing && p.target));
    const swaps = replacing ? replacements.filter((r) => r.words.length) : [];
    if (!doing.length && !swaps.length) return;
    if (doing.length) store.addChapters(doing);
    for (const r of swaps) store.saveChapter({ ...r.target, words: r.words });
    setSelection([...doing.map((p) => p.id), ...swaps.map((r) => r.target.id)]);
    const n = doing.reduce((a, p) => a + p.words.length, 0) + swaps.reduce((a, r) => a + r.words.length, 0);
    api.close();
    toast(swaps.length && !doing.length ? `✓  ${swaps.map((r) => r.target.name).join(", ")} updated` : `✓  ${plural(n, "word")} saved`);
    ctx.go("practise");
  } } });
  update();
  if (!prefill) setTimeout(() => text.focus({ preventScroll: true }), 350);
}
