# Scan shortcut, complete schedule controls and catalog — v0.15.0

## Add gesture

Short tap on the primary + opens Add. Holding for one second arms receipt capture with a circular progress cue, temporary camera icon and optional haptic. Release opens the camera file chooser inside the initiating user gesture, which is important for browser capture permission behavior. Browsers may show their own capture/library chooser. Cancel, moving more than 12px or leaving the button cancels without opening a menu. The resulting click is suppressed after a long/cancelled gesture. A one-time localized hint and the Add-menu Scan receipt fallback keep it discoverable and keyboard accessible. Scanner-off disables the shortcut and fallback. Home editor explicitly excludes Add; scanning does not save financial records automatically.

## Scheduling

Shared controls across new entry, bill editing and recurring income support daily, weekdays, selected weekly days, existing fortnightly/monthly/quarterly/yearly, custom intervals, selected month days and a finite calendar date list. Calendar date selection is an explicit mode and never infers a frequency. An optional native date picker is also available. Live preview shows a plain-language schedule and next three actual dates.

Ending rules: never, on a date, or after 1–1000 remaining occurrences. Occurrence-count schedules store the computed final date so payment advancement, skip, undo and forecasts share a stable boundary. When editing, show only the occurrences remaining to that boundary. Short-month rules explicitly offer last-day adjustment or skipping. Existing monthly records retain last-day behavior, existing month-day records retain skipping by default. Existing day anchors survive short months. Start-date changes update previews to the new anchor.

## Catalog

34 additional expense categories and six income categories, including common building charges, ENFIA property tax, vehicle circulation tax, EFKA contributions and private lessons. All built-in labels have English and Greek translations. Expandable semantic groups keep category pickers manageable. The Categories settings screen exposes a collapsed read-only built-in catalog alongside editable user categories.

29 optional service/bill-name presets cover Google, entertainment, work/storage and Greek services. Presets fill name/category only, never a price, billing frequency or paid state. No logo downloads, external API, integration or recommendation is implied. 37 additional Tabler outline icons are bundled locally. The shared category/tag picker starts compact and expands for the full library; current selection stays visible. New assets retain Tabler MIT licensing.

## Character and theme corrections

A character is revealed once per selected theme per window/app session. A sessionStorage marker survives navigation and refresh; changing to another theme can reveal that theme once. After flipping or revisiting, it stays hidden and the top gap stays collapsed. A fresh window/session may show it again. No daily clock-based quota.

Mickey/Minnie layered dotted backgrounds remain valid under appearance color overrides by using a gradient image layer rather than a bare color in background-image. Gentle dot drift is independent of character reveal and disabled by reduced/off motion.

## Validation and release scope

Targeted browser checks cover calendar engine and ending boundaries, weekday choices, remaining counts on edits, actual camera chooser triggering, short tap, drag cancellation, editor exclusion, scanner toggle, session/reload persistence, preset field preservation, icon availability, theme dot layers and EN/EL phone/tablet/desktop overflow. Public site, published docs and blog are unchanged; both app URLs receive the same release.
