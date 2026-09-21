# Production Browser Acceptance

Date: 2026-09-21 (Asia/Jakarta)

This audit records browser acceptance against the live AffiliateOS Supabase workspace. Production readiness remains **BLOCKED** by the Affiliate Manager role session, incomplete Acquisition / Outreach coverage, deployment, and database-password rotation. Phase 1.7 was not started. The operational Dinda workbooks were not uploaded or modified.

## Environment — PASS

- `AFFILIATEOS_MODE` is production.
- The browser uses the Supabase HTTPS API and publishable key. PostgreSQL tooling uses the server-only `DATABASE_URL`.
- Source and generated client bundles contain no database URL, database password, service-role key, test password, or other private credential.
- The authenticated UI loads the live workspace, Admin profile, and Supabase-backed records. No demo workspace or browser-local business-data substitute appeared.

## Authentication — PASS

- Invalid credentials return `Sign-in failed. Check your email and password.` without leaking internal details.
- The provisioned Admin can sign in and open the live workspace.
- Refresh and direct protected-route navigation preserve the authenticated session.
- Logout clears the session, returns to `/login`, and a direct visit to `/dashboard` then redirects to `/login`.
- The route smoke test independently verifies the unauthenticated redirect.

## Roles — BLOCKED

- Admin role and workspace membership are visibly correct.
- Live RLS remains enabled for every public table and the private bucket remains private.
- Affiliate Manager browser mutation coverage remains blocked because no authorized Affiliate Manager browser session was available. No password was read, reset, printed, or placed in source.

## CRUD — PASS

The following clearly tagged records were created or edited through the browser and survived refresh/navigation:

- `QA — Browser Acceptance Client`
- `QA — Browser Acceptance Brand`
- two QA products
- `QA — Browser Acceptance Creator` and separate marketplace accounts
- Shopee and TikTok QA campaigns
- QA task, HSL, stock snapshots, sample, outreach, report, and Peak Day records

Optional empty entity fields are normalized to `null`, and live Supabase timestamps with offsets pass shared validation.

## Storage — PASS

- Three small synthetic CSV files were uploaded to the private `workspace-files` bucket with workspace-scoped paths and persisted `import_files` metadata.
- An authenticated Admin downloaded the original Shopee fixture again through `/api/imports/:id/file`.
- The endpoint returns `401` without a session, and the bucket's public-object URL returned `400`; `storage.buckets.public` remains `false`.
- The application does not expose a private storage URL to the browser UI.

## Shopee Import — PASS

The primary controlled fixture `tests/fixtures/qa-browser-shopee.csv` contains known valid rows, a legitimate multi-item order, an excluded transaction, invalid date, unknown creator, unknown product, and duplicate item.

- Preview detected Shopee Payment Order, 9 rows, 15 columns, the expected sales metric, and the intended mappings.
- Row-level validation displayed severity, row, field, source value, reason, and suggested action.
- Validation found 6 field-valid rows, two errors, and one exclusion warning. Normalization added explicit unknown-account and unknown-product warnings.
- Persistence proof: 1 import job, 1 private file, 9 raw rows, 5 normalized lineage rows, 2 daily performance rows, and 8 unique raw order-item keys.
- Primary-fixture result: Rp225,000 GMV, 5 orders, 6 units, 1 affiliate with sales, 1 active creator, Rp37,500 ASP, and Rp45,000 ABS.
- Invalid, excluded, duplicate, and unmatched-account rows did not enter performance. The unmatched-product row remained traceable and normalized without silently attaching a product.

The initial transaction exposed a duplicate-key failure in raw evidence capture. Migration `202609210001_import_duplicate_evidence` now preserves all raw rows while allowing the unique evidence table to retain one order-item key. The browser scenario passed after this additive migration; no database reset or QA-context deletion occurred.

## TikTok Import — PASS

`tests/fixtures/qa-browser-tiktok.csv` exercised the equivalent TikTok-specific cases.

- Preview detected TikTok Payment Order, 9 rows, 13 columns, the TikTok sales metric, and independent TikTok mappings.
- Validation found 6 field-valid rows, two errors, and one exclusion warning; normalization produced the additional unmatched-account and unmatched-product warnings.
- Persistence proof: 1 import job, 1 private file, 9 raw rows, 5 normalized lineage rows, 2 TikTok daily performance rows, and 8 unique raw order-item keys.
- Result: Rp260,000 GMV, 5 orders, 6 units, 1 affiliate with sales, 1 active creator, approximately Rp43,333.33 ASP, Rp52,000 ABS, 4 videos, and 1 live session.

## Idempotency — PASS

- Processing the exact Shopee fixture a second time returned `Duplicate file: this payment order report has already been imported.`
- Job, raw-row, lineage, and performance counts did not increase.
- The legitimate two-item `SHP-QA-003` order remains represented as two distinct order-item keys.
- Production contains no duplicate TikTok or Shopee daily performance grain.

## Marketplace Isolation — PASS

- TikTok tables contain only TikTok imports and performance; Shopee tables contain only Shopee imports and performance.
- Cross-market table checks returned zero records.
- TikTok page showed Rp260,000 / 5 orders; the Shopee page showed Rp225,000 / 5 orders before the immutability delta.
- Combined presentation aggregated the two to Rp485,000 / 10 orders without moving rows between marketplace tables.

## Metrics — PASS

The expected fixture values matched the shared metrics engine, marketplace pages, Dashboard, campaign views, and the draft report. Previous comparable GMV was zero and growth correctly displayed `No baseline` instead of a manufactured percentage.

For the immutability test, `tests/fixtures/qa-browser-shopee-immutability.csv` later added Rp10,000, 1 order, and 1 unit on 2026-09-18. Current live Shopee metrics are therefore Rp235,000 / 6 orders / 7 units, while the finalized report correctly remains at its earlier snapshot.

## H-2 — PASS

- On 2026-09-21 in Asia/Jakarta with `reporting_lag_days = 2`, Dashboard, Performance, TikTok, Shopee, and the draft report used cutoff 2026-09-19.
- Each live surface displayed `Data through 2026-09-19 · H-2` or the equivalent report date.

## Dashboard — PASS

- Before finalization, Dashboard, Performance, Shopee, TikTok, campaign detail, and the draft report agreed for the same marketplace, period, cutoff, and workspace scope.
- Marketplace contribution showed TikTok Rp260,000 and Shopee Rp225,000; combined GMV was Rp485,000.
- The later Rp10,000 Shopee immutability delta updated live Shopee/Dashboard data while the finalized report remained frozen by design.

## Targets — PASS

- Created a Shopee Affiliate GMV target of Rp500,000 for the QA report scope.
- Dashboard and report both showed Rp500,000 and 45.0% achievement against Rp225,000 GMV.
- Removed the metric target and cleared the QA campaign fallback target through the browser.
- Dashboard and report then showed `Not set` and no achievement percentage. `metric_targets` contains zero remaining QA targets.

## Reports — PASS

- Created `QA — Browser Acceptance Weekly Report` for Shopee, 2026-09-01 through cutoff 2026-09-19.
- Synthetic narrative fields survived refresh.
- Draft metrics showed Rp225,000 GMV, 5 orders, 6 units, 1 affiliate with sales, and the verified target state.
- Finalization created one snapshot, recorded the actor and timestamp, froze period/cutoff/marketplace/narrative/source metadata, and moved the report to Ready.
- Status progressed Ready → Presented → Archived. The UI now offers only forward statuses, and the shared mutation layer rejects backward transitions.

## Report Immutability — PASS

- The finalized snapshot contains Rp225,000 GMV, 5 orders, 6 units, narratives, actor, cutoff, marketplace, and the original Shopee import source.
- After finalization, the one-row synthetic Shopee delta was imported inside the same reporting period.
- Live Shopee changed to Rp235,000, while the Archived report remained Rp225,000 and continued to reference only its frozen source import.

## Lineage — PASS

- The report identified `qa-browser-shopee.csv`, Shopee Payment Order, the sales metric, covered period, and completed-with-warnings status.
- Database evidence connects the report snapshot to its import ID, 2 performance rows, 5 normalization results, 9 raw rows, import job, file metadata, and the private source object.
- The later delta import does not appear in the already-finalized report lineage.

## Import Activity Log — PASS

- Activity logs contain insert/update events for the primary Shopee import, TikTok import, and immutability delta.
- Report snapshot creation and Ready, Presented, and Archived transitions are recorded.
- Dashboard activity identifies the Admin actor without exposing credentials or storage paths.

## HSL / Stock — PASS

- The QA Shopee HSL activation, account, campaign, hero/secondary SKUs, and creator assignment survive refresh.
- Two dated snapshots per QA product preserve history; the newest quantity drives Critical state and identifies the affected HSL creator/campaign.
- Dashboard alerts remain stable across refresh. The intentional Critical stock state remains as readiness evidence.

## Samples — PASS

- The QA sample progressed through Proposed → Approved → Preparing → Shipped → Received → Activation Pending → Activated.
- Representative transitions survived refresh and activity identifies the Admin actor.

## Acquisition / Outreach — BLOCKED

Completed evidence:

- Creator moved Prospect → Contacted.
- Synthetic WhatsApp outreach was created without sending a message.
- Template preview rendered variables and disabled WhatsApp because no phone number exists.
- Contact timestamp and follow-up context persisted.

Remaining coverage for Responded → Interested → Locked → Activated and full response/follow-up progression was not completed in this pass.

## Peak Day — PASS

- Created `QA Payday` for 2026-09-25 through the browser with target GMV, one creator target, strategy, and Ready status.
- Added the existing QA creator as Live / Confirmed.
- Readiness derived from persisted relationships: creator locking 100%, HSL 100%, SKU assignment 100%, sample 100%, schedule 100%, and strategy Ready.
- Stock readiness correctly remains 0% for two Critical QA products and links to the exact records requiring review. No readiness percentage is hardcoded.

## My Work — PASS

- Today and This Week show the persisted QA task; Overdue correctly shows none.
- The task survives refresh and navigation.

## RLS — PASS

- Every public production table remains RLS-enabled; the private bucket remains private.
- Existing live acceptance verifies anonymous profile denial, cross-workspace isolation, and viewer mutation rejection.
- The rollback-only seeded SQL suite was not rerun against production.

## Error Experience — PASS

- Invalid login, duplicate import, invalid rows, and failed mapping/overlap scenarios returned safe actionable messages.
- No browser error exposed SQL, stack traces, credentials, or private storage URLs.
- Chrome-extension diagnostics were external browser noise and not application errors.

## Mobile QA — PASS

At 390 × 844, Dashboard, creator search, My Work, Outreach, Stock Watch, and report detail were exercised. Navigation collapsed correctly, cards reflowed, and tables remained inside scroll containers.

## Desktop QA — PASS

The normal laptop viewport covered Dashboard, CRUD forms, campaign tabs, HSL, Stock Watch, Samples, Acquisition, Outreach, My Work, reports, Import Center, and Peak Day. The route smoke suite passes.

## Deployment — BLOCKED

- Deployment was not retried in this pass. The prior provider publish returned an authentication-configuration HTTP 409 and no production hostname was issued.
- No authentication, RLS, middleware, or storage control was weakened.
- Exact Supabase Site URL and Redirect URLs cannot be finalized until a production hostname exists.

Production URL: BLOCKED

## Secret Rotation — BLOCKED

The previously exposed database password has not been rotated. Rotation requires user handoff in Supabase, updating authorized `DATABASE_URL` environments, and verifying the old password is rejected. No password is recorded here.

## Regression — PASS

- Lint: PASS (`npm run lint`)
- TypeScript: PASS (`npx tsc --noEmit`)
- Automated: PASS (16/16, `npm test`)
- Routes: PASS (30 application routes plus unauthenticated unknown-route redirect)
- Build: PASS (`npm run build`)
- Isolated seeded database suite: not rerun against production; live additive migration behavior is proven by the completed imports.

## Production Data Integrity — PASS

- Three clearly named synthetic import jobs have matching private files: 19 raw rows and 11 normalized lineage rows in total.
- Orphan import files: 0. Orphan raw rows: 0. Duplicate Shopee daily grain: 0. Duplicate TikTok daily grain: 0.
- QA metric targets remaining: 0. Public tables without RLS: 0.
- No real Dinda workbook was uploaded, no public bucket was introduced, and no QA report is presented as operational truth; the QA report is Archived.
- QA operational context remains intentionally preserved for review and later cleanup.

## Remaining Blockers

1. Provide an already signed-in Affiliate Manager browser session to complete role-specific mutation coverage without sharing a password.
2. Complete the remaining Acquisition / Outreach state progression.
3. Rotate the Supabase database password through user handoff and verify the old password fails.
4. Resolve the provider-specific deployment HTTP 409, obtain the production origin, configure narrow Supabase Auth URLs, and run deployed acceptance.

Full production readiness remains **BLOCKED** until these items pass. Phase 1.7 has not begun.
