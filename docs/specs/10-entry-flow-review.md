# 10 — Add menu and money-entry flow

Date: 2026-10-16  
Baseline: published app 0.8.0, source commit `2c593e3`.  
Status: consolidated specification for a prototype and review. These changes are not implemented by this document.  
Scope: app UX only. No website, public documentation, blog, onboarding rebuild, dashboard-editor change, or navigation rebuild is authorized by this specification alone.

## 1. Purpose and confidence

Make adding money records understandable, predictable and comfortable on phones, without hiding useful features merely to make the screen look minimal. Support tablet, desktop, browser and installed-app use, in English and Greek.

This document consolidates the discussion, the second review, the concept image and all subsequent corrections. Where an earlier proposal conflicts with this document, this document wins for this flow. Older specs 08 and 09 remain historical; their automatic-keypad, horizontal-category-scrolling and top-checkmark instructions do not govern this redesign.

The direction is ready to prototype, not proven more usable. Specific menu proportions and category suggestions need hands-on comparison. The generated concept image illustrates a direction, not exact implementation requirements.

## 2. Observations against the current app

Source references are relative to the repository root.

- `forms.js`, `EXA.openAdd`: + opens four large tiles: Expense, Income, Transfer and Bill. All four capabilities already exist. The proposal changes presentation, not availability.
- `forms.js`, `txBody`: the next screen repeats Expense / Income / Transfer as large tabs. It shows amount, name, remember-name control, sentence entry, a category grid, wallet choices, date, tags, photo and notes. This exposes many choices together.
- `forms.js`, `EXA.openTx`: input already starts closed (`keypadOpen: false`). Preserve that fix. New transactions use the first writable wallet and, when no category was supplied, the first category. Neither list position is an intentional user preference.
- `forms.js`, `catGrid`: the current grid already wraps, has a visible expand/collapse tile and keeps a selected category visible. The redesign must preserve those strengths, not reintroduce sideways scrolling.
- `forms.js`, `txBody` and `setKeypad`: an amount Done button closes the custom keypad; a separate top-right checkmark saves the entry. The distinction exists in behavior but is not clear enough visually.
- `core.js`, `EX.savedNames` / `EX.rememberName`: saved entries currently contain type, name and category, not optional amount or wallet. Richer shortcuts would be an extension, not just a label change.
- `forms.js`, `saveTx`: blank names are already accepted. New transactions get a generated ID and an informational toast, without an Undo callback. Do not describe creation Undo as already implemented.
- `forms.js`, `EXA.openBill`: bills already have repeat/reminder controls and a notification-readiness notice. Preserve their behavior and notice.
- `views.js`, `EXA.tabbar`: Home / Activity / + / Bills / Reports is the mobile navigation. Budgets & goals is accessible through Home and More. This proposal does not replace that navigation.
- `views.js`, `EXA.home`: urgent or overdue bills move ahead of wallets when due within two days; balance stays first unless the user customizes the layout. Preserve the existing rule and saved Home layout.
- `views.js`, `EXA.activity`: recurring income is already under Activity → Income. Keep that home for schedules.

## 3. Final decisions and superseded proposals

### Keep

- A global + menu containing four explicit actions, in a fixed order.
- Amount-first entry; wallet and currency are visible alongside it.
- No keyboard or custom keypad until the user taps its associated field.
- Separate input confirmation from transaction submission.
- A labelled bottom Save action, visible category suggestions and compact optional-detail actions.
- Distinct records for completed transactions and expected payments/income.
- Phone-first layouts, full English/Greek separation, accessible targets and reduced-motion support.

### Replace or withdraw

- Withdraw “+ always opens Expense”. It hides the scope of the global action behind one assumed intent.
- Withdraw a context-changing global + menu. Its action order and labels stay the same on every screen.
- Replace the large three-way selector after menu selection with a screen title and a smaller Change type action.
- Withdraw hiding every category behind a single selector. Keep useful suggestions visible.
- Replace arbitrary first-category selection with an explicit choice, a transparent suggestion, or Uncategorized.
- Withdraw putting wallet below the name. Show wallet and its currency with the amount.
- Withdraw placing Photo, Tags and Note inside a generic More section. They remain visible as labelled actions.
- Withdraw making rich shortcuts a replacement for saved names. Keep simple name reuse; additional remembered values are optional.
- Withdraw a generic Repeat toggle that might silently record future transactions. Open an explicitly labelled scheduling flow instead.
- Withdraw blanket discard confirmations. Warn only when meaningful input would be lost.
- Do not rebuild the main navigation to accommodate this form redesign.

### Correct the concept image

- EUR is a read-only currency indicator derived from the wallet, not an independent currency dropdown.
- Expense is not preselected or outlined as active in the + menu.
- Use the short menu label Bill, with an explanation below it, rather than “Bill / payment reminder”.
- Save for next time is a separate comfortably tappable control, not tiny text squeezed into the name field.
- The modal sheet covers or makes the underlying bottom navigation inert; it must not remain an active competing control.
- No new mountain illustration or animated scenery is required. The entry form inherits the chosen theme with restrained decoration.
- The category strip means three suggested categories plus All categories on a typical phone: four controls total. It is not a requirement to fit four category suggestions plus a fifth control in one row.

## 4. Global + menu

Tap global + → one compact bottom sheet. Four full-width rows, in this fixed order:

1. Expense — Record money spent.
2. Income — Record money received.
3. Transfer — Move between wallets.
4. Bill — Schedule something to pay.

Each row has a consistent outline icon in a coloured circle, a label, short explanation and a clear action affordance. Colour is supplemental; it never replaces text. No row appears selected before choosing it. Do not use a miniature overflow menu to conceal any of these four actions.

The sheet has a title, close control, accessible focus handling and ordinary back-button behavior. It blocks interaction with the page behind it. Rows have at least 44 × 44 CSS px touch targets, aiming for 48 px, with comfortable spacing. The sheet must fit small phones without clipping; long translations wrap and, if necessary, the sheet scrolls vertically.

Context-specific Add controls can prefill their own flow, such as Add expense within a wallet. This does not change global + behavior. Global + uses an explicit user default wallet, not an incidental last-open screen.

## 5. Expense and income composer

Menu selection opens a single composer in the existing app shell/sheet system. Phone uses a full-height sheet; tablet and desktop use a bounded layout with the same field hierarchy, not a stretched phone form.

Field order:

1. Header: close, Add expense or Add income, and Change type.
2. Amount area: selected wallet, currency indicator and large tappable amount.
3. Name, visibly optional, with relevant saved-name suggestions.
4. Category suggestions and All categories.
5. Date, visibly Today initially; tapping exposes Yesterday and a date picker.
6. Labelled actions: Photo, Tags, Note, More.
7. Full-width primary Save expense or Save income action in a bottom action area.

The form is one screen with expandable details, not a forced multi-step wizard. Users can visit fields in any order. Amount is positive; type determines money direction. Currency comes from the selected wallet. Default app currency remains EUR; this must not overwrite an existing wallet’s different currency.

Changing wallet updates the currency indicator but never silently converts a typed amount. If currencies differ and an amount was entered, explain that the number is being retained in the new currency and require review before saving. Alternatively let the user cancel the wallet change. The prototype must make the resulting amount unambiguous.

## 6. Wallet defaults, sharing and permissions

- A wallet-specific Add control preselects that wallet, provided it is writable.
- Global + uses the user’s explicitly selected default writable wallet. If no default exists and only one writable wallet is available, use it.
- If multiple writable wallets exist without a default, show Choose wallet and require selection; do not infer a preference from list order.
- Provide a way to set/change the default within the wallet selection flow or existing wallet settings. Its persistence and sync are part of this feature.
- Shared wallets carry a visible Shared label, with wallet identity clear before saving. Permission state must not rely on colour alone.
- View-only, archived or inaccessible wallets cannot be chosen for new records. Preserve historical wallet identity when inspecting existing records.
- If permissions change while a draft is open or during sync, preserve the draft, explain the failure, and offer a valid wallet or retry as appropriate. Never show a rejected shared record as successfully synced.
- A shortcut referencing an unavailable wallet asks for a replacement; it must not quietly redirect spending to another wallet.

## 7. Category selection

Show up to three relevant category suggestions plus All categories on a typical phone. Relevance can come from an explicitly selected saved shortcut, the current name, or recent categories of the same transaction type. Suggestions are not a claim of accurate automatic categorisation.

A saved shortcut’s category can prefill the selection because the user deliberately selected that shortcut. A name-based guess is visibly marked as suggested and is not silently committed. Explicit user choices are never overwritten by subsequent name edits.

When no category has been deliberately chosen, show Choose category. Offer an explicit Uncategorized choice in the category picker; do not force a false category to complete the record. The data/report representation of Uncategorized must be defined before implementation, without changing historical categories.

The selected category stays visible even if it is not in the suggestion set. All categories opens a labelled, searchable or expandable wrapping grid. Long Greek labels wrap; no horizontal scroller is introduced. Category creation and custom category icons remain accessible.

## 8. Name reuse and optional shortcuts

Name remains optional. A record can be saved with amount, valid wallet/date and an explicit category or Uncategorized choice. Activity may use the category label as its display fallback, without pretending the user entered a name.

- Show saved suggestions only when relevant or explicitly expanded. Free typing remains clearly available.
- Once a non-empty name exists, show a separate Save for next time control near it. Never use tiny inline text inside the name input.
- Basic reuse stores name and category, preserving current capability.
- An optional richer shortcut may also remember wallet and/or amount. Those opt-ins are explicit and off by default. Date is Today for a new record; do not reuse an old transaction date.
- Selecting a shortcut fills an editable draft only; it never creates a transaction automatically.
- Wallet, category and amount remain editable. If applying a shortcut would overwrite meaningful draft values, preview or explicitly confirm the replacement.
- Retain an accessible way to manage/forget saved names. Do not make deleting a shortcut the primary action next to every suggested entry.

## 9. Photo, Tags, Note and More

Keep four labelled actions visible below date. They can wrap into two rows when required. Each opens or expands its own controls, preserving draft state.

After adding details, show their state: photo thumbnail or count as supported by the data model, selected tag labels with a collapsed count if necessary, and a note-present indicator/preview. Do not imply multiple photos are supported if the implementation still allows only one.

More contains less frequent actions, including Save as richer shortcut, the existing Type it instead sentence-entry method, and links into scheduling. Sentence entry remains optional and must show parsed values for review rather than silently submitting them. Existing photo compression, image preview, tag creation/library and note editing must remain available.

## 10. Keyboards, Done and Save

No editable field is auto-focused on opening, including desktop: opening a form does not imply that typing should start. Tapping the amount opens the custom numeric keypad. Tapping text opens the device keyboard. They never appear together.

Done next to the active input means finish editing that input and dismiss its keyboard/keypad. It does not save the record. Read the latest typed value before dismissing input.

Save expense / Save income / Save transfer commits the draft. Labels use the correct type and locale. While input is open, the Save action remains reachable above the keyboard/keypad and cannot cover fields or the input Done control. Use visual-viewport behavior and safe-area insets; the layout may scroll vertically. Validate this on an actual phone, not only viewport emulation.

Keep the primary action visually clear even when the keypad is closed. No second top-right save checkmark. Editing an existing transaction uses an explicit Save changes label and preserves linked bill/income/goal metadata.

## 11. Completed records versus schedules

Expense and Income record completed money movement. Bill and Recurring income represent expected future movement. Selecting a future date must not silently change one meaning into the other; offer an explicit scheduling route instead of recording unreceived or unpaid money as completed.

- Bill has name, amount, wallet, due date, repeat and reminder controls. Preserve the notice when notification permission/subscription is not ready; do not imply a reminder will arrive when delivery is unavailable.
- Recurring income stays under Activity → Income, with a clearly labelled action to add a schedule there.
- Repeat this… from a transaction opens the matching scheduling form, prefilled for review, with explicit next date and frequency.
- Show Schedule bill / Schedule income for schedule creation. Creating a schedule does not add a completed payment or receipt or change the current balance.
- Mark paid / Record received creates the linked transaction through the existing schedule logic. Preserve history reversal and linked-occurrence integrity.
- Automatic posting, if offered in future, requires a separately specified explicit opt-in. It is not introduced by this flow.

## 12. Transfer-specific composer

Transfer has its own content hierarchy under the same shell:

1. From wallet → To wallet, clearly labelled, with a swap control.
2. Amount sent and source currency.
3. Amount received and destination currency when currencies differ.
4. Date, optional name/note/tags/photo where supported, and Save transfer.

Do not show expense categories, income categories or recurring-payment controls on transfers. Validate distinct writable wallets and existing shared-space restrictions. Do not guess or silently apply an exchange rate. Both sides must save as one logical transfer; retries and Undo must not leave one side behind.

## 13. Draft lifecycle and changing type

Maintain one draft state independent of the currently displayed field controls. Opening category choices, photo picking, tags, notes or the type selector does not discard values or reset scroll unnecessarily.

Drafts survive ordinary backgrounding, returning from the photo picker, connectivity interruptions and a routine app reload/update where technically feasible. Store unfinished drafts locally, scoped to the active account (or guest profile), rather than in shared financial records. Clear or isolate them on logout/account change so another user cannot see them. Define retention and photo cleanup before shipping; do not leak unused draft photos or promise recovery from browser storage eviction.

Change type presents explicit options. Preserve compatible fields. Before removing incompatible meaningful values, explain what will change and allow cancellation. Transfer wallet pairs and received amounts must not disappear silently; preserve a per-type draft or obtain an explicit discard decision. Never reinterpret a numeric amount’s currency without review.

An untouched form closes immediately. A form with meaningful unsaved input offers Keep editing / Discard. Backgrounding or choosing another field never raises a discard warning. Close, browser Back and Escape follow the same policy; account for the browser’s native limitations on tab/app termination.

## 14. Saving, validation, sync and Undo

Validate at the field, not only in a generic error at the end of the form. Bring the first invalid field into view, give a readable text explanation and accessible error association, and preserve every other value.

Assign a stable logical record ID per submission attempt, lock repeated submission while saving, and reuse that identity on retry. Verify existing client/sync behavior before assuming server idempotency; add support if required. Do not generate a new transaction on every retry.

Distinguish these states:

- Not saved: persistence failed; retain the draft and offer retry.
- Saved on this device, awaiting sync: local persistence succeeded; no need to re-enter the record.
- Synced: acknowledged by the sync service.
- Sync rejected or conflicting: retain data and explain the resolution; do not claim completion.

Keep detailed sync information in the existing unobtrusive status area or transaction details. It must remain findable, but must not turn every save into an interrupting modal.

A successful new transaction offers the existing compact Undo-style toast with only the Undo wording, following the user’s established preference. Persistence/sync status is shown separately. The generated mockup must not introduce a long success sentence into that toast.

Undo targets the exact newly created record, not a snapshot of the entire account state. Preserve unrelated transactions and shared-wallet updates. Use current permissions and linked-record rules; if the record has since changed or Undo is no longer safe, explain and offer review rather than overwriting newer work. Transfers reverse atomically. Scheduled payment/income reversal continues to update its corresponding occurrence correctly. Existing history-based reversal remains available after the transient toast expires.

## 15. Localization, accessibility, themes and motion

Build English and Greek together, including menu explanations, error messages, keyboard confirmation, scheduling language, shared-wallet badges and sync state. User-entered names retain their own text; interface strings follow the selected language. Do not translate or replace the user’s own data.

Proposed core labels for review:

- Expense / Έξοδο; Income / Έσοδο; Transfer / Μεταφορά; Bill / Λογαριασμός.
- Add expense / Προσθήκη εξόδου; Change type / Αλλαγή τύπου.
- Save expense / Αποθήκευση εξόδου; Save income / Αποθήκευση εσόδου; Save transfer / Αποθήκευση μεταφοράς.
- Save for next time / Αποθήκευση για επόμενη φορά.
- All categories / Όλες οι κατηγορίες; Choose category / Επιλογή κατηγορίας.
- Uncategorized / Χωρίς κατηγορία; Shared / Κοινόχρηστο.

Greek wording is a review item, not a claim of native-user approval. Currency formatting and decimal input follow locale; numeric data remain consistent internally. Labels wrap or controls use additional rows, never sideways scrolling or unusably small text.

Keep stable field labels, keyboard access, focus return from child pickers and announced validation. Modal background is inert. Icons have text labels or accessible names; colour alone never communicates status. At least 44 px touch targets, aiming for 48 px, include the shortcut control, Change type, close and picker actions.

The composer inherits every template/custom theme with readable contrast. Preserve Synthwave colours but avoid scenery, falling trails, balance flips, moving input values or distracting ambient effects inside the composer. Short functional transitions are optional and follow the existing motion setting and device reduced-motion preference.

## 16. Navigation and Home boundaries

Keep Home / Activity / + / Bills / Reports on phones. Keep existing tablet/desktop navigation. No extra tab is introduced here.

- Home summarizes current position and urgent actions; preserve saved order/sizes/hiding and the existing 48-hour urgency rule.
- Activity lists completed transactions; recurring income remains discoverable within Income.
- Bills manages expected payments and their paid history.
- Reports retains an overview-first direction, but a reports redesign is a separate task.
- Budgets & goals retains Home and More access; Ideas stays on Home.

Do not add new onboarding steps to explain a form that should be understandable on its own.

## 17. Prototype, comparison and acceptance criteria

Prototype first; implementation is a separate follow-up. No blanket claim that fewer taps or a cleaner screenshot proves success. Compare the same tasks in the existing flow and the proposed flow.

Essential tasks:

1. Record a simple expense without a name; choose an explicit category or Uncategorized.
2. Record a named expense using a saved suggestion; change its amount/category before saving.
3. Choose another wallet/currency and understand the amount being recorded.
4. Add a tagged expense with a compressed photo and note; revisit those details before saving.
5. Record income, schedule recurring income and schedule a bill; distinguish their balance effects.
6. Transfer between wallets in the same and different currencies, within valid permission boundaries.
7. Dismiss the keypad, switch fields, change type, back out and return without accidental loss or submission.
8. Save offline, recover connectivity, retry and tap Save repeatedly without duplicates.
9. Undo only the created record while unrelated/shared changes survive; use history reversal later.
10. Select an unavailable/read-only shared wallet, or lose permission mid-draft, and recover without losing input.

Check small phones (320–390 px), a larger phone, tablet portrait/landscape and desktop; both locales; browser and standalone; keyboard/keypad open and closed; reduced motion; at least a bright and dark theme plus Synthwave/custom colours. Actual iPhone and Android keyboard behavior requires physical-device checks before calling it verified.

Pass conditions:

- No keyboard opens without a field tap; Done dismisses input without submitting.
- The user can identify transaction type, affected wallet/currency and whether money has already moved before saving.
- No arbitrary category/default wallet, silent currency reinterpretation, hidden data loss or accidental future posting.
- Optional details remain discoverable and their populated state visible.
- Save is reachable without covering content; there is no horizontal scrolling, clipped Greek or undersized interactive text.
- Back, child pickers, backgrounding and retries preserve the intended draft.
- Repeated submission and sync retries produce one logical record; Undo preserves unrelated state.
- Existing reminders, history reversal, categories, saved names, tags, photo handling and permission restrictions continue to work.

Record task completion, wrong-wallet/category errors, accidental saves, backtracking and discoverability of income/bills/transfers. Use these observations to settle the compact menu and category suggestions, rather than imposing an arbitrary tap-count target.

## 18. Suggested delivery order

1. Produce a corrected phone prototype in English and Greek: + menu, expense composer, keypad-open state and category selection. Compare against the current flow before committing to exact proportions.
2. Implement the shared composer shell, wallet defaults, category semantics and distinct Done/Save behavior.
3. Add safe saved shortcuts, detail affordances, transfer layout and explicit scheduling links.
4. Complete draft recovery, field validation, submission identity, sync feedback and targeted Undo. These are release requirements, not optional polish.
5. Verify the acceptance scenarios and physical-phone behavior; then publish an app-only update with retained bilingual changelog under the user’s existing publishing authorization.

Website/docs/blog refreshes and a broader navigation/report redesign are separate work. Creating this specification does not implement or publish any of them.

## 19. Implementation record — 0.9.0

Implemented 2026-10-17 following the instruction to deliver the complete change. The app uses compact action rows, an expandable composer and a distinct transfer layout. Drafts are local and account-scoped with a 24-hour recovery window; logout/account changes clear them. Uploaded but unreferenced photos are already cleaned server-side after 24 hours during later uploads. Drafts do not extend that server retention, and missing photo references must be replaced.

Uncategorized is a new explicit category key (`uncategorized`), supported by display/report filtering without rewriting historical categories. Default wallet is stored as synced `settings.defaultAccount`. Optional shortcut amount/wallet values extend existing `settings.savedNames` records; older shortcuts remain compatible.

The client persists one stable transaction ID before scheduling sync. The existing server record upsert uses `(user_id, id)` as its conflict identity, so retrying the same logical entry does not create another record. No Worker/schema migration is needed. Sync acknowledgements are checked per record and shared scope. Rejected shared entries are retained in a local recovery list, reachable from +, and require explicit review and an available wallet before re-saving.

Category creation includes an outline-icon selector/preview; the existing full category management remains in More. Photo handling keeps the existing single compressed image per record; the composer does not claim multiple-image support. Recurring-income scheduling preserves the source category and note. Linked bill/income/goal transaction types cannot be changed arbitrarily.

Browser tests and screenshots cover English/Greek, phones/tablets/desktop, closed/open keypad, photo handling, draft recovery, failed storage, duplicate submission, Undo conflicts, offline sync, passkeys and shared-wallet role changes. Physical iPhone/Android keyboard behavior remains a user-device verification item; emulated browser checks are not described as physical-device verification. Exact menu/category proportions remain refinable from actual use.
