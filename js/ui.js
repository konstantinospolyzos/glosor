// Small iOS-style building blocks (the same as the Savings Tracker's): elements, icons, sheets, alerts, toasts.

export function h(tag, props = null, ...children) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// ---------------------------------------------------------------------------
// Icons (simple strokes, tinted with currentColor)
// ---------------------------------------------------------------------------
const ICONS = {
  cards: '<rect x="3.6" y="7.4" width="12.6" height="12.6" rx="2.4"/><path d="M7.8 7.4V5.9a1.9 1.9 0 0 1 1.9-1.9h8.8a1.9 1.9 0 0 1 1.9 1.9v8.8a1.9 1.9 0 0 1-1.9 1.9h-2.3"/>',
  book: '<path d="M12 6.6C10.4 5.3 8.2 4.6 4 4.6v13.8c4.2 0 6.4.7 8 2 1.6-1.3 3.8-2 8-2V4.6c-4.2 0-6.4.7-8 2z"/><path d="M12 6.6v13.8"/>',
  speaker: '<path d="M4.5 9.4h3.2L12 5.6v12.8l-4.3-3.8H4.5z"/><path d="M15.4 9.2a4 4 0 0 1 0 5.6M17.9 6.7a7.6 7.6 0 0 1 0 10.6"/>',
  keyboard: '<rect x="2.6" y="6.2" width="18.8" height="11.6" rx="2.2"/><path d="M6.2 9.7h.01M9.4 9.7h.01M12.6 9.7h.01M15.8 9.7h.01M6.2 13h.01M17.8 9.7h.01M9.4 13h.01M12.6 13h.01M15.8 13h.01M17.8 13h.01M8.2 15.4h7.6"/>',
  arrow: '<path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5"/>',
  arrowLeft: '<path d="M19 12H5.5M11 6.5L5.5 12l5.5 5.5"/>',
  people: '<circle cx="9" cy="8.6" r="3.2"/><path d="M3.4 19.4a5.6 5.6 0 0 1 11.2 0"/><path d="M15.9 5.7a3 3 0 0 1 0 5.8M17.4 14.2a5 5 0 0 1 3.2 5.2"/>',
  trash: '<path d="M4.6 7h14.8M9.6 7V4.6h4.8V7M6.6 7l1 12.4h8.8l1-12.4"/>',
  edit: '<path d="M15.1 5.3l3.6 3.6L8.6 19H5v-3.6z"/>',
  paste: '<rect x="5.4" y="4.6" width="13.2" height="15.8" rx="2.2"/><path d="M9 4.6V3.4h6v1.2"/><path d="M9 10h6M9 13.4h6M9 16.8h3.4"/>',
  flame: '<path d="M12 20.6c-3.6 0-6.4-2.6-6.4-6.1 0-3.3 2.5-5.2 3.5-8.2.8 1.6 1.9 2.5 3.1 2.9.1-2.5 1-4.7 3-6.2-.4 2.7.6 4.6 2 6.3 1.1 1.4 1.4 3 1.4 4.6 0 4-2.9 6.7-6.6 6.7z"/>',
  sparkle: '<path d="M12 3.6l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z"/><path d="M18.6 15.6l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  cloud: '<path d="M7.2 18.5h10a4 4 0 0 0 .4-8A5.6 5.6 0 0 0 6.9 9.3 4.6 4.6 0 0 0 7.2 18.5z"/>',
  cloudCheck: '<path d="M7.2 18.5h10a4 4 0 0 0 .4-8A5.6 5.6 0 0 0 6.9 9.3 4.6 4.6 0 0 0 7.2 18.5z"/><path d="M9.6 13.6l1.9 1.9 3.4-3.6"/>',
  cloudUp: '<path d="M7.2 18.5h10a4 4 0 0 0 .4-8A5.6 5.6 0 0 0 6.9 9.3 4.6 4.6 0 0 0 7.2 18.5z"/><path d="M12 16.2v-5M9.9 13.2l2.1-2.1 2.1 2.1"/>',
  cloudOff: '<path d="M7.2 18.5h10a4 4 0 0 0 .4-8A5.6 5.6 0 0 0 6.9 9.3 4.6 4.6 0 0 0 7.2 18.5z"/><path d="M4 4l16 16"/>',
  phone: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.4"/><path d="M10.5 18h3"/>',
  sync: '<path d="M19 8.5A7.5 7.5 0 0 0 5.6 7.4M5 15.5a7.5 7.5 0 0 0 13.4 1.1"/><path d="M19.2 4.2v4.4h-4.4M4.8 19.8v-4.4h4.4"/>',
  chevron: '<path d="M9.5 6l6 6-6 6"/>',
  chevronDown: '<path d="M6 9.5l6 6 6-6"/>',
  search: '<circle cx="10.6" cy="10.6" r="6"/><path d="M15.2 15.2l4.6 4.6"/>',
  close: '<path d="M7 7l10 10M17 7L7 17"/>',
  check: '<path d="M5 12.6l4.3 4.3L19 7.2"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14"/>',
  doc: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7.5 11H6v9.5h12V11h-1.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor"/>',
};

export function icon(name, size = 22, extra = "") {
  const span = document.createElement("span");
  span.className = `icon ${extra}`;
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  return span;
}

// ---------------------------------------------------------------------------
// Little pieces
// ---------------------------------------------------------------------------
export const caption = (text) => h("div", { class: "section-caption" }, text);
export const footer = (text) => h("div", { class: "section-footer" }, text);
export const group = (...rows) => h("div", { class: "group" }, rows.flat().filter(Boolean));

export function segmented(options, index, onChange, extra = "") {
  const el = h("div", { class: `segmented ${extra}`, role: "tablist" });
  options.forEach((text, i) => {
    const b = h("button", { class: i === index ? "on" : "", type: "button", role: "tab", "aria-selected": String(i === index) }, text);
    b.addEventListener("click", () => {
      if (i === index) return;
      index = i;
      [...el.children].forEach((c, k) => { c.classList.toggle("on", k === i); c.setAttribute("aria-selected", String(k === i)); });
      onChange(i);
    });
    el.appendChild(b);
  });
  return el;
}

export function toggle(checked, onChange, label = "") {
  const input = h("input", { type: "checkbox", role: "switch", "aria-label": label });
  input.checked = Boolean(checked);
  input.addEventListener("change", () => onChange(input.checked));
  return h("label", { class: "switch" }, input, h("span", { class: "track" }, h("span", { class: "knob" })));
}

/** A rounded bar split into coloured parts: [[value, colour], ...] */
export function splitBar(parts, height = 8) {
  const total = parts.reduce((a, [v]) => a + Math.max(v, 0), 0);
  const el = h("div", { class: "split-bar", style: { height: `${height}px`, borderRadius: `${height / 2}px` } });
  if (total > 0) for (const [v, color] of parts) {
    if (v <= 0) continue;
    el.appendChild(h("span", { style: { flexGrow: String(v), background: color } }));
  }
  return el;
}

export function actionRow(iconName, text, onClick, { tone = "", detail = "" } = {}) {
  return h("button", { type: "button", class: `action-row ${tone}`, onclick: onClick },
    icon(iconName, 20, "row-icon"),
    h("span", { class: "action-text" }, h("span", null, text), detail ? h("span", { class: "action-detail" }, detail) : null),
    icon("chevron", 15, "chev"));
}

export const infoRow = (label, value) => h("div", { class: "info-row" }, h("span", { class: "info-label" }, label), h("span", { class: "info-value" }, value));

// ---------------------------------------------------------------------------
// Layers: sheets, alerts, toasts
// ---------------------------------------------------------------------------
const layer = () => document.getElementById("layer");
let openSheets = 0;
const lockScroll = (on) => document.documentElement.classList.toggle("locked", on);

/** A full-height iOS sheet that slides up. left/right: {text, onClick, bold, disabled} */
export function sheet({ title, left = null, right = null, body, onClose = null, className = "" }) {
  const backdrop = h("div", { class: "sheet-backdrop" });
  const leftBtn = left ? h("button", { class: "nav-link", type: "button" }, left.text) : h("span", { class: "nav-spacer" });
  const rightBtn = right ? h("button", { class: `nav-link ${right.bold ? "bold" : ""}`, type: "button" }, right.text) : h("span", { class: "nav-spacer" });
  const titleEl = h("div", { class: "sheet-title" }, title);
  const scroller = h("div", { class: "sheet-body" }, body);
  const panel = h("div", { class: `sheet ${className}`, role: "dialog", "aria-modal": "true", "aria-label": title },
    h("div", { class: "sheet-grabber" }),
    h("div", { class: "sheet-nav" }, leftBtn, titleEl, rightBtn),
    scroller);
  const wrap = h("div", { class: "sheet-wrap" }, backdrop, panel);
  let closed = false;
  const api = {
    el: panel, body: scroller,
    close(result) {
      if (closed) return;
      closed = true;
      wrap.classList.remove("open");
      openSheets -= 1;
      if (!openSheets) lockScroll(false);
      setTimeout(() => wrap.remove(), 320);
      onClose?.(result);
    },
    setRight({ text, disabled } = {}) {
      if (!right) return;
      if (text !== undefined) rightBtn.textContent = text;
      if (disabled !== undefined) rightBtn.disabled = disabled;
    },
    setTitle(text) { titleEl.textContent = text; },
  };
  leftBtn.addEventListener?.("click", () => (left.onClick ? left.onClick(api) : api.close()));
  if (right) {
    rightBtn.disabled = Boolean(right.disabled);
    rightBtn.addEventListener("click", () => right.onClick(api));
  }
  backdrop.addEventListener("click", () => (left?.onClick ? left.onClick(api) : api.close()));
  layer().appendChild(wrap);
  openSheets += 1;
  lockScroll(true);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add("open")));
  return api;
}

/** iOS alert. buttons: [{text, value, style: "cancel" | "destructive" | "bold"}] -> Promise(value).
 *  input: {value, placeholder} adds a text field; the promise then gives [value, text]. */
export function alertBox({ title, message = "", buttons = [{ text: "OK", value: true, style: "bold" }], input = null }) {
  return new Promise((resolve) => {
    const row = h("div", { class: `alert-buttons ${buttons.length > 2 ? "stacked" : ""}` });
    const field = input ? h("input", { class: "alert-input", type: "text", value: input.value || "", placeholder: input.placeholder || "",
      autocomplete: "off", autocapitalize: "words", enterkeyhint: "done" }) : null;
    const wrap = h("div", { class: "alert-wrap" },
      h("div", { class: "alert", role: "alertdialog", "aria-label": title },
        h("div", { class: "alert-text" }, h("div", { class: "alert-title" }, title),
          message ? h("div", { class: "alert-message" }, message) : null, field),
        row));
    const finish = (value) => {
      wrap.classList.remove("open");
      setTimeout(() => wrap.remove(), 200);
      resolve(input ? [value, field.value.trim()] : value);
    };
    for (const b of buttons) row.appendChild(h("button", { type: "button", class: `alert-btn ${b.style || ""}`, onclick: () => finish(b.value) }, b.text));
    field?.addEventListener("keydown", (ev) => { if (ev.key === "Enter") finish(buttons.find((b) => b.style === "bold")?.value ?? true); });
    layer().appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add("open")));
    field?.focus();
  });
}

/** Ask for one line of text: resolves to the text, or null when cancelled */
export async function askText({ title, message = "", value = "", placeholder = "", ok = "Save" }) {
  const [go, text] = await alertBox({ title, message, input: { value, placeholder },
    buttons: [{ text: "Cancel", value: false, style: "cancel" }, { text: ok, value: true, style: "bold" }] });
  return go && text ? text : null;
}

let toastTimer = null;
export function toast(text) {
  let el = document.getElementById("toast");
  if (!el) { el = h("div", { id: "toast", role: "status" }); layer().appendChild(el); }
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

/** Save a file: the share sheet on phones (Files, Mail, Drive...), a download elsewhere. */
export async function saveFile(name, type, content) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ files: [file], title: name });
      return;
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
  }
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Send text with the phone's share sheet (Messages, WhatsApp, Mail...), or copy it */
export async function shareText(text, title = "") {
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ text, title: title || undefined }); return "shared"; }
    catch (err) { if (err?.name === "AbortError") return "cancelled"; }
  }
  try { await navigator.clipboard.writeText(text); return "copied"; } catch { return "failed"; }
}

/** Ask for a file (must be called from a tap). */
export function pickFile(accept = "") {
  return new Promise((resolve) => {
    const input = h("input", { type: "file", accept: accept || null, style: { display: "none" } });
    input.addEventListener("change", () => { resolve(input.files[0] || null); input.remove(); });
    document.body.appendChild(input);
    input.click();
  });
}
