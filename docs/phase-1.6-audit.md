# AffiliateOS Phase 1.6 Audit

## Architecture

Phase 1.6 extends the accepted Phase 1.5 application without replacing its navigation, visual system, CRUD modules, or workflow state machine. The new data path is marketplace file → marketplace-specific parser → structured validation → canonical rows → account/campaign/product matching → daily performance records → shared metrics engine → dashboard and reports. Raw rows and their mapping remain separate from normalized analytics.

The supplied workbooks, internal tracker, client deck, and weekly document were inspected read-only to identify real field names, report KPIs, routines, and pain points. No source row, creator contact, address, phone number, or other real operational data was copied into the repository, fixtures, demo seed, logs, or test database.

## Supabase

The browser/server clients support both the existing server variables and `NEXT_PUBLIC_SUPABASE_URL` with either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the existing anon-key alias. No service-role key is used by client code. The supplied configuration was separated locally into an HTTPS Supabase API URL and a PostgreSQL `DATABASE_URL`, with `AFFILIATEOS_MODE=production`. The live Auth and REST endpoints respond correctly; anonymous profile access is denied. The production workspace now has two Auth-backed profiles: an Admin and an Affiliate Manager.

## Database

`202609190006_production_data_foundation.sql` is additive. It adds import source metadata and periods, reusable mapping profiles, raw-to-normalized lineage, database-managed metric targets, performance indexes, a 50,000-row guard, order-item idempotency, and the atomic `process_import_v16` RPC. Existing Phase 1.5 tables and data are preserved.

All seven migrations from the baseline schema through Phase 1.6 were applied to the live Supabase project and recorded in `supabase_migrations.schema_migrations`. The resulting live schema has 44 public tables, all with RLS enabled, the expected import and mutation RPCs, and a 50 MB private workspace-file bucket. No demo seed or supplied operational workbook data was inserted into production.

The same migrations were also applied to a fresh isolated PostgreSQL database, followed by the demo seed and database acceptance suite. Result: PASS.

## RLS

Workspace-scoped read/write policies were verified in PostgreSQL for the new mapping, lineage, and metric-target tables. A second-workspace user could not read Phase 1.6 records. A Viewer could not mutate protected operational data. Existing role, immutable snapshot, stock history, and relationship checks also passed.

Live Supabase RLS was tested inside a rolled-back transaction. The suite verified atomic import processing, multi-item order idempotency, raw-to-normalized lineage, reusable mappings, targets, Viewer mutation denial, and cross-workspace isolation. The transaction left zero QA users, workspaces, imports, and targets behind.

The production memberships were also smoke-tested through the authenticated role. The Admin could create a workspace-scoped client, and the Affiliate Manager could read it through the shared-workspace policy. The transaction was rolled back and left no test client behind.

## Demo vs Production

`AFFILIATEOS_MODE=demo` uses the clearly labeled synthetic browser workspace. `AFFILIATEOS_MODE=production` requires working Supabase configuration and database queries; missing configuration throws an explicit error and does not silently fall back to demo data or localStorage. `.env.example` documents both modes without credentials.

## Import Engine

TikTok and Shopee use independent field definitions, aliases, and business rules.

- TikTok detects the supplied Payment Order headers and calculates Affiliate GMV from `Payment Amount`. Returned/refunded or ineligible transactions are excluded with row-level warnings.
- Shopee detects the supplied Payment Order headers and calculates Affiliate GMV as `Purchase Value(Rp) - Refund Amount(Rp)`. Invalid/unverified/cancelled/refunded transactions are excluded with row-level warnings.
- CSV and XLSX are supported up to 50 MB, 50,000 rows, and 100 columns. The XLSX reader selects the worksheet with the strongest marketplace header match.
- Validation reports severity, row, field, source value, reason, and suggested action. Valid rows can continue while invalid rows remain traceable.
- File hashes and order + product + item keys prevent reprocessing while allowing legitimate multi-item orders.
- Original files, raw rows, selected mappings, validation results, normalized records, and raw-to-normalized lineage are persisted atomically in production mode.

Read-only validation against the supplied combined workbook detected 16 mapped fields for each marketplace. It parsed 4,173 TikTok rows and 2,967 Shopee rows without storing their content. Synthetic fixtures cover valid and excluded rows using the real header structures.

## Metrics Engine

Dashboard and reports use the same metrics function over normalized daily performance. It calculates Affiliate GMV, orders, units, affiliates with sales, active creators, ASP, ABS, previous comparable GMV, growth, target, and achievement. TikTok and Shopee remain independently queryable and can be combined only at the presentation layer.

Targets come from `metric_targets`, with existing campaign targets retained as a compatibility fallback. Missing targets return `null` and render as “Not set”; zero is not treated as a fabricated target. Dashboard KPI cards link to their supporting views.

## H-2

Reporting periods and cutoff logic are centralized in `periodRange`, use `Asia/Jakarta`, and support MTD, Previous MTD, Full Previous Month, and Custom. The default cutoff is H-2 from workspace preferences. Month boundaries and unequal comparable-month lengths are tested.

## Reports

Weekly/monthly drafts calculate metrics from processed rows through the selected cutoff. Reports show Indonesian-friendly dates, database targets, marketplace breakdown, narrative sections, and source-import lineage. Finalization stores metrics, marketplace results, source metadata, narratives, actor, and period in an immutable snapshot. Later imports cannot change finalized figures; only Ready → Presented → Archived status progression remains allowed.

## Operational Modules

Creator acquisition, outreach, campaign locking, HSL/SKU assignments, stock snapshots, sample seeding, Peak Day readiness, tasks, planning, alerts, and recurring work remain integrated with the same production mutation RPC and workspace data loader. Phase 1.6 adds database-managed reporting targets under Settings. The supplied routine and pain points informed the existing Monday reporting flow, creator outreach, and HSL stock surfaces; automatic WhatsApp broadcast and marketplace stock API sync remain future integrations.

## Testing

- Lint: PASS, zero errors.
- TypeScript: PASS, zero errors.
- Automated tests: PASS, 15/15.
- Production build: PASS with vinext.
- Route smoke test: PASS, 30/30 expected routes plus unknown-route 404.
- PostgreSQL migration/RLS/integration test: PASS on a fresh isolated database and the live Supabase project.
- Supabase API health: PASS; Auth returned 200, anonymous protected-table access returned 401.
- Production application boundary: PASS; login returned 200, an unauthenticated dashboard request redirected to login, and invalid live credentials returned 401.
- Real-workbook parser validation: PASS read-only for both marketplace sheets; invalid and excluded records were surfaced rather than hidden.
- Browser QA: PASS on dashboard and report workflow at desktop width and 390×844 mobile width; report creation/finalization and lineage display worked; no browser console warnings or errors were found.

## Deployment

No production deployment is claimed. The live database foundation and initial workspace memberships are installed. Browser sign-in, authenticated CRUD, and a controlled real file upload remain to be verified with the users' own credentials. The previous Sites deployment attempt also returned an internal authentication-configuration 409 and was not bypassed or weakened.

## Known Limitations

- Live authenticated file upload and application CRUD still require a browser session using a provisioned user's password.
- Sites production publishing remains blocked by the existing authentication-configuration conflict.
- Marketplace API ingestion, automatic WhatsApp broadcast, and automatic livestream stock sync are not part of the file-based Phase 1.6 pipeline.

## Coming Next

Sign in with a provisioned user, then run authenticated CRUD, a controlled file upload, dashboard/report parity, and storage verification. Finally reconcile Sites authentication and deploy the verified production version.
