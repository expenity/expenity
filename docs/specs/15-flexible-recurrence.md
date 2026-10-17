# Flexible recurrence and sentence entry — v0.14.0

Expenses and income share the same schedule controls in entry, bill editing and recurring income editing. Existing once/weekly/biweekly/monthly/quarterly/yearly records retain their behavior.

New modes: daily; Monday–Friday; a custom interval of 1–365 days/weeks/months/years; one or more month days; a finite sorted list of calendar dates. Month-day schedules skip unavailable days (31 does not become February 28). Ordinary monthly/custom-month intervals retain the original day and clamp short months as before. Specific-date lists deduplicate dates and finish after the last occurrence. Editing shows only remaining dates so it cannot accidentally revive previously paid occurrences. Occurrence advancement, forecasts, reporting annual estimates and duplicates use the same stored metadata. Month-day annual subscription estimates use the configured count; actual dated forecasts use the recurrence engine.

Schedule metadata is stored with records and travels through existing sync/shared-wallet records. No new service or per-use charge. Recurrence never automatically marks an item paid or received.

Sentence entry is an alternate mode near the top of new expense/income entry. It hides the manual form while typing, shows a parsed summary, and requires Review details before returning to the filled form. It does not show a second name input. Closing/backing out retains entered details. English and Greek daily wording is parsed.

Targeted verification covers leap days, weekdays, month edges, custom intervals, finite dates, date sorting/deduplication, saving expenses/income, advancing received income, editing remaining dates, sentence review and EN/EL widths 320/834/1440. Public website, documentation pages and blog are not rebuilt by this app-only release.
