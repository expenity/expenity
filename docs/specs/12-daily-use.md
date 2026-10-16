# Daily use improvements — implementation scope

- Honest sync attention indicator, personal/shared pending queue, local vs online distinction, relevant retry/sign-in recovery. Server acknowledgement never implies another device has downloaded a change.
- Up to three pinned saved templates per expense/income composer, remaining templates available; never save immediately. Reuse creates today's new draft with no payment/schedule linkage or receipt photo. Expose Duplicate in touch swipe and desktop/tablet details; schedules duplicate as new editable schedules.
- Repeat beside date in the existing expense/income composer. Save creates a schedule (not a paid transaction) when repeat is enabled or date is future. All entered values remain; explicit Save and rollback on storage failure. Do not silently convert an existing transaction into a new schedule.
- Specific spending ideas link to their supporting records. Comparable windows, no transfer/goal spending, suppress claims based on missing/stale currency rates. Clearly identify the evidence and recorded-data limits.
- Categories and tags can be created/edited with bundled icon/color choices. Inline creation preserves transaction fields and does not open the keyboard automatically. Existing tag strings remain compatible; optional display metadata lives in settings.
- More groups money organisation, personalisation, account/data, and help/about. Account security sections collapse into labelled groups; destructive actions remain explicit. Author name links to the existing portfolio; blog link is accessible in Help/About.
- EN/EL, touch/mobile/tablet/desktop, no horizontal scrolling, no automatic financial commits, no new paid service. Publish the app only; public landing site/docs/blog stay unchanged.

## Approved entry grouping

Amount and description stay visible. Four icon-and-label disclosure rows show current selections: Payment (Wallet and date for income/transfers), Category and tags (Tags for transfers), Repeat for new expenses/income, and Extras. One row opens at a time. Collapsing preserves inputs; validation reveals the relevant group. Receipt scanning, attachments, notes and shortcut options live under Extras. No keyboard opens automatically. Compact default Greek bank labels use «Τράπεζα», while detailed labels and custom wallet names are preserved.

## Shared control sizing

Use shared CSS tokens for equivalent controls throughout the app: standard actions/fields 48px, or 52px on phones/coarse pointers; compact actions at least 44px; icon actions 44px/48px. Standard action icons are 20px with 8px gaps and shared padding/radius. Labels wrap rather than overflow. Explicit action stacks give related actions equal full-row widths, including receipt scanning and image attachment. Width follows role: icon buttons stay square, inline actions fit content, stacked actions fill their container. Do not force every control to one width.
