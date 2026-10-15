# 04 Architecture

## Guiding choices

- **Web-first PWA** so one codebase serves all devices; optional store wrappers later (Capacitor/TWA) if push reach on iOS demands it.
- **Local-first UX, server as source of truth for reminders.** The client keeps a local copy (IndexedDB) so it's instant and offline-capable, but reminders are scheduled server-side so they fire even if no device is open.
- **Boring, hosted, cheap** infrastructure to start; avoid running servers.

## Stack (proposed)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React, TypeScript), Tailwind + shadcn/ui, TanStack Query | Mature PWA support, fast iteration |
| Local store | Dexie (IndexedDB) + sync layer | Offline use, instant UI |
| Backend/DB | Supabase (Postgres, Auth, Row Level Security, Storage, Realtime) | Auth, RLS for household isolation, realtime for shared state |
| Scheduler/workers | Postgres-backed job queue (pg_cron + queue table) with Edge Functions / a small Node worker | Reliable timed delivery without extra infra |
| Push | Web Push (VAPID) via service worker | Standards-based |
| Email | Resend or Postmark; inbound email via Postmark inbound or Cloudflare Email Routing | Reminders + bill forwarding |
| Messaging | Telegram Bot API (free); Twilio for SMS/WhatsApp (metered, Pro) | Channel choice |
| AI | Server: Claude API for document extraction and NL quick-add. Client option: WebLLM in-browser | Accuracy plus privacy option |
| Payments (billing) | Stripe subscriptions | For Expenity's own plans only |
| Hosting | Vercel or Cloudflare Pages; Supabase cloud | Low ops |
| Observability | Sentry, privacy-friendly analytics (Cloudflare Web Analytics) | No invasive tracking |

## Reminder engine (the core)

Reliability is the product. Design:

1. Each **occurrence** (a specific due date of a bill) is materialised in `occurrences`, generated from the recurrence rule up to a rolling horizon (e.g. 13 months).
2. For each occurrence and each reminder step, a row in `reminder_jobs` stores `fire_at` (UTC, computed from the recipient's timezone and quiet hours), `channel`, `status`.
3. A worker runs every minute: `SELECT ... WHERE status='pending' AND fire_at <= now() FOR UPDATE SKIP LOCKED`, sends, records result in `deliveries`, and schedules the next escalation step if the occurrence is still unpaid.
4. Idempotency key `(occurrence_id, step, recipient, channel)` prevents duplicates; retries with backoff; failed push falls back to email.
5. Marking paid cancels pending jobs for that occurrence transactionally.
6. Editing a bill/rule regenerates future jobs only.
7. A watchdog alerts (to us) if jobs are lagging more than 2 minutes.
8. DST and timezone changes recompute `fire_at` for pending jobs.

## Sync & conflict model

- Client writes locally, queues mutations, replays to server via an idempotent mutation endpoint (client-generated UUIDs, `updated_at`, per-record version).
- Conflict policy: field-level last-writer-wins for scalar fields; "paid" is monotonic (paid wins over upcoming) so a payment is never lost.
- Realtime channel per household pushes changes to other open devices.

## Security & privacy

- RLS: every row carries `household_id`; policies check membership and role.
- Encryption in transit and at rest. Attachments in private storage buckets with signed URLs.
- Sensitive fields (IBAN, references, notes) optionally client-side encrypted with a household key (P2); trade-off: server-side AI parsing and email reminders can't read encrypted fields, so this is an opt-in "private mode".
- AI uploads: not used for training, deleted after extraction unless the user keeps them as attachments. WebLLM option keeps parsing entirely on-device.
- GDPR: export, deletion, data-processing record, EU region hosting, cookie-free by default, minimal analytics.
- Rate limiting, bot protection on sign-up and inbound email, secret ICS tokens that are revocable.
- No bank credentials stored. No payment processing for users' bills.

## API sketch

REST under `/api/v1`: `households`, `bills`, `occurrences`, `payments`, `reminder-rules`, `members`, `attachments`, `capture/extract`, `calendar/{token}.ics`. Auth via Supabase JWT; personal API tokens in Pro. Webhook events: `occurrence.due`, `occurrence.paid`, `occurrence.overdue`, `bill.price_changed`.

## Non-functional targets

- Reminder on-time rate ≥ 99.9% within 60s of `fire_at`.
- Availability 99.9%; RPO ≤ 5 min (point-in-time recovery), RTO ≤ 1 h.
- Core pages JS budget under 200 KB gzipped; Lighthouse PWA/perf/a11y ≥ 90.
- Tests: unit for recurrence and timezone logic (most bug-prone), integration for the job worker, Playwright end-to-end for core flows.

## Risks

- **iOS web push** needs install-to-Home-Screen and can be flaky → onboarding guidance, email/Telegram fallback, consider Capacitor wrapper.
- **Recurrence/timezone bugs** → property-based tests, use a proven RRULE library.
- **AI extraction errors** → always human-confirm; show confidence; never auto-create without review.
- **Inbound email abuse/spam** → allow-list sender after first confirmation, size limits.
