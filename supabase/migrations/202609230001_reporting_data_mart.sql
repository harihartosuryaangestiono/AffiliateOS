begin;

create table if not exists public.report_datasets(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  report_id uuid not null,
  dataset_schema_version text not null default '1.0.0',
  dataset_json jsonb not null,
  created_at timestamptz not null default now(),
  foreign key(workspace_id, report_id) references public.reports(workspace_id, id)
);

create index if not exists report_datasets_workspace_report_idx on public.report_datasets(workspace_id, report_id, created_at desc);

alter table public.report_datasets enable row level security;
revoke all on public.report_datasets from anon, authenticated;
grant select, insert on public.report_datasets to authenticated;

create policy workspace_read on public.report_datasets for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_insert on public.report_datasets for insert to authenticated with check (workspace_id = public.current_workspace());

create function public.protect_report_dataset() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Report dataset records are immutable'; end $$;

create trigger protect_report_dataset before update or delete on public.report_datasets for each row execute function public.protect_report_dataset();

create table if not exists public.brand_mappings(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  product_id text not null,
  brand_id uuid references public.brands(id),
  status text not null check(status in ('mapped', 'unmapped', 'ambiguous')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_mappings_workspace_product_idx on public.brand_mappings(workspace_id, product_id);

alter table public.brand_mappings enable row level security;
revoke all on public.brand_mappings from anon, authenticated;
grant select, insert, update on public.brand_mappings to authenticated;

create policy workspace_read on public.brand_mappings for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_write on public.brand_mappings for all to authenticated using (workspace_id = public.current_workspace()) with check (workspace_id = public.current_workspace());

commit;
