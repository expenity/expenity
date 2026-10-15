# 03 UX & design

## Principles

1. **Calm, not alarming.** Bills are stressful; the UI should be quiet, spacious, and reassuring. Red only for genuinely overdue.
2. **Zero-to-three-bills in two minutes.** Onboarding is one screen with quick add and templates, not a form wizard.
3. **One tap for the common action.** Mark paid and snooze are always reachable from the list, notification and detail.
4. **Phone first, desktop good.** Bottom tab bar on mobile; sidebar plus two-pane layout on desktop.
5. **Modern feel.** Soft surfaces, large type for amounts, tabular numerals, subtle motion, true dark mode, haptics where supported. Own visual identity (not the yellow-bee look).

## Information architecture

- **Today** (home): hero card "Due in the next 7 days: €432", overdue strip, list grouped by day, swipe right = paid, swipe left = snooze.
- **Calendar**: month grid with dots + agenda below; toggle to timeline forecast.
- **Add** (centre button): quick-add text field, camera/upload, templates, forward-by-email hint.
- **Insights**: spending by category, subscriptions, detected changes.
- **Household**: members, categories, reminder defaults, channels, calendar feed, export/delete.

## Key screens

**Onboarding:** pick country/currency (auto-detected) → choose templates or type first bill → choose reminder channel (push button explains iOS install step; email as fallback) → done, land on Today.

**Quick add:** single input with live parsed chips (name, amount, date, repeat) the user can tap to correct; "More options" expands the full form.

**Bill detail:** big amount, due date and status; primary button *Mark paid*; Pay link + copy reference; schedule; reminder timeline preview ("Mon 9:00 push, Wed 9:00 email"); payment history sparkline; attachments; activity.

**Mark paid sheet:** pre-filled actual amount (editable), date (today), optional receipt photo. Confirmation with brief celebratory micro-animation.

**Reminder rule editor:** visual timeline with draggable steps; channel icon per step; "repeat until paid" toggle.

**Review draft (AI capture):** original document on one side, extracted fields on the other with per-field confidence; low-confidence fields highlighted.

**Forecast:** area chart of cumulative outflow for 30/60/90 days, tap a day to see bills; optional "balance" line that turns amber where it would dip below zero.

## States & edge cases

- Empty states teach (templates, import) rather than just say "nothing here".
- Offline banner; edits queued with a small sync indicator.
- Notification permission denied: persistent but dismissible nudge to enable email.
- Variable/unknown amount shows "~€60" estimate styling.
- Time zones: due dates are calendar dates, reminders are computed in the recipient's timezone.

## Visual system (starting point)

- Type: a clean variable sans (e.g. Inter or Geist), tabular figures for money.
- Colour: neutral base, one confident accent, semantic status colours (upcoming, due, overdue, paid) that also differ by icon/shape, not colour alone.
- Components: cards with 16px radius, bottom sheets on mobile / popovers on desktop, command palette (⌘K) on desktop.
- Category icons: a consistent single-style set (more than 30), user-extensible with emoji.

## Accessibility & i18n

Keyboard-complete, screen-reader labels for all swipe actions (alternative buttons), 4.5:1 contrast, 44px touch targets, text scaling to 200%, ICU message formats, locale-aware currency/date, RTL layout support.
