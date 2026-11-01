# Glosor on your phone: setup (about 10 minutes, once)

Google Drive needs nothing new: Glosor uses the Savings Tracker's Google sign-in (already in `js/config.js`),
which is allowed on every page of `https://konstantinospolyzos.github.io`. So it's just:

1. Put the app online with **GitHub Pages**, at `https://konstantinospolyzos.github.io/glosor/`.
2. Open it on your phone, sign in with Google, and **Add to Home Screen**.
3. Set it up for your partner.

---

## 1. Put the app online (GitHub Pages)

1. Go to <https://github.com/new>.
   - Repository name: `glosor`
   - **Public** (only the app's code is public; your words never go to GitHub)
   - Click **Create repository**.
2. On the new repository page, click **uploading an existing file**.
   Drag **everything inside** the unzipped `glosor` folder into the page (the `index.html`, `manifest.webmanifest`,
   `sw.js` and `package.json` files plus the `css`, `js`, `icons` and `tests` folders), then click **Commit changes**.
   (The hidden `.github` folder only runs the tests on GitHub. It's fine to leave it out.)
3. Go to **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**,
   folder **/ (root)**, and click **Save**.
4. After a minute the page shows *Your site is live at* `https://konstantinospolyzos.github.io/glosor/`.

## 2. On your phone

1. Open `https://konstantinospolyzos.github.io/glosor/` in **Safari** and tap **Continue with Google**.
   It's the same sign-in as the Savings Tracker (Google may show the window with that name; see *Good to know*).
   Your words are saved in `My Drive › Glosor › glosor.json`.
2. Tap **Share → Add to Home Screen**, then open Glosor from its new icon.
   (Android: open it in Chrome, tap **⋮ → Add to Home screen** or *Install app*.)

## 3. Your partner

Pick one of the two ways:

**A. Her own Google account (recommended).** She gets her own file in her own Drive and her own progress.
1. Add her Gmail as a test user, in the same place as for the Savings Tracker:
   <https://console.cloud.google.com/auth/audience> → *Test users* → **Add users**.
2. She opens the address above on her phone, taps **Continue with Google** with her account, and adds it to her Home Screen.
3. When you add a chapter: open it under **Words → Share** and send it to her (Messages, WhatsApp...).
   She copies it, taps **+ → Paste → Add**. Twenty seconds per chapter.

**B. One shared list.** She signs in with *your* Google account on her phone, so new chapters reach both phones by themselves.
In **Settings → Who's practising → Add a person**, add both your names; on each phone tick who uses it.
Each of you keeps your own progress. (The catch: her Safari stays signed in to your Google account.)

---

## Adding the words from class

Send Claude the list: a photo of the page, or the text. You get it back ready to paste, one word a line:

```
Kapitel 4
en lägenhet = ένα διαμέρισμα
bo (bor, bodde, bott) = μένω
idag / i dag = σήμερα
```

Copy it, open Glosor, tap **+**, **Paste**, **Add**. The new chapter is chosen on Practise straight away.

What the app understands:
- `=` between Swedish and Greek (also `–`, `-`, `:`, `;` or a tab, and either order).
- A line without Greek at the top, like `Kapitel 4`, names the chapter. Pasting into a name you already have adds only the new words.
- `(äter, åt, ätit)`: a note, shown with the word but not needed when typing.
- `idag / i dag`: either is right.
- Typing: "hund" counts for "en hund" (it reminds you of the en/ett). The wrong en/ett, a missing å/ä/ö or one small
  typo is *Nästan* (almost): half a step forward. If you typed another right word, tap **I was right**.

## Good to know

- **The sign-in window says "Savings Tracker":** both apps share one Google sign-in. To give it a neutral name, open
  <https://console.cloud.google.com/auth/branding> and change *App name* (for example "Konstantinos' apps").
- **Signing in again:** Google's permission lasts about an hour. The app keeps a copy on the phone, so you can always
  practise; when the cloud icon turns orange, the first tap syncs again.
- **Offline:** practise on the underground. Your progress goes to Drive when you're back online.
- **Backups:** Drive keeps a copy every week in the Glosor folder (the last 8). Settings → *Save a backup* gives you one file.
- **Updating the app later:** upload the new files to the same repository. Phones pick it up the next time it's opened.
- **The Savings Tracker and Glosor live on the same website.** When the Savings Tracker updates, its offline helper clears
  every other saved copy on the site, so Glosor re-saves its own the next time it's online. To stop that, change one
  line in the Savings Tracker's `sw.js`:
  `keys.filter((k) => k !== CACHE)` → `keys.filter((k) => k.startsWith("savings-tracker-") && k !== CACHE)`
