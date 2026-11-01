// Settings: where the words are saved, who's practising, sound, progress, backups.
import { h, sheet, group, caption, footer, icon, alertBox, askText, toast, saveFile, pickFile, toggle, actionRow, infoRow } from "../ui.js";
import { APP_NAME, APP_VERSION, chapterText, uid } from "../core.js";
import { store, FILE_NAME, FOLDER_NAME, describeData, readBackupFile } from "../store.js";
import { currentPerson, plural } from "./common.js";
import { canSpeak, hasSwedishVoice, speak } from "../speech.js";

const NO = { text: "Cancel", value: false, style: "cancel" };
const dayText = (ms) => new Date(ms).toLocaleDateString([], { day: "numeric", month: "short" });
const stamp = () => new Date().toISOString().slice(0, 10);

function peopleSection() {
  const data = store.data;
  const me = currentPerson();
  const rows = data.people.map((p) => h("div", { class: "person-row" },
    h("button", { type: "button", class: "person-pick", onclick: () => { store.setPref("person", p.id); toast(`This phone: ${p.name}`); store.emit(); } },
      h("span", { class: `radio ${p.id === me.id ? "on" : ""}` }, p.id === me.id ? icon("check", 14) : null),
      h("span", { class: "person-name" }, p.name),
      p.id === me.id ? h("span", { class: "person-note" }, "this phone") : null),
    h("button", { type: "button", class: "icon-btn", "aria-label": `Rename ${p.name}`, onclick: async () => {
      const name = await askText({ title: "Name", value: p.name });
      if (name) store.savePerson({ ...p, name });
    } }, icon("edit", 18)),
    data.people.length > 1 ? h("button", { type: "button", class: "icon-btn danger", "aria-label": `Remove ${p.name}`, onclick: async () => {
      const ok = await alertBox({ title: `Remove ${p.name}?`, message: `${p.name}'s progress goes away. The words stay.`,
        buttons: [NO, { text: "Remove", value: true, style: "destructive" }] });
      if (ok) store.deletePerson(p.id);
    } }, icon("trash", 18)) : null));
  const add = actionRow("people", "Add a person", async () => {
    if (data.people.length === 1 && data.people[0].name === "Me") {
      const mine = await askText({ title: "Your name first", message: "So each of you sees your own progress.", placeholder: "Your name" });
      if (!mine) return;
      store.savePerson({ ...data.people[0], name: mine });
    }
    const name = await askText({ title: "Who else practises?", placeholder: "Their name", ok: "Add" });
    if (name) store.savePerson({ id: uid("p"), name });
  });
  return [caption("Who's practising"), group(...rows, add),
    footer(data.people.length > 1
      ? "Each person has their own progress. Tick who uses this phone; on Practise you can switch."
      : "Practising together on one Google account (or one phone)? Add each other, and each gets their own progress. With your own Google accounts, send chapters with the Share button instead.")];
}

export function openSettings(ctx) {
  const body = h("div", { class: "form" });

  function build() {
    const m = store.meta;
    const parts = [caption("Where your words are saved")];
    if (store.mode === "drive") {
      parts.push(group(
        infoRow("Google Drive", m.email || "signed in"),
        infoRow("File", `My Drive › ${FOLDER_NAME} › ${FILE_NAME}`),
        infoRow("Status", store.status.text || "—"),
        actionRow("sync", "Sync now", () => store.syncFromTap().then(() => toast(store.status.text))),
        m.link ? actionRow("link", "Open the file in Google Drive", () => window.open(m.link, "_blank", "noopener")) : null));
      parts.push(footer("Your words and progress are one file in your own Google Drive, the same on every phone or computer signed in with your Google account. The app can only see the files it made itself."));
      parts.push(group(actionRow("cloudOff", "Stop using Google Drive", async () => {
        const ok = await alertBox({ title: "Stop using Google Drive?", message: "Your words stay on this phone, and the file in Google Drive is not deleted. You can connect again later.",
          buttons: [NO, { text: "Stop", value: true, style: "destructive" }] });
        if (ok) { store.disconnectDrive(); toast("Now saving on this phone only"); }
      }, { tone: "danger" })));
    } else {
      parts.push(group(infoRow("This phone only", describeData(store.data))));
      parts.push(store.drive.configured
        ? group(actionRow("cloud", "Save to Google Drive", () => {
          store.connectDrive().then(() => toast(store.status.text)).catch((err) => alertBox({ title: "Couldn't connect to Google Drive", message: err.message }));
        }, { detail: "The same words on your phone and computer" }))
        : footer("Google Drive isn't set up for this website yet. See SETUP.md."));
    }

    parts.push(...peopleSection());

    parts.push(caption("Sound"));
    parts.push(group(h("label", { class: "form-row switch-row" },
      h("span", { class: "form-label" }, icon("speaker", 18, "inline-icon"), "Read Swedish aloud"),
      toggle(store.pref("speak", false), (on) => { store.setPref("speak", on); if (on) speak("Hej!"); }, "Read Swedish aloud"))));
    parts.push(footer(!canSpeak() ? "This browser can't read words aloud."
      : `Says each Swedish word during the exercises. You can always tap the speaker next to a word.${hasSwedishVoice() ? "" : " If it sounds English, add a Swedish voice: on an iPhone, Settings › Accessibility › Spoken Content › Voices › Swedish."}`));

    const me = currentPerson();
    parts.push(caption("Progress"));
    parts.push(group(actionRow("sync", `Start ${store.data.people.length > 1 ? `${me.name}'s` : "my"} progress again`, async () => {
      const ok = await alertBox({ title: "Start again?", message: "Every word goes back to new. The words themselves stay.",
        buttons: [NO, { text: "Start again", value: true, style: "destructive" }] });
      if (ok) { store.resetProgress(me.id); toast("Progress cleared"); }
    }, { tone: "danger" })));

    parts.push(caption("Backup"));
    parts.push(group(
      actionRow("download", "Save a backup", () => {
        saveFile(`glosor-backup-${stamp()}.json`, "application/json", JSON.stringify({ ...store.data, exported: new Date().toISOString() }, null, 1));
        store.noteManualBackup();
      }, { detail: "Every word and everyone's progress, in one file" }),
      actionRow("doc", "Restore a backup", async () => {
        const file = await pickFile(".json,application/json");
        if (!file) return;
        try {
          const data = await readBackupFile(file);
          const ok = await alertBox({ title: "Use this backup?", message: `${file.name}: ${describeData(data)}.\n\nIt replaces what's in the app now${store.mode === "drive" ? " and in your Google Drive file" : ""}.`,
            buttons: [NO, { text: "Replace", value: true, style: "bold" }] });
          if (!ok) return;
          store.replaceAll(data);
          toast("✓  Backup restored");
          if (store.mode === "drive" && !store.drive.tokenValid()) store.syncFromTap();
        } catch (err) { alertBox({ title: "Can't use that file", message: err.message }); }
      }),
      actionRow("share", "Export the word lists", () => {
        if (!store.data.chapters.length) { toast("No words yet"); return; }
        saveFile(`glosor-words-${stamp()}.txt`, "text/plain", `${store.data.chapters.map((c) => chapterText(c)).join("\n\n")}\n`);
      }, { detail: "As text: Swedish = Greek, chapter by chapter" })));
    parts.push(footer(store.mode === "drive"
      ? `Google Drive also keeps a copy each week in the “${FOLDER_NAME}” folder (the last 8)${m.lastBackup ? `, latest ${dayText(m.lastBackup)}` : ""}.`
      : `Your words are only on this phone, so save a backup now and then. Last saved: ${m.lastManualBackup ? dayText(m.lastManualBackup) : "never"}.`));

    parts.push(caption("On your phone"));
    parts.push(group(h("div", { class: "info-text" },
      h("p", null, h("b", null, "iPhone: "), "open this page in Safari, tap Share, then “Add to Home Screen”."),
      h("p", null, h("b", null, "Android: "), "open it in Chrome, tap ⋮, then “Add to Home screen” or “Install app”."))));
    parts.push(h("div", { class: "about" }, `${APP_NAME} ${APP_VERSION} · ${plural(store.data.chapters.reduce((a, c) => a + c.words.length, 0), "word")}`));
    body.replaceChildren(...parts.filter(Boolean));
  }

  build();
  const off = store.on(build);
  sheet({ title: "Settings", right: { text: "Done", bold: true, onClick: (api) => api.close() }, body, onClose: off });
}
