# 02 Requirements

Priority: **P0** = MVP, **P1** = v1.x, **P2** = later.

## 1. Accounts & workspaces

| ID | Requirement | Pri |
|---|---|---|
| A1 | Sign up/in with email magic link, Google, Apple. No password required | P0 |
| A2 | Guest mode: use the app locally with no account; upgrade to account later and keep data | P0 |
| A3 | A **Household** (workspace) holds all bills; a user can belong to several (e.g. "Home", "My business") | P0 |
| A4 | Invite members by link/email; roles: Owner, Member, Viewer | P1 |
| A5 | In-app data export (JSON/CSV) and one-click account deletion | P0 |

## 2. Bills & payments

| ID | Requirement | Pri |
|---|---|---|
| B1 | Create a bill: name, amount (fixed / variable / unknown), currency, due date, category, notes, payee, payment link, reference/IBAN, assignee | P0 |
| B2 | Recurrence: daily/weekly/monthly/quarterly/yearly/custom (RRULE), end date or count, "last working day", "nth weekday" | P0 |
| B3 | Installments: N payments with a running "3 of 12" counter and remaining balance | P1 |
| B4 | Status per occurrence: Upcoming, Due today, Overdue, Paid, Skipped | P0 |
| B5 | **Mark paid** with date, actual amount, optional receipt attachment; next occurrence generated automatically | P0 |
| B6 | Variable-amount bills: show estimate from last N payments, flag when actual differs by more than X% | P1 |
| B7 | Autopay flag: bill is paid automatically; reminder becomes "check it went through" | P1 |
| B8 | Bulk actions: multi-select to mark paid, move category, change reminder rule, delete | P0 |
| B9 | Undo for destructive actions (soft delete, 30 days) | P0 |
| B10 | Multi-currency per bill with a base currency for totals; daily FX rates | P1 |

## 3. Reminders

| ID | Requirement | Pri |
|---|---|---|
| R1 | Reminder rules per bill with defaults at household level: offsets in minutes/hours/days before due | P0 |
| R2 | Channels: web push (PWA), email | P0 |
| R3 | Channels: Telegram bot, WhatsApp/SMS (Pro, metered) | P1 |
| R4 | **Escalation:** repeat until paid at a chosen interval; channel can change per step | P1 |
| R5 | Actions inside notification: Mark paid, Snooze (1h / tomorrow / custom) | P0 (push), P1 (email links) |
| R6 | Quiet hours and per-member timezone handling | P0 |
| R7 | Daily/weekly digest ("This week: 4 bills, 312 EUR") | P1 |
| R8 | Reliability: every reminder is delivered at-least-once and de-duplicated; delivery log visible per bill | P0 |

## 4. Capture (adding bills without typing)

| ID | Requirement | Pri |
|---|---|---|
| C1 | Quick add: type "Netflix 15.99 monthly on the 3rd" and natural-language parsing fills the form | P0 |
| C2 | Upload PDF/photo of a bill, AI extracts fields, user reviews and confirms | P1 |
| C3 | Personal forwarding address (`name@in.duenest.app`); forwarded emails create draft bills | P1 |
| C4 | Import from CSV / bank statement export; detect recurring charges and propose bills | P1 |
| C5 | Templates for common bills (rent, electricity, car insurance, Netflix…), localised | P0 |
| C6 | AI processing runs locally in the browser (WebLLM) when the user chooses; otherwise server-side with a clear data note | P1 |

## 5. Views & insights

| ID | Requirement | Pri |
|---|---|---|
| V1 | **Home / Today:** overdue, due this week, recently paid, total due | P0 |
| V2 | **Calendar:** month and agenda views, colour by category/status | P0 |
| V3 | **Timeline forecast:** next 30/60/90 days with cumulative total and optional balance line | P1 |
| V4 | Category and monthly/yearly spending charts (paid history) | P0 |
| V5 | Subscription view: annualised cost, next charge, cancel link, "last used" note | P1 |
| V6 | Insights: price increase detected, duplicate subscription, unusually high bill, upcoming big month | P1 |
| V7 | Search, filter (category, assignee, status, tag) and saved views | P0 |

## 6. Collaboration

| ID | Requirement | Pri |
|---|---|---|
| H1 | Assign bill to a member; reminders go to the assignee (and optionally everyone) | P1 |
| H2 | Activity feed: who added/paid/changed what | P1 |
| H3 | Comments on a bill ("paid in cash", "disputed with provider") | P2 |

## 7. Integrations

| ID | Requirement | Pri |
|---|---|---|
| I1 | Read-only ICS calendar feed per household (secret URL, revocable) | P0 |
| I2 | Webhooks + REST API with personal tokens | P2 |
| I3 | Zapier/Make connector | P2 |
| I4 | Open-banking account link to auto-detect payments | P2 |

## 8. Platform & quality

| ID | Requirement | Pri |
|---|---|---|
| Q1 | Installable PWA; responsive from 320px phone to desktop | P0 |
| Q2 | Offline: view and edit while offline; changes sync on reconnect with conflict handling | P0 |
| Q3 | Localisation from day one (i18n keys, RTL-ready, locale-aware dates/currency); launch EN + EL, grow toward 17+ | P0 |
| Q4 | Accessibility WCAG 2.2 AA, dark mode, reduced motion | P0 |
| Q5 | Performance: first load under 2s on mid-range phone over 4G; interactions under 100ms | P0 |
| Q6 | iOS note: web push requires the PWA be installed to the Home Screen (iOS 16.4+); onboarding must guide this, and email is the fallback | P0 |

## Key user stories & acceptance criteria

**Add a recurring bill fast.** As a user I type "Rent 850 monthly on the 1st" and see a pre-filled form; saving it creates the next 12 occurrences' worth of schedule and a default reminder. *Done when:* form fills correctly for 10 sample phrases in EN and EL, and saving takes two taps.

**Never miss it.** As a user, if I don't mark a bill paid, I'm reminded again at my escalation interval until I do. *Done when:* a test bill escalates push → email → push on schedule, stops immediately after "paid" from any device.

**Pay from the reminder.** Notification shows name + amount with Mark paid / Snooze; tapping the body opens the bill with pay link and reference copy buttons.

**Household.** Partner joins via link, sees shared bills, gets only those assigned to them; marking paid by either updates both within seconds.

**Leave cleanly.** Export downloads everything in one file; delete removes all server data within 24h and confirms by email.

## MVP scope (Phase 1)

A1, A2, A3, A5, B1, B2, B4, B5, B8, B9, R1, R2, R5(push), R6, R8, C1, C5, V1, V2, V4, V7, I1, Q1–Q6.
