# AffiliateOS — Phase 1

A light-mode affiliate operations workspace with separate TikTok and Shopee identities, performance, and import mappings.

## Run locally

Use Node.js 22.13+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

The Sites preview runs on Vinext, an App Router-compatible Cloudflare runtime. The project also includes the current stable Next.js package and conventional commands:

```sh
npm run dev:next
npm run build:next
npm run start:next
```

The application is in the `web` directory. The repository-root `.openai` directory is the original workspace configuration; the deployment manifest in this folder is the application manifest.

## Demo behavior

The user selected a clearly labeled demo workspace. With no Supabase environment, the app opens directly to `/dashboard`; live sign-in is disabled. Demo entity changes, relationships, import review metadata, raw rows, and activity persist in this browser’s localStorage. Original uploaded files persist in IndexedDB. This is a demo persistence adapter, not shared production storage. Clearing browser storage resets the demo. No marketplace API is contacted.

Fixtures contain four clients, six brands, eight campaigns, twenty realistic creator identities, separate marketplace accounts, products, tasks, and a sample September 2026 performance period. All demo identities, emails, and metrics are illustrative. September data covers a complete simulated month, including dates after September 8.

## Included workflows

- Dashboard with marketplace totals, Recharts trends, contribution, campaign ranking, top creators, tasks, and activity.
- Client, brand, campaign, creator, product, and task creation, editing, deletion, searching, sorting, status filtering, pagination, and column visibility.
- Detail pages and separate TikTok/Shopee creator accounts; creator association with campaigns.
- Dedicated marketplace workspaces and searchable global command palette (Command/Ctrl K).
- CSV/XLSX upload, preview, independent mapping, validation, staged import history, original demo-file download, and raw audit download.
- Profiles, role descriptions, and role-based write controls in the application, server routes, and PostgreSQL RLS.
- Responsive sidebar, tables, loading skeletons, actionable errors, and empty states.

## Deliberately unfinished workflows

Imported reports are **saved for review**. They do not alter analytics. Account/campaign matching, normalization, duplicate resolution against existing data, and committing normalized rows are future work. A completed demo import in the seed represents fixture provenance; its original source file is not available.

Individual content libraries, campaign product assignment UI, campaign/client attachments, report generation and exports, user invitations and role administration UI, marketplace APIs, and AI features are explicitly labeled Coming Soon. Reports have a normalized database foundation, not a report-generation implementation. Marketplace product IDs are separate schema mappings; product-mapping UI is future work.

## Connect Supabase

1. Create a Supabase project. Apply `supabase/migrations/202609080001_schema_v01.sql` in its SQL editor or through the Supabase CLI.
2. Create authentication users through Supabase Auth. Create a workspace and a profile for each user. Profile ID must equal that user’s Auth UUID. Assign one initial Admin through the SQL editor. Do not put an Admin role in editable Auth user metadata.
3. Copy `.env.example` to `.env.local` and configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. For Sites, set these as production runtime environment values and redeploy. Never expose service-role keys to the browser.
4. Optionally load `supabase/seed.sql` after setting its documented workspace session variable. It uses the same fixtures as the browser demo.
5. Sign in at `/login`. When Supabase is configured, the demo fallback is disabled; failed queries do not silently show fixtures.

Example membership bootstrap (replace values with your actual IDs and email):

```sql
insert into public.workspaces(name) values ('AffiliateOS Workspace') returning id;
insert into public.profiles(id,workspace_id,name,email,role)
values ('AUTH_USER_UUID','WORKSPACE_UUID','Your name','you@company.com','Admin');
```

Live Supabase Auth, RLS, migrations, uploads, and multi-user persistence require validation against the configured project. They were not exercised during the demo build because no project credentials were supplied. Before a real rollout, test role isolation and cross-workspace access using separate Auth users, configure account recovery and invitation policy, and validate imports using actual team report files.

## Data architecture

Schema version 0.1 uses UUIDs, workspace-scoped composite foreign keys, timestamps, independent marketplace accounts, independent daily performance tables, source import attribution, raw import staging, and trigger-based activity logging. Creator master records contain human identity fields. Marketplace metrics belong to marketplace tables. Shared totals are computed at the presentation/query layer.

`clients → brands → campaigns`; products belong to brands. Campaign-creator and campaign-product joins remain separate. Storage uses the private `workspace-files` bucket and workspace-prefixed object keys. Raw rows and mapping records are insert-only for app users. `stage_import` saves a complete staging job in one PostgreSQL transaction. Normalization should later use an atomic, idempotent, marketplace-specific process.

The server query loader paginates Supabase results so default API row limits do not silently truncate totals. This Phase 1 loader is intentionally simple; production-scale analytics should move to database aggregation queries and period-scoped loading rather than transferring full history.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run build:next
```

Import validation tests exercise CSV quoting/newlines, malformed rows, required mappings, invalid dates, negative values, duplicate rows, and separate marketplace fields. HTTP smoke checks cover all requested routes and representative detail pages. Browser interaction testing and live Supabase testing are not claimed.
