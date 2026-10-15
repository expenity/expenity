# Duenest

Your bills and subscriptions, calmly in one place. A free, open-source web app that works on every device, keeps your data in your browser, and speaks **English and Greek (Ελληνικά)**.

- **App:** https://george-stathopoulos.github.io/duenest/app/ (installable, works offline)
- **Website:** https://george-stathopoulos.github.io/duenest/ ([Ελληνικά](https://george-stathopoulos.github.io/duenest/el/))
- **Help center:** [docs/](docs/README.md) ([Ελληνικά](docs/el/README.md))
- **Blog post:** https://george-stathopoulos.github.io/blog/

Inspired by [RemindPayBee](https://remindpaybee.com/), an Android bill reminder that keeps data on one device. Duenest is a web app, so it runs everywhere, and adds sentence-style quick add, a calendar of what is due, a 90-day forecast and subscription costs.

## What works today (version 0.1)

- Bills with repeats (weekly to yearly), categories, notes, payment link and reference
- Quick add from a sentence in English or Greek (`Netflix 15.99 monthly on the 3rd`, `Ενοίκιο 850€ κάθε μήνα στις 1`) and templates, including Greek ones (ΔΕΗ, ΕΥΔΑΠ, ΕΝΦΙΑ)
- Today, Calendar and Insights views; mark paid, undo, snooze, skip
- Notifications while the app is open, and a **calendar file (.ics) with alarms** that your calendar app delivers even when Duenest is closed
- Backup, restore, CSV export, delete everything; light and dark; installable PWA

## Honest limits

Your data lives in the browser of the device you use. A website cannot wake a phone when it is closed, so reminders with the app closed come from the calendar file. **Sync between devices, push and email reminders, shared households and reading bills from photos need a server** and are planned (a Cloudflare Worker is the likely home), not built. See the [specifications](docs/specs/).

## Run it

It is plain HTML, CSS and JavaScript with no build step:

```bash
python3 -m http.server 8766
```

Open http://localhost:8766/. Other commands (need Node.js and Google Chrome):

```bash
npm install
npm test                       # logic tests: quick-add in English and Greek, recurrence, calendar file, language switch
node dev/screenshots.mjs       # regenerate the documentation screenshots (English and Greek)
node website/build.mjs         # build the website into website/dist
bin/publish-site.sh            # publish website/dist to the gh-pages branch
```

## Languages

English is the default. Greek is complete (app, help center, website). To add a language, copy the `en` block in [i18n.js](i18n.js), translate it, and add the month, weekday and repeat words to the quick-add parser in [app.js](app.js).

## Files

| Path | What it is |
|---|---|
| `index.html`, `app.js`, `i18n.js`, `style.css` | The app |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | Installable and offline |
| `docs/` | Guides (English and `el/` Greek) and `specs/` |
| `website/` | Website source and build (generates the help center from `docs/`) |
| `dev/` | Tests, screenshots, icons and social image scripts |

## Licence

GPL-2.0-or-later. By [George Stathopoulos](https://george-stathopoulos.github.io/). See the other projects there.
