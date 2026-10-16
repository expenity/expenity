# 11 — Receipt preparation and safe-to-spend forecast

Delivered scope: app version 0.10.0, 2026-10-17. Website, published documentation and blog remain unchanged. No Cloudflare Worker or database migration is required.

## Receipt preparation

Add expense → Scan receipt → take or choose an image → local text recognition → review selected fields → use selected fields → normal expense review and Save. Scanning never creates a transaction, chooses a category, changes a wallet or interprets a detected currency as a conversion.

Recognition uses bundled, pinned Tesseract.js 7.0.0 and English/Greek fast language data. All scripts, worker, WebAssembly core variants and models are served from the app origin. No image or extracted text is sent to a recognition provider. Engine assets load on demand; the service worker caches them in a separate versioned recognition cache so ordinary app releases do not force repeated downloads. Languages also use the engine's local IndexedDB cache. After a successful controlled download, recognition works offline, including after reloading the app. Failed downloads, unsupported photos and unreadable text leave manual entry available.

The recognition worker runs off the UI thread, has a two-minute timeout, cancellation and session guards. JPEG/PNG/WebP/HEIC/HEIF input is subject to browser decoding support and a 20 MB input limit. The working image is bounded to a 2560 px longest edge. The app permits only same-origin workers and adds `wasm-unsafe-eval` for WebAssembly; it does not enable arbitrary JavaScript `unsafe-eval` or remote OCR scripts.

The parser prefers labelled final totals, excludes tax/subtotal/tender/change lines, and does not simply choose the largest number. Equal competing final totals need a choice. Ambiguous day/month dates produce multiple choices; missing values stay blank. Refund/credit wording prevents automatic positive-total selection. These are heuristics, not guarantees of receipt understanding. Recognition confidence below the review threshold starts with fields unchecked. Every suggested value is editable. User-entered text and recognized text are escaped before display.

The optional reference-photo checkbox is off by default and requires sign-in. It uses the existing compressed-photo upload and size limits; existing photos are replaced only after an explicit choice. The raw working image and extracted text are released on close; only selected financial fields and an optional uploaded photo ID enter the ordinary local draft/sync system. Receipt currency must be selected before applying an amount. A currency mismatch goes through the existing explicit amount-review flow rather than changing the wallet currency.

Library and language-data licences and the pinned model revision are retained in `vendor/ocr/`. `dev/build-ocr.mjs` recreates the engine bundle from the lockfile. English/Greek language snapshots are committed, not fetched from an external runtime CDN.

## Safe to spend

A customizable Home card appears after Wallets for the default layout. Saved dashboard order/hiding/resizing continues to work. Reports → Forecast opens the same calculation; its prior optimistic spending figure is replaced with the new conservative daily allowance.

Calculate in integer cents of the main currency:

`spending room = max(0, selected balances as of today − unpaid bills through the horizon − scheduled net outflows − budget reserve − additional planned spending − additional savings − protected buffer)`

`daily room = floor(spending room / inclusive days in the horizon)`

A negative result is shown as zero spending room plus a separate shortfall. The breakdown exposes every subtraction, the covered dates, relevant commitments and warnings. The estimate is explicitly based on entered records and assumptions, not guaranteed available bank funds.

Personal cash/bank wallets are selected initially. Savings, cards and shared wallets require explicit selection. Shared selection includes the whole shared balance, with a visible warning, not an invented personal share. Archived or missing saved wallet selections do not silently disappear from an otherwise apparently complete result.

The default horizon ends the day before the next future expected income in the selected wallets; income due today means a one-day horizon. Overdue income is flagged and not treated as received or a reliable next pay date. Without an upcoming income date within 90 days, the horizon explicitly falls back to the next 30 days. Users can choose seven or 30 days instead. Expected income never increases spendable funds until recorded as received.

Balances include opening balances and recorded movements dated through today. Future dated net outflows are reserved instead of reducing today's starting balance. Incoming future money is excluded. Both sides of a transfer are netted when both wallets are selected.

Unpaid recurring/one-off bills include overdue occurrences and stop at an end date. Occurrences already represented by a linked payment are not reserved again. Unknown bill amounts, invalid dates or an excessively long stale schedule block a reliable allowance instead of silently contributing zero. Missing or over-seven-day currency rates also block the estimate; successful foreign-currency conversions are marked approximate with the rate date.

Budget limits are an explicit planned-spending assumption, enabled initially and switchable off. Remaining limits are prorated across the horizon and current/future budget periods. For duplicate or overlapping category limits, daily maxima are used. Overall limits and category allowances are combined with a maximum, not added on top of one another. Known spending commitments already reserved are deducted from the corresponding budget allowance. Goal contributions and outgoing transfers are separate from ordinary expense budgets and do not consume that allowance. Current goal contributions already reduce balances and are not subtracted a second time.

Additional spending, additional savings and protected buffer are user-editable non-negative amounts, stored with wallet/period choices in synced `settings.safeSpend`. Helpers make clear these are additional assumptions, not amounts already represented by bills, budgets or goal contributions. They remain until edited; the app does not pretend to match an unlabelled lump-sum reserve to a later transaction.

## Verification and limits

`dev/test-receipts-safe.mjs` runs actual browser recognition on generated English and Greek image fixtures with the app CSP, verifies draft-only selective application, recognition cancellation, same-origin asset requests, on-demand caching and offline recognition after a fresh page load. It checks tax/tender/change exclusion, competing totals, date ambiguity and refunds. Fixture success is not a claim of perfect accuracy on arbitrary real receipts or physical-device camera behavior.

Deterministic forecast tests cover unreceived income, default wallet exclusions, bills already paid, overlapping budgets, future expenses/transfers/goals, missing currency rates, unknown bill amounts, deficits and fallback horizons. Responsive checks cover both languages at phone/tablet/desktop sizes. Existing app/entry/update/dashboard checks guard regressions. Real receipt quality, memory limits and native iPhone/Android camera/keyboard behavior remain device-dependent.

Version 0.10.1 also fixes the existing dashboard editor’s quick-Cancel suppression after resizing, found by deployment verification. Synthetic long-press release suppression remains limited to its own brief toolbar window.

### 0.10.3 — real-photo receipt recognition

The original clean synthetic fixtures did not cover thermal receipts photographed on textured surfaces. Added automatic light-paper detection with a guarded crop, local luminance normalization, a wider thermal-print fallback, sparse/automatic segmentation retries, and bounding-box row reconstruction. Greek total-label confusions are handled only when classifying labels; amounts are not guessed from the largest number. Merchant suggestions rank header confidence and glyph height. Currency signs are checked beside amounts on total rows to avoid spurious background symbols.

Opt-in local photo regression: `node dev/test-receipt-photo.mjs /absolute/path/receipt.jpg 3.30 YUCCA`. The user's receipt is not committed or sent to a recognition service. The supplied RAW/DNG was converted locally to JPEG for browser testing; direct RAW decoding remains unsupported. All fields still require review.

### 0.11.0 — replace the default recognition engine

Decision: adopt the official PaddleOCR.js browser SDK 0.4.2 with the official PP-OCRv5 mobile detector and Greek-English recognizer (pinned model hash manifest). A dedicated module worker runs WASM with one thread, so GitHub Pages does not need cross-origin isolation headers. Pixels are transferred from the page to the worker as ImageData; the SDK receives OpenCV matrices, avoiding DOM-only image conversion in the worker. Detection polygons supply a median text angle for aligning total labels with values. The existing Tesseract path is a local compatibility fallback. There is no paid provider, server recognition endpoint, or per-scan charge. The worker refuses cross-origin/non-GET fetches.

The roughly 40 MB runtime/models load on first scan and stay in a separate on-demand offline cache. Closing/cancelling terminates the worker immediately and rejects the pending job. The adapter URL is versioned with the app release; model snapshots are immutable and hash checked. Source photo and OCR text are not uploaded or logged by the app. Optional compressed reference attachments still use the existing explicit opt-in flow.

Recovery: visible buttons for candidate amounts; Focus on the total opens a photo selection tool (tap for a band, drag for a rectangle, keyboard selection supported). The selected area is read again. Merchant/date/currency edits and field selections survive cancellation/retry. No transaction is saved until the normal expense Save action. Refund-policy footer wording no longer suppresses purchases; payable/rounded totals outrank tax breakdowns and quantity summaries.

Measured locally, 2026-10-17:

- One real Greek receipt, tested as original, +/-5 degree rotation, dimmer exposure, 1200-pixel version, JPEG compression and a shadow gradient (seven variants, not seven independent Greek receipts). With the comparison parser, the old engine returned correct totals in 2/7 Chromium cases and 0/7 WebKit cases; the replacement returned 7/7 in both. WebKit baseline sometimes returned 3.20 rather than the printed 3.30.
- Eight independent annotated English-language SROIE receipts: both engines returned 8/8 correct totals after parser fixes; before parser fixes, neither engine was reliable on this subset. These eight examples are a small sanity check, not a dataset accuracy claim.
- Public corpus: first eight JPEG/JSON pairs in the `NDilanka/tessera-invoice-inbox` data/eval snapshot `6932419dbdaf972977ff53806284ae6c9b93a139`. Source dataset: ICDAR 2019 SROIE / jsdnrs HuggingFace mirror. Samples are kept outside the repo.
- Real engine use, recovery selection, field preservation, cancellation, offline-after-reload and EN/EL layouts are checked in browser regressions. No physical iPhone performance or memory guarantee follows from desktop WebKit tests. Fresh iPhone captures remain an acceptance check; broad Greek accuracy needs more independently photographed receipts.

Reproduce with `node dev/benchmark-receipt-engines.mjs /absolute/path/receipt.jpg 3.30`; set RECEIPT_BROWSER=webkit for WebKit or RECEIPT_CORPUS for a directory of JPEG/JSON annotations. Reports remain under /tmp by default; private photographs are never committed.

Research: official browser SDK documentation https://github.com/PaddlePaddle/PaddleOCR/tree/main/paddleocr-js/packages/core ; Greek-English model documentation https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/algorithm/PP-OCRv5/PP-OCRv5_multi_languages.en.md .
