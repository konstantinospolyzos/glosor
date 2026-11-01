import { h, icon, alertBox } from "../ui.js";
import { store } from "../store.js";

export function renderWelcome() {
  const configured = store.drive.configured;
  const busy = h("div", { class: "welcome-busy" });

  const googleBtn = h("button", { type: "button", class: "btn primary wide", disabled: configured ? null : true }, icon("cloud", 19), "Continue with Google");
  googleBtn.addEventListener("click", () => {
    busy.textContent = "Connecting to Google Drive…";
    googleBtn.disabled = true;
    store.connectDrive()
      .catch((err) => alertBox({ title: "Couldn't connect to Google Drive", message: err.message }))
      .finally(() => { busy.textContent = ""; googleBtn.disabled = false; });
  });

  return h("div", { class: "welcome" },
    h("img", { class: "welcome-logo", src: "icons/icon-192.png", alt: "" }),
    h("h1", { class: "welcome-title" }, "Välkommen till Glosor"),
    h("p", { class: "welcome-text" }, "Your Swedish class word lists, practised three ways: pick the Greek, pick the Swedish, type the Swedish. First, choose where your words are kept."),
    h("div", { class: "choice-card recommended" },
      h("div", { class: "choice-head" }, icon("cloud", 22, "choice-icon blue"), h("div", { class: "choice-title" }, "Google Drive"), h("span", { class: "chip tone-info" }, "Recommended")),
      h("div", { class: "choice-text" }, "Your words and progress are one file in your own Google Drive, the same on your phone and your computer, and backed up."),
      configured ? null : h("div", { class: "choice-note" }, "Not set up for this website yet. See SETUP.md."),
      googleBtn, busy),
    h("div", { class: "choice-card" },
      h("div", { class: "choice-head" }, icon("phone", 22, "choice-icon"), h("div", { class: "choice-title" }, "Only on this phone")),
      h("div", { class: "choice-text" }, "Try the app first. You can move your words to Google Drive later in Settings."),
      h("button", { type: "button", class: "btn tinted wide", onclick: () => store.startLocal() }, "Use on this phone")));
}
