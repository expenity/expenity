# Expenity

Know where your money goes. A free, open-source web app that works on every device, signs you in with a passkey, syncs across your devices, lets you share a wallet, and speaks **English and Greek**.

- **App:** https://expenity.github.io/expenity/app/ (installable, works offline)
- **Website:** https://expenity.github.io/expenity/ ([Greek](https://expenity.github.io/expenity/el/))
- **Help center:** [docs/](docs/README.md) ([Greek](docs/el/README.md))
- **Blog post:** https://george-stathopoulos.github.io/blog/

Started as a bill reminder and grew into a money app for expenses, income, bills, budgets and goals.

## What works today (version 0.4)

- **Accounts and sync:** passkey sign-in (no passwords), recovery codes, your devices, offline first, sync through a Cloudflare Worker and D1 database. Guest mode keeps data in the browser only.
- **First run:** account-first welcome, an animated "add to home screen" guide, and a skippable setup (name, currency, what you want help with, first goal, wallets, look).
- **Money:** expenses, income, transfers, bills with repeats, wallets in any currency with daily ECB exchange rates, quick add from a sentence in English or Greek.
- **Plan:** budgets (with carry-over), goals (with forecast and milestones), recurring income, and ideas worked out from your own data and your aims.
- **Reports:** overview, spending, cash flow, trends, forecast, subscriptions and a sortable table, with filters, CSV export and a table view for every chart.
- **Shared wallets:** invite codes and links, roles (owner, editor, viewer) enforced by the server, "added by" on every item.
- **Look:** twelve themes, light and dark, an animations setting, tablet and desktop layouts.
- Calendar file with alarms, notifications while open, backup and restore, CSV export, installable PWA.

## Honest limits

- Your data is stored on the Expenity server when you have an account. It is protected by your passkey but **not end-to-end encrypted**.
- Email (verification, reminders, invites) is off until a sending domain exists. Push and email reminders when the app is closed are planned; the calendar file covers that today.
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

GPL-2.0-or-later. By [George Stathopoulos](https://george-stathopoulos.github.io/). See the other projects there.
