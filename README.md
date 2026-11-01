# Glosor

Practise the Swedish words from class on your phone:

1. **Svenska → Ελληνικά**: see the Swedish word, pick the Greek one of five
2. **Ελληνικά → Svenska**: see the Greek word, pick the Swedish one of five
3. **Skriv på svenska**: see the Greek word, type the Swedish (with å ä ö keys)
4. **Lyssna**: hear the Swedish word, pick the Greek
5. **En eller ett?**: is it en or ett?
6. **Böj ordet**: type a word's other forms, three ways:
   - **Bestämd form**: en kock → kocken (switch on *Plural too* for kockar, kockarna)
   - **Infinitiv & imperativ**: from the present, talar → tala and tala!
   - **Alla former**: any form, past tenses and adjectives too
7. **Övningar**: sentence exercises per chapter (fill in the word, pick the right one, build the sentence from the Greek)
8. **Tidsjakt**: as many words as you can in 60 seconds, both directions mixed; your best score is kept

Words come in chapters (one per word list from class), optionally with their forms:
`en kock | kocken | kockar | kockarna`, `tala | talar | talade | talat | tala!`, `stor | stort | stora`.
Exercise lines go in the same file:
`[fyll] Jag ___ Maria. (heta) = heter // Με λένε Μαρία.`, `[välj] ___ bor du? = Var | Vad | Varifrån`,
`[ordna] Varifrån kommer du? // Από πού είσαι;` (`!! a tip` after any of them).
Every word moves up when you get it right, comes back more often when you miss it, and comes back after
1, 2, 4, 7 and 14 days as you learn it ("Due today" on Practise). Data is a JSON file in your own Google Drive (or on the phone only), synced change by change,
the same way as the Savings Tracker.

- `index.html`, `css/`, `js/`: the app (plain JavaScript modules, no build step)
- `js/config.js`: the Google sign-in client ID (the Savings Tracker's; see SETUP.md)
- `js/core.js`: reading pasted word lists, checking typed answers, picking each round's words and the wrong options
- `js/data.js`: the data file (chapters, people, progress) and the changes made to it
- `js/store.js`: Google Drive sync, offline queue, weekly backup in Drive
- `js/speech.js`: reads Swedish words aloud with the phone's own voice
- `js/pages/`: Practise, Words, the exercise screen, Tidsjakt (`timed.js`), Settings, the welcome screen
- `tests/`: checks for `core.js`, `data.js` and the Drive sync. Run `npm test` (Node 22+); GitHub runs them on every push

Setup: see SETUP.md.
