// A note for Athina: every time she opens the app (or comes back to it after a while), it says hello.
import { h } from "./ui.js";
import { store } from "./store.js";
import { currentPerson } from "./pages/common.js";

const NAMES = ["athina", "athena", "αθηνα"];
const MESSAGE = "Πολύ πολύ πολύ ❤️😍";
const AWAY = 2 * 60 * 1000;     // back after this long in the background counts as opening it again
const WAIT = 15 * 1000;         // on a new phone her name can arrive with the first sync, just after opening
const SHOWN = 3800;             // ms on screen (a tap closes it sooner)

const plain = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
export const isAthina = (person) => NAMES.includes(plain(person?.name).split(/\s+/)[0]);

let openedAt = Date.now(), shown = false, hiddenAt = 0;

function show() {
  const note = h("div", { class: "love-note", role: "status", lang: "el" }, MESSAGE);
  document.getElementById("layer").appendChild(note);
  requestAnimationFrame(() => requestAnimationFrame(() => note.classList.add("show")));
  let gone = false;
  const hide = () => {
    if (gone) return;
    gone = true;
    note.classList.remove("show");
    setTimeout(() => note.remove(), 400);
  };
  note.addEventListener("click", hide);
  setTimeout(hide, SHOWN);
}

function greet() {
  if (shown || !store.ready || Date.now() - openedAt > WAIT || !isAthina(currentPerson())) return;
  shown = true;
  show();
}

export function watchOpens() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt >= AWAY) { openedAt = Date.now(); shown = false; greet(); }
  });
  store.on(() => greet());
  greet();
}
