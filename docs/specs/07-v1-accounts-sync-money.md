# 07 Expenity v1: accounts, sync and full budgeting

**Status:** draft, decisions recorded 2026-10-15 (stay on github.io for now). Nothing in this document is built yet, except the sync core described in section 5 (drafted and tested locally, not deployed).
**Supersedes:** the "browser-only" scope of version 0.1. Documents 01 to 06 stay valid as background; where they disagree with this one, this one wins.

## 1. Why this exists

Version 0.1 is a browser-only app: data lives in one browser, and moving it to another device means downloading and uploading a backup file. That is not what Expenity is meant to be. The product is an **online app**: sign up, add accounts, expenses, income and bills on any device, and see the same data everywhere, with reminders that arrive even when the app is closed.

## 2. Decisions taken (2026-10-15)

| Topic | Decision | Consequence |
|---|---|---|
| Scope | **Full Wallet-style budgeting**: accounts, expenses, income, transfers, categories, budgets, goals, reports, bills and subscriptions | Big product: see the phases in section 12 |
| Sign-in | **Passkeys** (Face ID, fingerprint, device PIN, security key), no passwords | Needs a domain decision and a recovery design (sections 4 and 9) |
| Data location | **Stored on our server** (Cloudflare D1), encrypted at rest by the platform, not end-to-end encrypted | The operator can technically read the data. The site and privacy policy must say so plainly |
| Reminders | **Email, web push and a live calendar feed** | Needs an email provider, a scheduler and push keys |
| Hosting | **Decision 2026-10-15: the app lives on its own GitHub organization site, `expenity.github.io`** (static app on GitHub Pages, API on a Cloudflare Worker, data in D1). Earlier the same day the decision was to stay on the shared `george-stathopoulos.github.io`; it was changed after the shared-origin risk (R1) was explained | R1 and R2 are mitigated, R3 to R7 remain; a custom domain is still the later upgrade |

**No server to run.** There is no machine to rent or maintain. The app is static files on GitHub Pages. The backend is a **Cloudflare Worker** (code that runs on Cloudflare's network on demand) with a **D1 database** (managed SQLite), both on Cloudflare's free tier to start. Cloudflare handles the hardware, scaling and TLS; the same way Mission Control already runs.

## 3. Product scope (v1)

Principles: calm, fast to enter data, honest about what it knows, same data everywhere, works offline, English and Greek, private by default.

### 3.1 Entities

| Entity | What it is | Key fields |
|---|---|---|
| **Account (wallet)** | Cash, bank account, card, savings, other | name, type, currency, opening balance, colour, icon, archived, include-in-totals |
| **Transaction** | Money moving | type (expense, income, transfer), amount, account, to-account (transfers), category, date, payee/name, note, labels, bill link, planned-from |
| **Category** | Where money goes or comes from | name (EN and EL for defaults), type (expense or income), icon, colour, parent (one level of subcategories) |
| **Budget** | A spending limit | scope (all expenses or specific categories), period (week, month, year), amount, currency, alert thresholds (80%, 100%) |
| **Goal** | A savings target | name, target, saved (from contributions), deadline, linked account (optional) |
| **Bill / subscription** | A recurring obligation (today's feature) | as in 0.1, plus the paying account; paying a bill creates an expense transaction |
| **Recurring income** | Salary and the like | schedule, amount, account; appears as "expected", confirmed with one tap |
| **Settings** | Per user | language, base currency, default reminder lead, reminder channels, time of day, time zone |

Balances are **derived, never stored**: an account's balance is its opening balance plus its transactions. That removes a whole class of sync conflicts.

### 3.2 Screens

| Screen | Content |
|---|---|
| **Overview** | Total balance (per currency or in base currency), accounts with balances, this month: income, expenses, net; budget status; next bills; top categories |
| **Transactions** | Month view, search, filter (account, category, type, label, amount range), add/edit/delete, transfers |
| **Budgets** | Progress bars, remaining, safe-to-spend per day, alerts |
| **Bills** | Today's Today view (overdue, next 7 days, later), mark paid, snooze, skip, calendar |
| **Reports** | Spending by category, income vs expenses by month, cash-flow trend, by account, by label; export CSV |
| **Goals** | Progress, contribute, projected completion date |
| **Settings** | Accounts, categories, passkeys and devices, reminders, language and theme, export, delete account |

Navigation: bottom bar on phones (Overview, Transactions, a large Add button, Budgets, More), side bar on desktop. The Add button opens a keypad-first sheet (amount first, then category and account), plus the sentence box from 0.1 (`Coffee 3.5`, `Salary 1500 income`, `Ενοίκιο 850 κάθε μήνα στις 1`).

### 3.3 Details that matter

- **Multi-currency:** each account has one currency. Totals are shown per currency. A base currency with converted totals needs daily exchange rates from a free public source, planned in phase 3 and labelled as approximate.
- **CSV import** (bank statement exports): column mapping, preview, duplicate detection by date, amount and text. No bank connections in v1: open banking is a regulated area and a separate project.
- **Planned vs actual:** recurring items create "expected" entries that never change balances until confirmed. No phantom data.
- **Labels** instead of deep category trees.
- **Receipts and AI** (later): attach a photo, read amount and merchant. Per the project rule, local AI through WebLLM is supported and recommended; a hosted model is optional and opt-in, with a clear note that the image leaves the device.
- **Guest mode stays**: using the app without an account keeps data in the browser only, with a clear banner that it is not backed up and not synced. Creating an account moves the data into it.

## 4. Accounts and sign-in: passkeys

### 4.1 Flow

- **Create account:** enter email, create a passkey (the browser shows its own prompt), **save the recovery codes**, land in the app. The email is required because reminders, recovery and notices need it. Verifying the email with a one-time code is built but **switched off until a sending domain exists** (risk R3); until then the email is marked unverified.
- **Sign in:** "Sign in with a passkey" (and browser autofill of passkeys). No password anywhere.
- **More devices:** discoverable passkeys sync through iCloud Keychain, Google Password Manager or a password manager, so a new device usually just works. Users can add more passkeys (for example a hardware key) in Settings → Devices and see or revoke sessions.
- **Recovery** (this is the part passkeys get wrong if ignored):
  1. **Recovery codes** (10, single use, shown once at sign-up, with a required "I saved them" step): the guaranteed way back in. A code lets the user register a new passkey.
  2. **Email one-time code** (once email works, risk R3) → same outcome, plus a notice email ("a new passkey was added, was this you?").
  3. Sessions of other devices are revoked when recovery happens.
- **Sensitive actions** (delete account, add a passkey, export all data) require a fresh passkey check.
- **Fallback for browsers without passkey support:** email one-time code sign-in. Small share of users, but it must exist.

### 4.2 Technical notes

- WebAuthn registration and authentication verified in the Worker with a maintained library (SimpleWebAuthn server is the candidate; confirm it runs on Workers early, as a spike).
- Credentials table: credential id, public key, counter, transports, label, created, last used.
- **RP ID is bound to a domain.** On `george-stathopoulos.github.io` it would be shared with all other projects on that host, and **passkeys created there stop working if the app ever moves to another domain.** Recommendation: **buy a custom domain before any user creates a passkey** (see section 9).
- Sessions: random bearer tokens, stored hashed, 90 days, revocable. With a custom domain and the API on a sibling subdomain, switch to HttpOnly secure cookies, which is safer than tokens kept in browser storage.

## 5. Data model and sync (drafted and tested locally)

- One table of **records** per user: kind (bill, transaction, account, category, budget, goal, settings), id, JSON data, `updated_at`, `deleted`, per-account `rev`.
- A device sends the records it changed plus the last `rev` it saw; the server keeps the newest version of each record (**last writer wins per record**), numbers accepted changes, and returns everything newer. Deletions are tombstones.
- Local-first: the app works offline from its local copy and syncs when online (after changes, on focus, every minute while visible). A small status indicator shows synced, syncing, offline or error.
- Conflicts: per record, newest wins. Derived balances remove most conflicts. Recurring-entry ids are deterministic (rule id plus date), so two devices generating the same expected entry produce the same record.
- The server also keeps a small **index of bills** (next due date, lead days, name, amount, snooze, done), extracted on write, so the scheduler and the calendar feed do not parse every user's JSON.
- Limits (to review): 20,000 records per account, 8 KB per record, 500 changes per request.
- D1 free-plan limits are far above what a few thousand users need; revisit when usage grows.

Status: the record sync, sessions, rate limiting and tests exist as a draft with **passwords**; those parts get replaced by passkeys. The sync core is kept.

## 6. Reminders when the app is closed

| Channel | How | Notes |
|---|---|---|
| **Email** | A scheduled Worker (cron trigger) finds users with bills due inside their lead time and sends one digest per day at their chosen local time | Needs an email provider (Resend free tier is the candidate) and a verified sending domain |
| **Web push** | Standard Web Push with VAPID keys; the service worker shows the notification; tapping opens the bill | Android and desktop work; **iPhone only after the app is added to the Home Screen** (iOS 16.4 and later). The app guides this |
| **Calendar feed** | A private `webcal` subscription URL per user, generated live from the bill index (events with repeat rules and alarms) | Replaces the manual .ics download. The URL is a secret: revocable, optionally hides amounts |

- Per-user settings: channels, time of day, time zone, default lead time; per-bill override.
- A notification log prevents duplicates; snooze and mark-paid are respected.
- Escalation (repeat until paid) is a later option.

## 7. Security and privacy

- HTTPS only; strict CORS to the app origin; Content-Security-Policy on the app; all user text escaped.
- No third-party trackers; anonymous visit counts only (Cloudflare Web Analytics), as today.
- Rate limits on auth, sync and email sending; email enumeration avoided on recovery.
- Data minimisation: the server stores what sync needs, nothing else; logs never contain record contents.
- **Honest privacy statement:** data is stored on Cloudflare D1 and encrypted at rest by the platform. It is not end-to-end encrypted, so the operator (George) can technically read it, and does not. Listed sub-processors: Cloudflare (hosting, database), the email provider.
- Users can **export everything** (JSON and CSV) and **delete their account** (all rows removed immediately).
- Backups: use D1's point-in-time restore; check its retention on the plan in use.
- A privacy policy and terms page are needed before public launch (not legal advice; have a professional review for GDPR).
- A possible later upgrade is an opt-in end-to-end encrypted mode; it would disable email and push content, and a lost key would mean lost data.

## 8. API (planned)

```
POST /api/auth/email/start           { email }                       -> sends a code
POST /api/auth/email/verify          { email, code }                 -> { registrationOptions }
POST /api/auth/passkey/register      { attestation, label }          -> { token, user }
POST /api/auth/passkey/options                                        -> { authenticationOptions }
POST /api/auth/passkey/verify        { assertion }                   -> { token, user }
POST /api/auth/recovery/email        { email }  /  /verify
POST /api/auth/recovery/code         { email, code }
GET/DELETE /api/devices              list and revoke sessions and passkeys
GET  /api/me     POST /api/logout
POST /api/sync                       { since, changes } -> { rev, changes, more }
GET  /api/export
DELETE /api/account                  (fresh passkey check)
PUT  /api/reminders                  channels, time, time zone
POST/DELETE /api/push/subscription
GET  /cal/<secret>.ics               live calendar feed
```

## 9. Hosting and domain: staying on github.io, and what that costs

**Decision (2026-10-15):** first "stay on `george-stathopoulos.github.io`", then, after R1 was explained, **move the app to its own GitHub organization site, `expenity.github.io`** (organization `expenity`, repository `expenity/expenity`, app at `https://expenity.github.io/expenity/app/`). The table below keeps the original risk analysis; the last column notes what the move changed.

### 9.1 Risks of staying

| # | Risk | Severity | What it means | Mitigation while on github.io |
|---|---|---|---|---|
| R1 (**mitigated by the move**) | **Shared origin with all other projects.** Every site (blog, SheetPilot, Fixpass, Gatehouse, Helpdesk Hero demo, the portfolio) lives on the same origin. Browser storage (`localStorage`, IndexedDB, service workers) and passkey requests are per origin, not per path | **High** | A script flaw on **any** of those pages could read Expenity's local data and session token, or request a passkey sign-in | Free fix: host the app as an **organization site** on its own origin, for example a GitHub organization named `expenity` with a repo `expenity.github.io` (a separate origin, still free). Until then: no user-supplied HTML anywhere on the shared origin, review third-party scripts, strict CSP on the app, keep the app's data in storage keys only the app reads (this is hygiene, not isolation) |
| R2 (**reduced by the move**: the passkey domain is now app-only) | **Passkeys are bound to the domain** (the RP ID) | **High** | If the app moves to another domain later, existing passkeys stop working there | Use a **dedicated** origin from day one if possible (R1 fix). Plan the move with WebAuthn *Related Origin Requests* (the old domain lists the new one in `/.well-known/webauthn`), and with recovery codes as the guaranteed way back in. Keep RP ID and origins in configuration, never in code |
| R3 | **No verified email sending domain** | **High for reminders and recovery** | Email providers only deliver to arbitrary users from a domain you control and have verified (SPF and DKIM). Without a domain, email reminders, email verification and email recovery **do not work for real users** | Phase 1 ships with email features behind a flag, tested with a fake mail sink. Recovery relies on **recovery codes** (mandatory download at sign-up). Email is stored but marked unverified. Web push and the calendar feed need no email |
| R4 | **Cross-site API (github.io app, workers.dev API)** | Medium | Safari and other browsers block third-party cookies, so sessions must be bearer tokens kept in browser storage, which an XSS flaw could steal | Short-lived sessions plus revocation and a device list; strict CSP; no inline scripts on the app; escape all user text. Same-site cookies need a custom domain |
| R5 | **Unverified emails allow squatting** | Medium | Anyone can sign up with someone else's address; harmless to the real owner's data, but unverified addresses must never receive reminder emails | Email reminders only to verified addresses; verification arrives with the domain |
| R6 | **Brand and trust** | Low to medium | A personal github.io path looks like a hobby project to people asked to trust it with money data | Clear honest privacy text; an own origin (R1) already looks better; a domain later |
| R7 | **Lock-in of the URL** | Low | Links in other sites, the blog and the CV point to the github.io path | Keep links in one place per site; redirects are possible from a stub page |

### 9.2 The middle path, taken (cheap, still on GitHub Pages)

The GitHub **organization** `expenity` was created and the repository moved into it, so the app is served from `expenity.github.io`, an origin shared only with other Expenity repositories. This removes R1 and shrinks R2 to a dedicated, app-only domain, for no cost. The old address (`george-stathopoulos.github.io/expenity/`) is a small redirect page. The Worker's passkey domain is `expenity.github.io` (set in `worker/wrangler.toml`).

Still true: if the app ever moves to a custom domain, existing passkeys need the Related Origin Requests plan or recovery codes (R2).

### 9.3 What a custom domain would add (for later)

| | github.io (now) | Custom domain (later) |
|---|---|---|
| Passkeys | Locked to the github.io origin | Stable, owned |
| Cookies | Cross-site, tokens in storage | Same-site HttpOnly cookies |
| Email | Not deliverable (R3) | SPF and DKIM, proper delivery |
| Look | Shared host | Own identity, for example `expenity.app` |
| Cost | Free | About 10 to 15 EUR per year |

## 10. Migration from version 0.1

- Bills stay as they are. The old `payments` become expense transactions. Local data is uploaded on first sign-in (nothing is lost, ids are kept).
- The calendar-file download stays as a fallback, next to the new feed.
- The site, docs, blog post and README are rewritten once the new version works, and say what is and is not in it.

## 11. Testing

- **API tests** exist (31 checks, local database); extended for passkey flows, devices, recovery, reminders and the calendar feed.
- **End-to-end tests** in a real browser using Chromium's virtual authenticator, so passkey sign-up and sign-in are tested for real; two simulated devices syncing; offline then online; language switching with an EN and EL key-parity check.
- **Unit tests** for recurrence, balances, budgets and the quick-add parser (English and Greek).
- Visual checks of Overview, Transactions and Budgets in light and dark, on phone and desktop.
- Reminder delivery is tested with a fake email and push sink, never real recipients.

## 12. Phases

| Phase | Contents | Risk |
|---|---|---|
| **0 Decisions** | Domain, email provider, free versus paid limits, final name check | Blocks everything |
| **1 Foundation** | Passkey accounts, recovery codes, email verification and email recovery (built, off in production), sync (kept from the draft), devices and sessions, step-up checks, guest-to-account move; accounts, categories, transactions (expense, income, transfer), Overview, Transactions screen, Insights cash flow; EN and EL. **Local only until you approve publishing** | Passkeys on Workers, recovery UX, shared-origin risk (R1) |
| **2 Budgeting and bills** | Budgets, reports, bills linked to accounts and transactions, recurring income; email digest, web push, calendar feed | Scheduler, push on iPhone |
| **3 Depth** | CSV import, goals, multi-currency with rates, labels, receipts (local AI first) | Import edge cases |
| **4 Together** | Shared households and wallets, roles | Sync permissions |

## 13. Open questions

1. ~~**Own origin**~~ Decided: the `expenity` organization and `expenity.github.io` (see section 9.2).
2. **Custom domain and email provider:** postponed. Until then email features are off in production (R3).
3. **Free or paid:** everything free, or limits (for example number of accounts, history, reminder channels) with a paid plan to cover costs? Cloudflare and email costs are tiny at first, but not zero at scale.
4. **Name:** "Expenity" suggests expenses; bills are one feature among many now. Keep, or reconsider? (Close names exist: Expeny, Expeni.)
5. **Guest mode:** keep it, or require an account from the start? (Spec says keep, because it lowers the barrier.)
6. **Launch language:** English and Greek from day one (spec) or Greek first?
7. **Target market:** Greece first, or global? This affects bank-import formats, templates (ΔΕΗ, ΕΝΦΙΑ, IRIS payment codes) and the privacy text.
8. **Who reviews privacy policy and terms** before launch?

## 14. Phase 1 implementation status (local, 2026-10-15; not published)

Built and passing its tests on a developer machine. **Nothing is deployed, pushed or published.** The public site, repository and documentation still describe version 0.1.

| Area | Status |
|---|---|
| Passkey sign-up, sign-in, discoverable passkeys | Built. Worker `worker/`, 54 API checks with a software authenticator |
| Recovery codes (10, single use, "I saved them" gate), recovery on a new device, other sessions end | Built and tested end to end in Chrome with virtual passkeys |
| Step-up passkey check for sensitive actions (add or remove a passkey, new codes, delete account) | Built |
| Devices: list and remove passkeys, list and end sessions | Built |
| Email verification and email recovery | Built, **off** until a sending domain exists (R3); tested with a test mail sink |
| Sync (last writer wins per record, tombstones, offline queue, two devices) | Built and tested end to end |
| Wallets, transactions (expense, income, transfer incl. other currency), categories (built-in and custom), balances | Built |
| Overview, Transactions (month, filters, search), Bills (list and calendar), Insights (cash flow, categories, forecast, subscriptions), Settings | Built, English and Greek |
| Guest mode, guest-to-account move, migration from 0.1 | Built and tested |
| Budgets, goals, CSV import, multi-currency totals, labels | Not started (phases 2 and 3) |
| Email, push and calendar-feed reminders | Not started (phase 2); the manual calendar file still exists |
| Households | Not started (phase 4) |

Decisions made while building (review them):

- **Passkey counters:** synced passkeys (iCloud, Google, password managers) share one credential across devices, so their sign counter can go backwards. The counter is only enforced as a clone check for single-device passkeys.
- **Recovery signs out every other session**, but each device keeps its local copy of the data.
- **Sign out removes the data from that device** (it stays in the account), after a warning if changes are unsynced.
- **A "wallet" is the user-facing word** for an account of money, so "account" always means the sign-in account.
- **Local data storage** key changed to `expenity.v2`; version 0.1 data is converted on first load.
- **Bills paid become expense transactions**, so there is one list of money movements. Undo removes the transaction again.
- **Content-Security-Policy** is set on the app (scripts only from the app itself and the visit counter).
