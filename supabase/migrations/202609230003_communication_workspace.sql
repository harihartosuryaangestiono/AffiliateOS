begin;

-- Communication Templates Table
create table if not exists public.communication_templates(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id) on delete cascade,
  name text not null,
  category text not null check(category in ('FIRST_OUTREACH', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'NO_RESPONSE', 'REAPPROACH', 'INTERESTED', 'SAMPLE_FOLLOW_UP', 'HSL', 'CAMPAIGN_INVITE', 'CUSTOM')),
  channel text not null check(channel in ('WHATSAPP', 'INSTAGRAM_DM', 'TIKTOK_DM', 'EMAIL', 'OTHER')),
  marketplace text not null default 'Multi-platform' check(marketplace in ('Shopee', 'TikTok', 'Multi-platform')),
  campaign_id text,
  client_id text,
  body text not null,
  is_active boolean not null default true,
  current_version integer not null default 1,
  created_by text not null default 'System',
  updated_by text not null default 'System',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communication_templates_workspace_idx on public.communication_templates(workspace_id, category, is_active);

alter table public.communication_templates enable row level security;
revoke all on public.communication_templates from anon, authenticated;
grant select, insert, update, delete on public.communication_templates to authenticated;

create policy workspace_read on public.communication_templates for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_write on public.communication_templates for all to authenticated using (workspace_id = public.current_workspace()) with check (workspace_id = public.current_workspace());

-- Communication Template Versions Table
create table if not exists public.communication_template_versions(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id) on delete cascade,
  template_id uuid not null references public.communication_templates(id) on delete cascade,
  version integer not null,
  body text not null,
  created_by text not null default 'System',
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create index if not exists communication_template_versions_idx on public.communication_template_versions(workspace_id, template_id, version);

alter table public.communication_template_versions enable row level security;
revoke all on public.communication_template_versions from anon, authenticated;
grant select, insert on public.communication_template_versions to authenticated;

create policy workspace_read on public.communication_template_versions for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_insert on public.communication_template_versions for insert to authenticated with check (workspace_id = public.current_workspace());

-- Communication Events Table
create table if not exists public.communication_events(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id) on delete cascade,
  creator_id text not null,
  marketplace_account_id text,
  channel text not null check(channel in ('WHATSAPP', 'INSTAGRAM_DM', 'TIKTOK_DM', 'EMAIL', 'OTHER')),
  template_id text,
  template_version integer,
  event_type text not null check(event_type in ('CONTACTED', 'RESPONDED', 'FOLLOW_UP', 'NOTE', 'PREPARATION')),
  contacted_at timestamptz not null default now(),
  actor text not null default 'System',
  campaign_id text,
  outreach_state text,
  response_state text,
  note text,
  next_action text,
  next_action_date date,
  created_at timestamptz not null default now()
);

create index if not exists communication_events_workspace_creator_idx on public.communication_events(workspace_id, creator_id, contacted_at desc);

alter table public.communication_events enable row level security;
revoke all on public.communication_events from anon, authenticated;
grant select, insert, update on public.communication_events to authenticated;

create policy workspace_read on public.communication_events for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_write on public.communication_events for all to authenticated using (workspace_id = public.current_workspace()) with check (workspace_id = public.current_workspace());

-- Communication Preparations Table
create table if not exists public.communication_preparations(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id) on delete cascade,
  batch_id text not null,
  creator_id text not null,
  channel text not null,
  template_id text not null,
  template_version integer not null default 1,
  prepared_body text not null,
  unresolved_variables text[] not null default '{}',
  status text not null default 'READY' check(status in ('READY', 'NEEDS_REVIEW', 'SKIPPED', 'CONTACTED')),
  created_by text not null default 'System',
  created_at timestamptz not null default now()
);

create index if not exists communication_preparations_batch_idx on public.communication_preparations(workspace_id, batch_id);

alter table public.communication_preparations enable row level security;
revoke all on public.communication_preparations from anon, authenticated;
grant select, insert, update, delete on public.communication_preparations to authenticated;

create policy workspace_read on public.communication_preparations for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_write on public.communication_preparations for all to authenticated using (workspace_id = public.current_workspace()) with check (workspace_id = public.current_workspace());

commit;
