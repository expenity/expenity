# 01 Product brief

> **Name:** earlier working names "Duewise" and "Duenest" were dropped (an iOS app called "Bill Organizer - DueWise" exists, found in a web search on 2026-10-15). The product is called **Expenity**. A web search on 2026-10-15 found no product called Expenity, but close names exist: "Expeny" (an iOS personal finance app) and "Expeni" (procurement software). That was a quick search, not a trademark check; check before any serious launch.
> **Build status:** version 0.1 is a browser-only app (see the repository README). This spec describes the full vision, including the server-side parts (sync, push and email reminders, households, bill capture) that are not built yet.

## Reference product: RemindPayBee

Source: remindpaybee.com (the Play Store listing could not be fetched, so store ratings and reviews are not analysed here; do that manually before launch).

**What it does:** tracks bills, payments and subscriptions, groups them by category, sends reminders (set in days, hours or minutes before), supports recurring payments with bulk management, shows monthly/yearly spending charts, multi-currency, 17 languages, themes and icons.

**What it deliberately does:** stores everything on the device only. No account, no cloud sync, no analytics.

### Gaps we can exploit

| Gap | Consequence for users |
|---|---|
| Android only, device-local data | Lose phone = lose data. No iPhone, no laptop, no partner access |
| Manual entry of every bill | Tedious setup; people abandon trackers |
| Reminders are notifications only | Missed if notifications are muted; no escalation |
| No "paid" workflow beyond the reminder | No history proof, no link to pay |
| No shared households | Couples/families can't split who pays what |
| Charts only look backward | No forecast of upcoming cash outflow |
| Data deletion by email | Weak privacy UX |

## Vision

> Never miss a payment, never be surprised by a charge, and never type a bill in by hand.

## Target users

1. **Households** (couples, families, flatmates) juggling rent, utilities, insurance, school fees, loans.
2. **Subscription-heavy individuals** who want to see and trim recurring charges.
3. **Freelancers / sole traders** tracking invoices they owe and tax dates.
4. **Helpers of others** (adult children managing a parent's bills) who need shared access and read-only/proxy roles.

## Differentiators (the "better, more modern, more innovative" part)

1. **Works everywhere, one account.** Installable PWA; same data on phone, tablet, desktop; offline-capable with sync.
2. **Add bills without typing.** Upload/photo a bill or forward the bill email to a personal inbox address; AI extracts payee, amount, due date, IBAN/reference, and recurrence. User confirms with one tap.
3. **Reminders that escalate.** Rules like "7 days before by push, 2 days before by email, on the day by SMS/Telegram, and nag until marked paid". Snooze and "mark paid" directly from the notification.
4. **Cash-flow forecast.** Calendar and "next 30/60/90 days" timeline with a running total, plus a safe-to-spend view against an optional balance the user enters.
5. **Shared households.** Invite members; assign who pays each bill; see who marked it paid; per-bill and per-member notifications.
6. **Smart insights.** Detects price increases versus the previous bill, duplicate subscriptions, unused/forgotten recurring items, and annualised cost of subscriptions.
7. **Pay-now shortcuts.** Per-bill payment link (bank portal, PayPal, card portal) and copyable reference/IBAN. We never move money.
8. **Privacy-first.** No ads, no data selling, no bank login required. Optional on-device AI via WebLLM (in-browser) for bill parsing so documents need not leave the device. One-click export and full account deletion in-app.
9. **Calendar and automation hooks.** Live ICS feed for Google/Apple/Outlook calendars; webhooks and an API for power users (Pro).

## Non-goals (v1)

- Moving money or acting as a payment processor.
- Open-banking account connections (considered for a later phase).
- Full budgeting / expense tracking (we are forward-looking obligations, not a ledger).

## Positioning

"The calm bill calendar for your household." Simple on first use (add three bills in under two minutes), powerful when you want it.
