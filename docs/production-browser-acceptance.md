# Production Browser Acceptance

Date: 2026-09-22 (Asia/Jakarta)

This audit records browser acceptance against the live AffiliateOS Supabase workspace. The application has been deployed successfully, but final deployed-environment acceptance remains **BLOCKED** by Supabase Auth URL administration, unavailable deployed Admin/Affiliate Manager application sessions, and verification that the previous database password is rejected. Local application acceptance, including Affiliate Manager, Acquisition, and Outreach coverage, is complete. Phase 1.7 was not started. The operational Dinda workbooks were not uploaded or modified.

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

## Roles — PASS

- Admin role and workspace membership remain correct.
- The authenticated browser session visibly identified Dinda Victoria as an `Affiliate Manager` in `AffiliateOS Workspace`; direct profile navigation and refresh preserved that identity and membership.
- Through the real UI, the Affiliate Manager created the controlled QA prospect, advanced acquisition stages, created and updated Outreach, and persisted the contact, response, follow-up, and conversion records.
- Admin-only workspace threshold controls remained disabled. A rollback-only PostgreSQL acceptance transaction impersonated the authenticated Affiliate Manager JWT subject and proved that `clients` INSERT was rejected by RLS with SQLSTATE `42501`, `workspace_preferences` UPDATE affected zero writable rows, and profile-role escalation was rejected by column privilege/RLS with SQLSTATE `42501`.
- Live RLS remains enabled for every public table and the private bucket remains private.
- No password, browser cookie, or access token was read, reset, printed, or placed in source.

## CRUD — PASS

The following clearly tagged records were created or edited through the browser and survived refresh/navigation:

- `QA — Browser Acceptance Client`
- `QA — Browser Acceptance Brand`
- two QA products
- `QA — Browser Acceptance Creator` and separate marketplace accounts
- `QA — Affiliate Manager Lifecycle`, created by the Affiliate Manager for controlled lifecycle acceptance
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

## Acquisition / Outreach — PASS

- The Affiliate Manager created `QA — Affiliate Manager Lifecycle` as a synthetic Prospect through the Acquisition UI.
- Acquisition completed in order: Prospect → Contacted → Responded → Interested → Locked → Activated.
- The persisted acquisition-event rows contain all six stages in that order and identify Dinda Victoria as the actor.
- Synthetic WhatsApp Outreach was created without sending an external message. Its response progressed No Response → Replied → Follow Up → Interested → Converted.
- Contact date `2026-09-21` and follow-up date `2026-09-24` were saved through the UI. The final Outreach status is Converted and the creator stage is Activated.
- Direct navigation, full reload, Acquisition, creator Overview, creator Outreach, and creator Activity all retained the final state. Activity history identifies Dinda Victoria for the creator insert and subsequent transitions.

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
- A production rollback-only role probe used the live Affiliate Manager profile as the authenticated JWT subject. Backend policies rejected an Admin-only client insert, workspace-preference update, and self role escalation; the transaction ended with `ROLLBACK` and left no records.
- Affiliate Manager operational writes remained accepted through the application UI while these Admin-only writes remained rejected by PostgreSQL, so no RLS or authentication rule was weakened.

## Error Experience — PASS

- Invalid login, duplicate import, invalid rows, and failed mapping/overlap scenarios returned safe actionable messages.
- No browser error exposed SQL, stack traces, credentials, or private storage URLs.
- Chrome-extension diagnostics were external browser noise and not application errors.

## Mobile QA — PASS

At 390 × 844, Dashboard, creator search, My Work, Outreach, Stock Watch, and report detail were exercised. Navigation collapsed correctly, cards reflowed, and tables remained inside scroll containers.

## Desktop QA — PASS

The normal laptop viewport covered Dashboard, CRUD forms, campaign tabs, HSL, Stock Watch, Samples, Acquisition, Outreach, My Work, reports, Import Center, and Peak Day. The route smoke suite passes.

## Deployment — PASS

- Sites version 3 was built from commit `314d0d118c0dff27f72b90c7c8bf2d6553631ed7`, saved with its validated archive, and deployed with production environment revision 1.
- Production runtime values contain only `AFFILIATEOS_MODE`, the Supabase HTTPS URL, and the Supabase publishable key. `DATABASE_URL` and service-role credentials were not deployed.
- Both earlier deployments failed before a provider deployment ID was created. Their failures came from HTTP 409 responses while Sites registered callback metadata for the same SIWC auth client. The new deployment passed that registration step, received provider deployment ID `site---6aa02da31dc08191a0822e46bf361d44`, and completed successfully. This isolates the prior blocker to provider-side SIWC callback-registration conflict/idempotency rather than the application build.
- No authentication, RLS, middleware, storage policy, or Site audience was weakened.

Production URL: `https://affiliateos-hari.hariharto-surya.chatgpt.site`

## Secret Rotation — BLOCKED

- Authorized PostgreSQL tooling connects successfully with the current local `DATABASE_URL`, and the local production-mode application continues to load the Supabase workspace.
- The previous credential was not re-entered into a command, file, or log. Its rejection could not be tested through a secret-input mechanism in this session, so the old-credential rejection gate remains unverified.
- No password is recorded in this audit.

## Deployed Environment Acceptance — BLOCKED

- Private Sites authentication completed for the Site owner and persisted while navigating the production origin.
- The deployed AffiliateOS login page rendered correctly. Direct unauthenticated navigation to the archived QA report redirected to `/login`.
- A private-header deployed route smoke test passed all 30 application routes plus the unknown workspace route redirect to `/login`.
- Recent production Worker error logs are empty.
- Supabase Auth Site URL and Redirect URLs are not yet updated. The available Supabase Dashboard browser session belongs to an account without access to the AffiliateOS project, so the production origin and required localhost origins could not be saved or verified.
- No deployed AffiliateOS Admin or Affiliate Manager session was available. Login/logout, authenticated refresh persistence, workspace roles, CRUD, RLS, private storage, Import Center, existing controlled import context, Dashboard/H-2, reports/lineage, HSL/Stock, Acquisition/Outreach, Peak Day, and full authenticated mobile/desktop layout remain blocked on those sessions.
- Existing QA production context was not deleted, reset, reseeded, or duplicated.

## Regression — PASS

- Lint: PASS (`npm run lint`)
- TypeScript: PASS (`npx tsc --noEmit`)
- Automated: PASS (16/16, `npm test`)
- Routes: PASS (30 application routes plus unauthenticated unknown-route redirect)
- Build: PASS (`npm run build`)
- Deployed routes: PASS (30 application routes plus unknown-route redirect through the private production origin)
- Affiliate Manager RLS probe: PASS and rolled back without changing production data.
- Isolated seeded database suite: not rerun against production; live additive migration behavior is proven by the completed imports.

## Production Data Integrity — PASS

- Three clearly named synthetic import jobs have matching private files: 19 raw rows and 11 normalized lineage rows in total.
- Orphan import files: 0. Orphan raw rows: 0. Duplicate Shopee daily grain: 0. Duplicate TikTok daily grain: 0.
- QA metric targets remaining: 0. Public tables without RLS: 0.
- No real Dinda workbook was uploaded, no public bucket was introduced, and no QA report is presented as operational truth; the QA report is Archived.
- QA operational context remains intentionally preserved for review and later cleanup.

## Remaining Blockers

1. Open an authenticated Supabase Dashboard session that has access to project `gevjwunwrupeebochswz`, then set the Site URL to the production origin and preserve only the required production and localhost Redirect URLs.
2. Provide authenticated deployed AffiliateOS sessions for the Admin and Affiliate Manager so the production CRUD, RLS, storage, import, workflow, and responsive-layout gates can run without resetting or duplicating QA data.
3. Verify rejection of the previous database password through a secret-safe mechanism, if one is available.

Full production readiness remains **BLOCKED** until these items pass. Phase 1.7 has not begun.
