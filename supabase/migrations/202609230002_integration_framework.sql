begin;

create table if not exists public.integration_connections(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  provider text not null,
  marketplace text not null,
  status text not null check(status in ('NOT_CONFIGURED', 'CONFIGURED', 'CONNECTED', 'SYNCING', 'HEALTHY', 'DEGRADED', 'ERROR', 'REAUTH_REQUIRED', 'DISABLED')),
  capabilities jsonb not null default '[]'::jsonb,
  external_account_id text,
  external_account_label text,
  last_sync_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_connections_workspace_idx on public.integration_connections(workspace_id, provider);

alter table public.integration_connections enable row level security;
revoke all on public.integration_connections from anon, authenticated;
grant select, insert, update on public.integration_connections to authenticated;

create policy workspace_read on public.integration_connections for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_write on public.integration_connections for all to authenticated using (workspace_id = public.current_workspace()) with check (workspace_id = public.current_workspace());

create table if not exists public.integration_sync_runs(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  connection_id text not null,
  provider text not null,
  capability text not null,
  status text not null check(status in ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED')),
  trigger_type text not null check(trigger_type in ('MANUAL', 'SCHEDULED', 'RETRY', 'BACKFILL')),
  period_start date not null,
  period_end date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched_records integer not null default 0,
  accepted_records integer not null default 0,
  rejected_records integer not null default 0,
  duplicate_records integer not null default 0,
  normalized_records integer not null default 0,
  source_fingerprint text,
  error_code text,
  error_summary text,
  initiated_by text not null default 'System',
  created_at timestamptz not null default now()
);

create index if not exists integration_sync_runs_workspace_idx on public.integration_sync_runs(workspace_id, provider, created_at desc);

alter table public.integration_sync_runs enable row level security;
revoke all on public.integration_sync_runs from anon, authenticated;
grant select, insert, update on public.integration_sync_runs to authenticated;

create policy workspace_read on public.integration_sync_runs for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_insert on public.integration_sync_runs for insert to authenticated with check (workspace_id = public.current_workspace());

commit;
