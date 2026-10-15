# 08 Mobile-first app UX

**Status:** approved 2026-10-15 and built locally (version 0.3, not published). See section 17 for what is done and what is not. It replaces the screen layout of the 0.2 beta; the data, sync, accounts and API stay as they are.
**Why now:** feedback on the 0.2 beta: "it doesn't show as an app on phones, it looks like a website that doesn't adapt well." That is correct. See the diagnosis.

## 1. Diagnosis: why the beta feels like a website

| Symptom | Cause in the beta |
|---|---|
| Looks like a web page | A desktop header (logo, tabs, buttons) sits on top of a scrolling document, with a footer of website links |
| Forms feel foreign | Centered pop-up dialogs, like a website modal, instead of sheets that slide up from the bottom |
| Hard to tap | Small buttons and menus (3-dot menus, small pills), many controls per screen |
| Inconsistent look | Emoji used as icons, which look different on every phone and are not under our control |
| Slow to enter data | Adding a transaction is a long form, with the amount buried among many fields |
| No sense of "place" | No clear app structure: five equal tabs, plus add, language, account and sign-in all in the header |
| Browser chrome everywhere | Not installed, no safe-area handling, no standalone behavior, no first-run guidance |

## 2. Principles

1. **Phone first, then tablet, then desktop.** Design the 390 pixel wide screen first and let bigger screens add panes, not stretch.
2. **One thumb.** Primary actions live in the bottom half of the screen. Nothing important is only reachable from the top corners.
3. **Big, clear targets.** At least 48 by 48 px for anything tappable, 12 px or more between targets.
4. **Few things per screen.** One job per screen, one primary action.
5. **Icons and color carry meaning.** A consistent icon set in colored circles, not emoji and not text-only buttons.
6. **Fast capture.** Adding an expense is amount, category, done: three taps from anywhere.
7. **Feels native.** Full-height app shell, sheets, swipe actions, smooth motion, no page-style scrolling quirks, works offline.
8. **Same brand, calmer.** Keep the emerald, mint and white cards of the current look.

## 3. Platforms and breakpoints

| Width | Layout |
|---|---|
| Phone, up to 599 px | App bar on top, content, **bottom tab bar** with a centered **+** button. Forms are bottom sheets or full-screen sheets |
| Tablet, 600 to 1023 px | **Side rail** (icons with labels) on the left, content on the right, and a **detail pane** beside lists (list on the left, selected item on the right) |
| Desktop, 1024 px and up | Same as tablet, with a wider content area (max about 1200 px), the rail expanded with labels, and keyboard shortcuts |

Installed (standalone) mode is the target experience; the same layout works in a browser tab.

## 4. Navigation

**Phone: four tabs and a center action button.**

| Position | Item | Icon | What it is |
|---|---|---|---|
| 1 | **Home** | grid | Overview: balance, wallets, this month, due soon |
| 2 | **Activity** | arrows up and down | All transactions: filters, search, month |
| center | **+** | plus in a circle | Opens the Add sheet (Expense, Income, Transfer, Bill) |
| 3 | **Bills** | calendar | Bills list and calendar |
| 4 | **Reports** | pie chart | Cash flow, categories, forecast, subscriptions |

- **Settings and account** are behind the avatar at the top right of Home (a "More" screen with grouped rows). No more language, sign-in and add buttons crowding a header.
- Each screen has a large title in a simple app bar, and its own context actions (search, filter, month picker).
- **Back** works as expected: sheets and detail screens use the browser history, so the Android back button and the iOS swipe-back close them.
- The tab bar stays put; scrolling happens in the content only. The bar respects the safe area at the bottom (home indicator).

## 5. Add flow (the most important interaction)

1. Tap the **+** button. A **bottom sheet** shows four large tiles: **Expense**, **Income**, **Transfer**, **Bill** (icon, color and label each).
2. **Expense or Income:** a full-screen sheet with the **amount first** in large type and a **big numeric keypad**. Below it, horizontally scrollable **category chips** with icons, then chips for **wallet**, **date** (Today, Yesterday, Pick) and **note**. A check mark at the top right saves.
3. The **sentence box** stays, as a small "type it instead" affordance at the top (for example "Coffee 3.50 yesterday").
4. **Transfer:** from-wallet and to-wallet chips with an arrow between them, amount, and the received amount if currencies differ.
5. **Bill:** a short form (name, amount, next date, repeat) with advanced options under "More".
6. Saving shows a brief confirmation with **Undo**. Recent categories and wallets are remembered and pre-selected.

Target: three taps and a number for the common case.

## 6. Lists and gestures

- Rows are 64 px tall: colored circle icon, title and subtitle, amount on the right (green for income, normal for expenses).
- **Swipe left** reveals Delete; **swipe right** reveals Edit (or Mark paid on bills). Every swipe action also exists as a visible button in the detail view, for accessibility and for mouse users.
- **Tap a row** opens a detail sheet (amount, date, wallet, category, note) with Edit and Delete.
- Date headers stick to the top while scrolling. **Pull to refresh** triggers a sync.
- Long lists load in chunks, so scrolling stays smooth.

## 7. Sheets, forms and dialogs

- On **phone**, every form is a **bottom sheet** (a drag handle, rounded top corners, can be pulled down to close) or a **full-screen sheet** for bigger forms. No centered pop-ups.
- On **tablet and desktop**, the same forms appear as a side panel or a centered dialog.
- Inputs are large (at least 48 px tall, 16 px text so phones do not zoom), with the right keyboard for each field (numeric for amounts, email for email).
- Destructive actions use a confirmation sheet with clear verbs ("Delete transaction"), never a browser `confirm` box.

## 8. Visual system

| Element | Decision |
|---|---|
| **Icons** | One consistent outline icon set (inline SVG, bundled with the app, no external service), 24 px, in **colored circles** per category, like Wallet. Replaces emoji |
| **Color** | Emerald primary, soft mint canvas, white cards. Income green, expenses neutral, overdue red, warnings amber. Each category has its own tint |
| **Type** | System font stack. Amounts are large and tabular. A fixed scale: 12, 14, 16, 20, 28, 36 px |
| **Spacing** | An 4 px grid; 16 px screen margins on phone, 24 px on tablet |
| **Shape** | 16 px card corners, 20 px sheet corners, full-round buttons for the main action |
| **Motion** | Short, purposeful (sheet slide, list item fade, tab change), respects "reduce motion" |
| **Dark mode** | First class, designed per screen, follows the device |
| **Empty states** | A simple illustration, one sentence, one button |
| **Feedback** | Haptic tap on Android when saving (not available on iPhone), toast with Undo |

## 9. Behaviors that make it feel like an installed app

- **Install prompt:** a friendly card in More and on first run with platform-specific steps (iPhone: Share, Add to Home Screen; Android and desktop: Install). The Android and desktop browsers' install event is used when available.
- **Standalone display:** no browser bar, status bar color matches the app, safe-area insets respected (notch, home indicator).
- **No website furniture:** the credits footer, blog links and project list move to **More, About**. The app screens show only app content.
- **Overscroll and selection:** no accidental text selection or rubber-band on chrome, no 300 ms tap delay, correct viewport units for mobile browsers.
- **Offline first:** unchanged, with a small offline indicator and a sync status dot.
- **Faster start:** the app shell is cached, so it opens instantly and works in a tunnel.
- **First-run flow** (three short steps): welcome and language, currency and first wallet with an opening balance, then "Create account to sync" or "Continue without account". Skippable.

## 10. Screens

| Screen | Content |
|---|---|
| **Home** | Greeting and avatar; balance card with the wallets as horizontal cards; this month in and out; a "due soon" list (swipe to mark paid); a small cash-flow bar; "Add" shortcuts |
| **Activity** | Large title, search icon, filter chips (All, Out, In), a month switcher, grouped list, floating summary of the month's totals |
| **Bills** | List and calendar switch; overdue first; swipe to mark paid; calendar with dots |
| **Reports** | Swipeable cards: cash flow, categories (donut), forecast, subscriptions; period switch (month, 3 months, year) |
| **More** | Grouped rows with chevrons: Account and sync, Wallets, Categories, Reminders, Data and backup, Appearance and language, Install, About and help |
| **Detail sheets** | Transaction, bill, wallet: large amount, facts, Edit and Delete |

## 11. Tablet and desktop

- A **side rail** replaces the tab bar; the + button sits at the top of the rail.
- **List and detail** side by side in Activity and Bills; Home shows balance and charts in a grid.
- Keyboard: `n` for new, `/` for search, arrow keys in lists, Escape closes panels.
- Max content width so lines stay readable.

## 12. Accessibility

- Every swipe action has a button alternative; every icon-only control has a label; focus order follows reading order.
- Contrast at least 4.5:1, text scales to 200 percent, dark mode and reduced motion are respected.
- Works with VoiceOver and TalkBack: lists are real lists, sheets trap focus and return it on close.

## 13. Plan

| Step | Work | Keeps |
|---|---|---|
| 1 | App shell (top bar, bottom bar, rail), CSS rewrite, icon set | `core.js`, `sync.js`, the Worker, `i18n.js` (extended) |
| 2 | Add flow: + sheet, amount keypad, category chips, transfer and bill sheets | Sentence parser |
| 3 | Home, Activity (swipe, detail sheets, filters), Bills, Reports | Data model |
| 4 | More screen, first-run flow, install prompt, onboarding | Account and sync code |
| 5 | Tablet and desktop panes, keyboard shortcuts | |
| 6 | Polish: motion, empty states, dark mode, accessibility pass | |

Every step keeps the English and Greek strings in step, and the existing tests are updated and extended.

## 14. Testing

- **Device emulation** in Chrome: iPhone SE (small), iPhone 15, Pixel 7, iPad portrait and landscape, a 1440 px desktop; light and dark; English and Greek (longer words) at each.
- **Automatic checks:** no horizontal scroll, every tappable element at least 44 px (a script fails the build otherwise), no text below 12 px, no focus trap errors.
- **Screenshot review** of every screen at phone and tablet size before it is shown to you.
- **Real devices:** you try it on your phone (Safari and installed, and Chrome on Android if available). Emulation cannot replace this, and I will say what I could not verify.
- Existing logic, API and end-to-end tests keep running.

## 15. Not in scope now

- A store app (App Store, Google Play) through a wrapper such as Capacitor: possible later, and the only way to get true iPhone push notifications without installing from the browser.
- Widgets, watch apps, biometrics beyond passkeys.
- A custom domain (spec 07).

## 16. Open questions

1. **Navigation:** four tabs plus the center + (as in the mockup), or a different structure (for example Wallet-style tabs with budgets)?
2. **Add flow:** amount-first with a big keypad (recommended), or the form-first layout?
3. **Icons:** a bundled outline icon set in colored circles (recommended), or keep emoji for now?
4. **Store apps:** should a wrapper for the App Store and Google Play be planned for after launch?
5. **Brand:** keep the current emerald and mint, or adjust the look at the same time?

## 17. Implementation status (local, 2026-10-15)

| Item | Status |
|---|---|
| App shell: top bar, bottom tab bar with center + button, side rail, details pane | Built. Phone below 600 px, tablet from 600, wide from 900 |
| + sheet, amount-first transaction sheet with keypad (hardware keyboard works too), bill, pay, wallet, category, sign-in, recovery-code and confirm sheets | Built. Sheets are bottom sheets on phones, centered dialogs on larger screens, close with the back button and Escape, and pull down to close |
| Swipe actions (right: edit or mark paid, left: delete, with Undo), tap for a detail sheet or pane, pull down to sync | Built and tested with real touch events |
| Home, Activity, Bills (list and calendar), Reports (donut, cash flow, forecast, subscriptions), More with sub-screens | Built |
| Bundled outline icon set in colored circles (Tabler Icons, MIT licence, in `icons.js`) | Built; emoji remain only for the user's own custom categories |
| First-run flow (language, first wallet, account) and install prompt (iPhone, Android, desktop wording; the browser's install event where it exists) | Built |
| Tablet and desktop: rail, pane, keyboard shortcuts (`n`, `/`, Escape) | Built |
| English and Greek throughout, decimal comma on the Greek keypad | Built |
| Tests: tap targets 44 px or more and no sideways scrolling on every screen and sheet (phone, small phone, Greek), touch swipe, pull to refresh, back button, desktop pane, first-run, migration | Passing |

**Not verified:** a real iPhone, a real Android phone and a real tablet. Emulation cannot show the iOS Safari toolbar and keyboard behavior, installed-app behavior, the notch or home indicator, or haptics (Android only). The design uses safe-area insets and dynamic viewport units for these, but only a real device proves them.

**Deviations from the spec:** More is reached from the avatar at the top right on phones (and from the rail on larger screens), not from a tab; "Reports" shows the category donut for a month, three months or the year, but the other cards are not period-aware yet; no illustration art for empty states (a large colored icon is used).
