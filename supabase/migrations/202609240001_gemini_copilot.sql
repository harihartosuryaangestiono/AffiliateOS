begin;

-- AI Request Logs Table (stores metadata only, never raw API keys or sensitive creator PII)
create table if not exists public.ai_request_logs(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id) on delete cascade,
  feature text not null check(feature in ('OUTREACH_DRAFT', 'CREATOR_INSIGHT', 'DAILY_BRIEF', 'REPORT_NARRATIVE', 'ASK_AFFILIATEOS')),
  model text not null,
  prompt_version text not null,
  status text not null check(status in ('SUCCESS', 'FAILED', 'RATE_LIMITED', 'TIMED_OUT', 'REJECTED')),
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  requested_by text not null default 'System',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_request_logs_workspace_created_idx on public.ai_request_logs(workspace_id, created_at desc);
create index if not exists ai_request_logs_feature_status_idx on public.ai_request_logs(workspace_id, feature, status);

alter table public.ai_request_logs enable row level security;
revoke all on public.ai_request_logs from anon, authenticated;
grant select, insert on public.ai_request_logs to authenticated;

create policy workspace_read on public.ai_request_logs for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_insert on public.ai_request_logs for insert to authenticated with check (workspace_id = public.current_workspace());

-- AI Feedback Table
create table if not exists public.ai_feedback(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id) on delete cascade,
  feature text not null check(feature in ('OUTREACH_DRAFT', 'CREATOR_INSIGHT', 'DAILY_BRIEF', 'REPORT_NARRATIVE', 'ASK_AFFILIATEOS')),
  request_id uuid references public.ai_request_logs(id) on delete set null,
  rating text not null check(rating in ('HELPFUL', 'NOT_HELPFUL')),
  note text,
  user_id text not null default 'System',
  created_at timestamptz not null default now()
);

create index if not exists ai_feedback_workspace_idx on public.ai_feedback(workspace_id, feature, created_at desc);

alter table public.ai_feedback enable row level security;
revoke all on public.ai_feedback from anon, authenticated;
grant select, insert on public.ai_feedback to authenticated;

create policy workspace_read on public.ai_feedback for select to authenticated using (workspace_id = public.current_workspace());
create policy workspace_insert on public.ai_feedback for insert to authenticated with check (workspace_id = public.current_workspace());

commit;
