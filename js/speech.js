// Reading Swedish words aloud with the phone's own voices (an iPhone has a Swedish one: Alva).
import { speakable } from "./core.js";

let voice = null;

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

function pickVoice() {
  if (!canSpeak()) return;
  const voices = window.speechSynthesis.getVoices().filter((v) => /^sv([-_]|$)/i.test(v.lang));
  voice = voices.find((v) => v.localService && /alva|klara|oskar/i.test(v.name)) || voices.find((v) => v.localService) || voices[0] || null;
}

if (canSpeak()) {
  pickVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

/** True when the phone has a Swedish voice (some only list theirs after the first word is spoken) */
export function hasSwedishVoice() {
  if (!voice) pickVoice();
  return Boolean(voice);
}

/** Say a Swedish word: its first form, without the note in brackets */
export function speak(sv) {
  if (!canSpeak()) return;
  const text = speakable(sv);
  if (!text) return;
  if (!voice) pickVoice();
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "sv-SE";
  if (voice) u.voice = voice;
  u.rate = 0.85;
  s.speak(u);
}
