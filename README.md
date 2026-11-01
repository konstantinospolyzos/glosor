# Glosor

Practise the Swedish words from class on your phone, three ways:

1. **Svenska → Ελληνικά**: see the Swedish word, pick the Greek one of five
2. **Ελληνικά → Svenska**: see the Greek word, pick the Swedish one of five
3. **Skriv på svenska**: see the Greek word, type the Swedish (with å ä ö keys)

Words come in chapters (one per word list from class). Every word moves up when you get it right and comes back more
often when you miss it. Data is a JSON file in your own Google Drive (or on the phone only), synced change by change,
the same way as the Savings Tracker.

- `index.html`, `css/`, `js/`: the app (plain JavaScript modules, no build step)
- `js/config.js`: the Google sign-in client ID (the Savings Tracker's; see SETUP.md)
- `js/core.js`: reading pasted word lists, checking typed answers, picking each round's words and the wrong options
- `js/data.js`: the data file (chapters, people, progress) and the changes made to it
- `js/store.js`: Google Drive sync, offline queue, weekly backup in Drive
- `js/speech.js`: reads Swedish words aloud with the phone's own voice
- `js/pages/`: Practise, Words, the exercise screen, Settings, the welcome screen
- `tests/`: checks for `core.js`, `data.js` and the Drive sync. Run `npm test` (Node 22+); GitHub runs them on every push

Setup: see SETUP.md.
