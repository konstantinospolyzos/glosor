// Glosor for phones: app shell (navigation bar, tabs, pages).
import { store, describeData } from "./store.js";
import { h, icon, alertBox } from "./ui.js";
import { renderPractise } from "./pages/practise.js";
import { renderWords, openAddWords } from "./pages/words.js";
import { renderWelcome } from "./pages/welcome.js";
import { openSettings } from "./pages/settings.js";
import { startQuiz } from "./pages/quiz.js";
import { startTimed } from "./pages/timed.js";
import { currentPerson, roundFor, nameChip } from "./pages/common.js";

const TABS = [
  { key: "practise", title: "Practise", icon: "cards", render: renderPractise },
  { key: "words", title: "Words", icon: "book", render: renderWords },
];
const tabKeys = TABS.map((t) => t.key);
let current = tabKeys.includes(location.hash.slice(1)) ? location.hash.slice(1) : store.pref("tab", "practise");
if (!tabKeys.includes(current)) current = "practise";
const scrolls = {};

const main = document.getElementById("main");
const navbar = document.getElementById("navbar");
const navTitle = document.getElementById("nav-title");
const syncBtn = document.getElementById("sync-btn");
const tabbar = document.getElementById("tabbar");
let statusPill = null;

// ---------------------------------------------------------------------------
// Shared actions
// ---------------------------------------------------------------------------
function context() {
  return {
    go,
    refresh: () => { const y = window.scrollY; render(); window.scrollTo(0, y); },
    startQuiz: startRound,
  };
}

function startRound(mode) {
  const repick = () => roundFor(mode);
  const { words, pool, all } = repick();
  if (!words.length) return;
  if (mode === "time") { startTimed({ pool, all, person: currentPerson(), repick, onEnd: () => render() }); return; }
  startQuiz({ mode, words, pool, all, person: currentPerson(), repick, onEnd: () => render() });
}

/** First time a phone with words meets a Drive file that also has words: which to keep? */
store.chooser = (mine, theirs) => alertBox({
  title: "Which words do you want?",
  message: `Google Drive has ${describeData(theirs)}.\nThis phone has ${describeData(mine)}.`,
  buttons: [
    { text: "Use Google Drive's", value: "drive", style: "bold" },
    { text: "Use this phone's (replaces Drive's)", value: "device", style: "" },
  ],
});

function go(key) {
  if (!tabKeys.includes(key)) return;
  scrolls[current] = window.scrollY;
  current = key;
  store.setPref("tab", key);
  history.replaceState(null, "", `#${key}`);
  render();
  window.scrollTo(0, scrolls[key] || 0);
}

// ---------------------------------------------------------------------------
// Chrome: navigation bar, sync indicator, tab bar
// ---------------------------------------------------------------------------
const SYNC_ICONS = { local: "phone", synced: "cloudCheck", syncing: "sync", pending: "cloudUp", signin: "cloudUp",
  offline: "cloudOff", error: "cloudOff", idle: "cloud" };

function updateChrome() {
  const st = store.status;
  syncBtn.replaceChildren(icon(SYNC_ICONS[st.state] || "cloud", 23));
  syncBtn.className = `nav-btn sync-state-${st.state}`;
  syncBtn.setAttribute("aria-label", st.text || "Data");
  if (statusPill) {
    const attention = ["signin", "error", "offline", "pending"].includes(st.state);
    statusPill.className = `status-pill state-${st.state} ${attention ? "attention" : ""}`;
    statusPill.replaceChildren(icon(SYNC_ICONS[st.state] || "cloud", 15), h("span", null, st.text));
    statusPill.style.display = st.text ? "" : "none";
  }
}

function buildTabbar() {
  tabbar.replaceChildren(...TABS.map((t) => {
    const b = h("button", { type: "button", class: `tab ${t.key === current ? "on" : ""}`, "aria-label": t.title,
      "aria-current": t.key === current ? "page" : null }, icon(t.icon, 26), h("span", null, t.title));
    b.addEventListener("click", () => (t.key === current ? window.scrollTo({ top: 0, behavior: "smooth" }) : go(t.key)));
    return b;
  }));
}

function render() {
  const ready = store.ready;
  document.body.classList.toggle("welcome-mode", !ready);
  if (!ready) {
    statusPill = null;
    main.replaceChildren(renderWelcome());
    return;
  }
  const tab = TABS.find((t) => t.key === current);
  const [subtitle, ...content] = tab.render(context());
  navTitle.textContent = tab.title;
  statusPill = h("button", { type: "button", class: "status-pill" });
  statusPill.addEventListener("click", () => (store.mode === "drive" ? store.syncFromTap() : openSettings(context())));
  const showPill = current === "practise" || ["signin", "error"].includes(store.status.state);
  main.replaceChildren(h("div", { class: "page", dataset: { page: current } },
    h("div", { class: "title-row" }, h("h1", { class: "large-title" }, tab.title), nameChip(context().refresh)),
    h("div", { class: "subtitle" }, subtitle),
    showPill ? statusPill : null,
    ...content.flat().filter(Boolean)));
  buildTabbar();
  updateChrome();
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
document.getElementById("settings-btn").addEventListener("click", () => store.ready && openSettings(context()));
document.getElementById("add-btn").addEventListener("click", () => store.ready && openAddWords(context()));
syncBtn.addEventListener("click", () => {
  if (!store.ready) return;
  if (store.mode === "drive") store.syncFromTap();
  else openSettings(context());
});
// Google's sign-in lasts an hour, and the browser only lets its window open from a tap. So when it has
// run out (the orange cloud), the first tap anywhere signs in again and syncs, once (as in the Savings Tracker).
// A tap is a touch that lifts where it went down; on an iPhone it has to be the touch itself.
let autoSignIn = true, touchAt = null;
function signInOnTap(ev) {
  if (!autoSignIn || !store.ready || store.mode !== "drive" || store.drive.tokenValid() || !navigator.onLine) return;
  if (!window.google?.accounts?.oauth2) return;
  if (ev.target.closest?.("#sync-btn, input, textarea, select, .sheet-wrap, .alert-wrap, .quiz")) return;
  autoSignIn = false;
  store.syncFromTap().then(() => { if (!store.drive.tokenValid() && /blocked/.test(store.status.text || "")) autoSignIn = true; });
}
document.addEventListener("touchstart", (ev) => { const t = ev.touches[0]; touchAt = t ? [t.clientX, t.clientY] : null; }, { capture: true, passive: true });
document.addEventListener("touchend", (ev) => {
  const t = ev.changedTouches[0];
  if (t && touchAt && Math.hypot(t.clientX - touchAt[0], t.clientY - touchAt[1]) < 10) signInOnTap(ev);
}, true);
document.addEventListener("click", signInOnTap, true);
store.on((kind) => { if (kind === "status" && store.drive.tokenValid()) autoSignIn = true; });
window.addEventListener("scroll", () => navbar.classList.toggle("scrolled", window.scrollY > 38), { passive: true });
window.addEventListener("hashchange", () => { const k = location.hash.slice(1); if (k !== current && tabKeys.includes(k)) go(k); });

store.on((kind) => (kind === "status" ? updateChrome() : render()));
// signed in with Google for the first time: the one person practising gets your first name
store.onSynced = () => {
  const d = store.data, name = store.meta.name;
  if (name && d.people.length === 1 && d.people[0].name === "Me") store.savePerson({ ...d.people[0], name: name.split(" ")[0] });
};
store.load();
render();
if (store.mode === "drive") store.sync();

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
