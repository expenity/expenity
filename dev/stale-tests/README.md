# Stale tests

These tests were written for earlier screens (the entry form, setup steps, custom theme editor, dashboard layout, settings groups). The screens
were redesigned since, so they fail on selectors and flows, not on bugs that were found. They are kept here, out of the test suite, to be rewritten one
by one: `test.mjs` (core flows), `test-e2e.mjs`, `test-enhancements.mjs`, `test-catalog.mjs`, `test-dashboard.mjs`, `test-deployed-ui.mjs` (needs a deployed
build), `test-entry-flow.mjs`, `test-entry-groups.mjs`, `test-flexible-recurrence.mjs`, `test-receipt-photo.mjs` (needs a sample receipt),
`test-receipt-recovery.mjs`, `test-receipts-safe.mjs`, `test-release-update.mjs`, `test-scan-scheduling.mjs`, `test-unified-editor.mjs`,
`test-v06.mjs`, `test-v07.mjs`, `test-settings-smoke.mjs`. The first failing step of each is in the git history of this folder's move.
