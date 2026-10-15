# 06 Roadmap & business

## Phases

**Phase 0: Validate (1–2 weeks).** Pull Play Store reviews of RemindPayBee and 3–4 rivals (Bill Reminder apps, Subby, Bobby, Mint-style trackers) and list top complaints; landing page with waitlist; 5–10 user interviews (households, subscription-heavy people).

**Phase 1: MVP (6–8 weeks).** Scope in `02-requirements.md`. Accounts + guest mode, bills/recurrence, Today + Calendar, push + email reminders with mark-paid/snooze, quick add (NL), templates, ICS feed, export/delete, EN + EL, PWA offline. Private beta with 20–50 users; measure reminder reliability.

**Phase 2: Smart (6–8 weeks).** AI capture (upload, forward email, CSV import), households with roles and assignees, escalation, Telegram, digests, forecast timeline, price-increase and duplicate-subscription insights, WebLLM local parsing option, more languages. Launch Pro plan.

**Phase 3: Grow.** WhatsApp/SMS, API + webhooks, Zapier, installments, FX, encrypted private mode, Capacitor wrappers for store presence, open-banking pilot, partner/affiliate "cheaper provider" suggestions (opt-in, clearly labelled).

## Pricing hypothesis

| | Free | Pro (~€3–4/mo or ~€30/yr) |
|---|---|---|
| Bills | Up to 15 | Unlimited |
| Households | 1, 2 members | Multiple, up to 6 members |
| Channels | Push, email | + Telegram, SMS/WhatsApp credits |
| Escalation, digests | Basic | Full |
| AI capture | 5/month | Generous |
| Forecast, insights | Basic | Full |
| API/webhooks, attachments | — | Yes |

No ads, ever. Free tier must remain genuinely useful (it is the growth engine).

## Success metrics

- Activation: ≥ 60% of sign-ups add 3 bills in first session.
- Retention: week-4 retention ≥ 40%.
- Reliability: reminders on time ≥ 99.9%; zero known missed reminders per month.
- Core outcome: percentage of reminded bills marked paid before due date (target ≥ 85%).
- Conversion: free→Pro 4–6%.

## Risks

| Risk | Mitigation |
|---|---|
| iOS push friction | Install guidance, email/Telegram fallback, wrapper later |
| Crowded category | Win on capture automation, escalation reliability, household sharing |
| AI cost per capture | Cache, limit on Free, local WebLLM option |
| Trust (people hand over bill details) | Clear privacy stance, export/delete, no bank login, EU hosting |
| Reminder failures damage trust | Watchdog, delivery log, multi-channel fallback |

## Open questions for George

1. **Name:** keep "Expenity" as a working name, or choose another (domain/handle check needed)?
2. **Audience & market:** global English first, or Greece/EU first (EL + EN launch, local bill templates and payment-code formats like Greek IRIS/RF references)?
3. **Local-first vs account-first:** spec assumes accounts with sync plus guest mode; is "no account ever" a must?
4. **Monetisation:** free + Pro as above, or fully free/open-source with donations?
5. **Repo model:** per your usual rule, public repo for the free app and private for Pro features, site on gh-pages; confirm.
6. **Stack comfort:** Next.js + Supabase proposed; any preference (e.g. staying with WordPress-free plain stack, Cloudflare-only)?
