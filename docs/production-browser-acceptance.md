# Production Browser Acceptance

Date: 2026-09-21 (Asia/Jakarta)

This audit records the browser acceptance work completed against the live AffiliateOS Supabase workspace. It does not claim full production readiness while the controlled import, second-role, deployment, and secret-rotation gates remain blocked.

## Environment — PASS

- `AFFILIATEOS_MODE` is production.
- The application uses the Supabase HTTPS API URL and publishable key. PostgreSQL tooling uses the server-only `DATABASE_URL`.
- Source and generated client bundles were searched for the database URL, database password, service-role key, test credentials, and other private secrets. No private credential was found. The public Supabase URL and publishable key are expected browser configuration.
- No service-role key is configured in browser code.
- The authenticated UI visibly loads `AffiliateOS Production`, the correct Admin profile, and persisted Supabase records. No demo-workspace notice or browser-local business-data replacement appeared.

## Authentication — BLOCKED

PASS evidence:

- Invalid credentials return the safe message `Sign-in failed. Check your email and password.`
- The provisioned Admin session can open the production workspace.
- Refreshing a protected page preserves the authenticated session.
- Direct navigation to a protected nested route works after authentication.
- Unauthenticated protected and unknown workspace routes redirect to `/login`; the route smoke test verifies the redirect without following it.

Blocked evidence:

- Logout is intentionally deferred until the remaining authenticated browser work is complete.
- The Affiliate Manager login cannot be exercised without an authorized browser session for that user. No password was read, reset, logged, or placed in source.

## Roles — BLOCKED

- Admin role and workspace membership are visibly correct.
- The existing live RLS acceptance verified cross-workspace isolation and mutation protection before this browser pass; the destructive seeded SQL suite was not rerun against production.
- Affiliate Manager browser mutation coverage is blocked by the missing authorized Affiliate Manager session. UI visibility is not being accepted as permission evidence.

## CRUD — PASS

Admin browser actions reached Supabase and survived refresh/navigation:

- Created and edited `QA — Browser Acceptance Client`.
- Created and edited `QA — Browser Acceptance Brand`.
- Created `QA — Browser Acceptance Product` and `QA — Browser Acceptance Stock Product`.
- Created `QA — Browser Acceptance Creator` with synthetic marketplace accounts.
- Created `QA — Browser Acceptance Shopee Campaign`.
- Created `QA — Browser Acceptance Task`; it appears in My Work Today and This Week.

The task save initially failed because optional empty form fields were sent as empty strings. The API now normalizes all empty form values to `null`, and the browser retest persisted the task.

## Storage — BLOCKED

The existing `workspace-files` bucket remains private and workspace-scoped. A controlled browser upload cannot run because the ChatGPT Chrome extension does not currently have **Allow access to file URLs** enabled. No real operational workbook was uploaded and no public bucket was created.

## Shopee Import — BLOCKED

`tests/fixtures/qa-browser-shopee.csv` is a small synthetic Shopee Payment Order fixture with known valid rows, a legitimate multi-item order, a refunded/cancelled row, an invalid date, an unknown creator, an unknown product, and a duplicate transaction.

Expected accepted metrics before upload:

- Affiliate GMV: Rp225,000
- Orders: 5
- Units: 6
- Affiliates with sales: 1
- Active creators: 1
- ASP: Rp37,500
- ABS: Rp45,000

Upload, preview, validation, normalization, persistence, and lineage remain blocked by the Chrome file-access setting above.

## TikTok Import — BLOCKED

`tests/fixtures/qa-browser-tiktok.csv` provides the equivalent controlled TikTok cases and keeps TikTok identifiers independent from Shopee.

Expected accepted metrics before upload:

- Affiliate GMV: Rp260,000
- Orders: 5
- Units: 6
- Affiliates with sales: 1
- Active creators: 1
- ASP: approximately Rp43,333.33
- ABS: Rp52,000

This gate must run after Shopee and is blocked by the same browser upload setting.

## Idempotency — BLOCKED

Automated normalization tests pass for duplicate files, duplicate order-item keys, and legitimate multi-item orders. Production browser proof requires processing the controlled Shopee file twice and is blocked by browser upload.

## Metrics — BLOCKED

The expected fixture values are fixed above and automated marketplace-specific metric tests pass. Live browser comparison cannot occur until the controlled imports are processed. No formula was changed to manufacture a passing value.

## H-2 — PASS

With the workspace date 2026-09-21 in Asia/Jakarta and `reporting_lag_days = 2`, the Dashboard displays `Data through 2026-09-19 · H-2`. The new draft report defaults its period end and cutoff to 2026-09-19.

## Dashboard — BLOCKED

- Production workspace, Admin profile, campaign target, campaign state, stock alerts, activity, and H-2 cutoff display correctly.
- Cross-surface performance consistency is blocked until controlled Shopee and TikTok performance exists.

## Reports — BLOCKED

PASS evidence:

- Created `QA — Browser Acceptance Weekly Report` through the browser for Shopee, 2026-09-01 through the 2026-09-19 cutoff.
- Saved the required synthetic narratives and confirmed all three survive a hard refresh.
- Draft metrics are produced by the shared metrics engine and show zero while no controlled import contributes.

Blocked evidence:

- The report remains Draft. It was not finalized with empty import lineage.
- Ready, Presented, Archived, frozen source metadata, and lineage cannot be accepted until imports pass.

## Report Immutability — BLOCKED

The automated suite passes finalized-report immutability. The required production-browser test of finalizing, adding in-period synthetic data, and comparing the frozen snapshot remains blocked by import.

## Lineage — BLOCKED

The report lineage view correctly reports zero contributing imports and links to Import Center. Complete Report → Metric → Performance → Normalized Row → Raw Row → Import → Source File proof requires the controlled import.

## HSL — PASS

- Created a QA Shopee HSL activation for the QA creator, campaign, and Shopee account.
- Assigned hero and secondary QA products.
- The activation and SKU assignments survive refresh and are reflected in stock-impact context.

## Stock — PASS

- Created two dated snapshots for each QA product.
- History retains both records; latest quantity derives from the newest snapshot.
- Latest quantity 2 produces Critical stock state and identifies one affected HSL creator/campaign.
- Dashboard priority cards reflect the two low-stock records without creating duplicate alerts on refresh.
- Resolving the stock condition remains deferred so the current acceptance context can be resumed after upload is enabled.

## Samples — PASS

- Created a QA sample and moved it through Proposed → Approved → Preparing → Shipped → Received → Activation Pending → Activated.
- Representative transitions were observed after refresh/reload and activity entries identify the Admin actor.
- Live Supabase timestamps include `+00:00`. Zod validation now explicitly accepts ISO timestamps with offsets; a regression test covers this production form.

## Acquisition / Outreach — BLOCKED

PASS evidence:

- Moved the QA creator from Prospect to Contacted and confirmed database-backed counters/state.
- Created a synthetic WhatsApp outreach record without sending a message.
- Preview rendered the creator variable and correctly disabled Open WhatsApp because no phone number exists.
- Mark Contacted persisted 2026-09-21 and appears in Recently Contacted.

Blocked evidence:

- The full acquisition sequence through Responded, Interested, Locked, and Activated was not completed.
- Template selection, follow-up date, and response progression remain incomplete.

## Peak Day — BLOCKED

- Campaign creator membership was added and changed to `Live / Locked`; `locked_at` and `locked_by` persisted.
- HSL assignments, product assignments, activated sample, and Critical stock context exist for readiness derivation.
- The Peak Day form was populated, but Chrome automation could not set the native date control reliably, so the record was not saved. No direct database insert was used to simulate success.

## My Work — PASS

- Today shows the QA task.
- Overdue correctly shows no overdue tasks.
- This Week shows the QA task.
- The task survives refresh and normal application navigation.

## Activity Log — BLOCKED

The Dashboard recent activity identifies the Admin actor for sample, HSL, stock, and account changes. Import completion and report finalization activity cannot be inspected until those workflows run.

## RLS — PASS

- All 44 public production tables remain RLS-enabled and the private bucket remains private, as recorded in the accepted Phase 1.6 audit.
- Existing live acceptance verified anonymous profile denial, cross-workspace isolation, and viewer mutation rejection.
- The rollback-only seeded database suite was not rerun against live production because its fixture IDs belong to an isolated seeded QA database.

## Error Experience — PASS

- Invalid login returns a safe, actionable error.
- Failed task validation remained user-facing and exposed no SQL, stack trace, credential, or private storage URL.
- The timestamp-offset failure was fixed at the shared validation boundary and the failed browser scenario passed on repeat.

## Mobile QA — PASS

At 390 × 844 the following authenticated production pages were exercised: Dashboard, creator search, My Work, Outreach, Stock Watch, and report detail. Navigation collapses to the mobile sidebar control, cards reflow, and wide tables remain inside horizontal scroll containers. The viewport override was reset after testing.

## Desktop QA — PASS

The production Dashboard, client/brand/product/creator/campaign/task forms, campaign tabs, HSL, Stock Watch, Samples, Acquisition, Outreach, My Work, report list/detail, and dialogs were exercised at the normal laptop viewport. The full route smoke suite passes for 30 application routes plus the unauthenticated redirect check.

## Console — PASS

No warning or error whose source URL is the localhost application was captured during the final mobile/report/creator pass. Chrome extensions injected attributes such as Grammarly and `bis_*`, producing external hydration diagnostics from extension scripts; these are documented as browser-environment noise rather than application errors.

## Deployment — BLOCKED

- Deployment was not attempted because Auth, private storage, both controlled imports, metrics consistency, report finalization, and immutability are mandatory deployment gates and remain blocked.
- The Sites manifest contains the existing project identifier and no D1/R2 binding. The build succeeds.
- The prior publish returned an authentication-configuration HTTP 409. The repository contains no authentication bypass. Runtime Auth depends on production environment variables and cookie-preserving Supabase SSR clients.
- A production hostname has not been successfully issued, so exact Supabase Site URL and trusted Redirect URLs cannot yet be finalized or verified. The earlier 409 cannot be declared resolved without a gated publish attempt and provider response.

Production URL: BLOCKED

## Secret Rotation — BLOCKED

The previously exposed database password has not been rotated. Rotation requires the user to perform the final password-change submission in Supabase, followed by updating authorized `DATABASE_URL` environments and verifying that the old password fails. No old or proposed password is recorded here.

## Regression

- Lint: PASS (`npm run lint`)
- TypeScript: PASS (`npx tsc --noEmit`)
- Automated: PASS (16/16, `npm test`)
- Routes: PASS (`node scripts/smoke.mjs http://localhost:3000`)
- Build: PASS (`npm run build`)
- Isolated seeded database acceptance: NOT RERUN against production; prior Phase 1.6 result remains the safe evidence.

## Production Data Integrity — BLOCKED

- No real workbook was written, no public storage was introduced, RLS was not weakened, and no service-role credential was added.
- Controlled import tables remain untouched because upload did not run; therefore there are no orphan QA imports or duplicate performance rows from this acceptance attempt.
- Clearly tagged QA operational records and a Draft QA report remain intentionally in production so browser acceptance can resume. Cleanup is deferred until the blocked import/report tests finish; deleting them now would destroy the established test context.

## Remaining Blockers

1. Enable **Allow access to file URLs** for the ChatGPT browser extension, then run Shopee upload/import/idempotency followed by TikTok upload/import.
2. Provide an already signed-in Affiliate Manager browser session; do not share or store the password.
3. Complete metrics, target removal, cross-surface parity, lineage, report finalization/status/immutability, import activity, and logout after imports pass.
4. Save and verify the Peak Day record through the native date control, then complete readiness verification.
5. Rotate the Supabase database password through a user handoff, update authorized `DATABASE_URL` environments, and verify the old password is rejected.
6. Only after mandatory localhost gates pass, retry Sites publishing, capture the exact 409 response if it recurs, configure the issued trusted origin in Supabase Auth, and run deployed acceptance.

