# Expenity

Know where your money goes. A free, open-source web app that works on iPhone, iPad, Android, Windows, Mac and Linux with nothing to download, signs you in with a passkey, syncs across your devices, lets you share a wallet, and speaks **English and Greek**.

- **App:** https://expenity.github.io/expenity/app/ (installable, works offline)
- **Website:** https://expenity.github.io/expenity/ ([Greek](https://expenity.github.io/expenity/el/)), with the real app in an iPhone, iPad and computer frame where you can try themes live
- **Help center:** [docs/](docs/README.md) ([Greek](docs/el/README.md))
- **Blog post:** https://george-stathopoulos.github.io/blog/

Started as a bill reminder and grew into a money app for expenses, income, bills, budgets and goals.

## What works today (version 0.25)

- **Accounts and sync:** passkey sign-in (no passwords), recovery codes, your devices, offline first, sync through a Cloudflare Worker and D1 database. Guest mode keeps data in the browser only. **Start fresh** resets everything and runs the setup again.
- **First run:** account-first welcome, an animated "add to home screen" guide, and a skippable setup: name, currency, what you want help with, **plan (Basic, Pro or Advanced)**, wallets, **daily number**, look, and animated lessons (receipt scanning, one-sentence entry, handy extras, the help icon).
- **Money:** expenses, income, transfers, bills with flexible repeats, wallets in any currency with daily ECB exchange rates, quick add from a sentence in English or Greek, income that is already due recorded as received straight away.
- **Receipts and photos:** on-device receipt scanning (English and Greek) with hold-to-scan and re-scan, small photos on entries, a profile picture (20 characters or your photo).
- **Helpers:** a **daily "you can spend today" number** with your own daily, weekly or monthly spending target and an income target, **streaks** (a flame for days within budget), **duplicate guard**, **bill price-change alerts**, **search filters** (amount and dates), **recently deleted** (30 days) and **drafts** that Home points out after a closed app.
- **Budgets & goals:** category limits, carry-over, savings targets and milestones. Recurring income is under Activity → Income; Ideas stays on Home.
- **Reports:** overview, spending, cash flow, trends, forecast, subscriptions and a sortable table, with filters, CSV export and a table view for every chart.
- **Shared wallets:** invite codes and links, roles (owner, editor, viewer) enforced by the server, "added by" on every item.
- **Plans and features:** a Features page with Basic, Pro and Advanced, a comparison table and a toggle for every optional feature.
- **Help:** 25 animated tutorials (pure CSS), a pulsing help icon on every screen with a tutorial (popup, per-screen dismissal, switch in More), a welcome tour, and **Contact us** with rich text and photos.
- **Look:** eighteen themes, each adjustable with a pencil (colors, font, roundness), bundled fonts with Greek support, light and dark, an animations setting, press-and-hold and swipe actions, tablet and desktop layouts.
- Push notifications when the app is closed (a daily summary at your chosen hour; on iPhone for the home-screen app), calendar file with alarms, backup and restore, CSV export, installable PWA.

## Honest limits

- With an account, your data is stored on the Expenity server (Cloudflare) so it can sync. The connection is encrypted and access needs your passkey. It is not end-to-end encrypted, as with most online services.
- Email (verification, reminders, invites) is off until a sending domain exists. Email reminders wait for a sending domain.
- Tested with Playwright in Chrome (including virtual passkeys and two simulated people), not on every device. The Greek is awaiting review by a native speaker: see [docs/greek-review.html](docs/greek-review.html).

## Run it

The app is plain HTML, CSS and JavaScript with no build step:

```bash
python3 -m http.server 8766
```

Open http://localhost:8766/ (it talks to the live API). To run the API locally, see `worker/`:

```bash
cd worker && npm install
npx wrangler d1 execute expenity --local --file=schema.sql
npx wrangler dev --local
```

Other commands (need Node.js and Google Chrome):

```bash
npm install
npm run test:all               # logic and layout tests, API tests, end-to-end tests with virtual passkeys
node dev/screenshots.mjs       # regenerate the documentation screenshots (English and Greek)
node dev/greek-review.mjs      # regenerate the Greek review sheet
node website/build.mjs         # build the website into website/dist
bin/publish-site.sh            # publish website/dist to the gh-pages branch
bin/publish-beta.sh            # publish the working tree as a beta app
```

To deploy your own API, create a D1 database (`wrangler d1 create expenity`), put its id in `worker/wrangler.toml`, run `npm run db:remote` and `npm run deploy`, and set the relying-party values there. See [docs/specs/07-v1-accounts-sync-money.md](docs/specs/07-v1-accounts-sync-money.md).

## Languages

English is the default. Greek is complete (app, help center, website). The glossary is in [docs/greek-glossary.md](docs/greek-glossary.md). To add a language, copy the `en` block in [i18n.js](i18n.js), translate it, and add the month, weekday and repeat words to the quick-add parser in [core.js](core.js).

## Files

| Path | What it is |
|---|---|
| `index.html`, `style.css`, `themes.css`, `theme.js` | The app shell and its look |
| `core.js`, `sync.js` | Data model, money, quick add; accounts and sync |
| `ui.js`, `views.js`, `forms.js`, `app.js` | Screens, sheets and wiring |
| `flow.js`, `plan.js`, `reports.js`, `insights.js`, `share.js`, `themes.js` | First-run flow; budgets and goals; reports; ideas; shared wallets; theme picker |
| `i18n.js`, `icons.js` | English and Greek strings; bundled icons (Tabler, MIT) |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | Installable and offline |
| `worker/` | The API: Cloudflare Worker and D1 schema |
| `docs/` | Guides (English and `el/` Greek), the Greek review sheet, and `specs/` |
| `website/` | Website source and build (generates the help center from `docs/`) |
| `dev/` | Tests, screenshots, icon and review-sheet scripts |

## Licence

Application code: GPL-2.0-or-later. Third-party theme artwork has separate terms listed in [artwork credits](assets/themes/ARTWORK.md). By [George Stathopoulos](https://george-stathopoulos.github.io/). See the other projects there.
