begin;

alter table public.workspace_preferences
  add column if not exists performance_decline_threshold numeric not null default 30,
  add column if not exists minimum_baseline_gmv numeric not null default 1000000,
  add column if not exists performance_spike_threshold numeric not null default 50,
  add column if not exists minimum_sales_days integer not null default 2,
  add column if not exists hsl_upcoming_days integer not null default 2,
  add column if not exists first_follow_up_days integer not null default 3,
  add column if not exists second_follow_up_days integer not null default 7,
  add column if not exists no_response_days integer not null default 14,
  add column if not exists reactivation_days integer not null default 30,
  add column if not exists peak_day_warning_days integer not null default 7;

create table public.operational_actions(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  rule_id text not null,
  category text not null,
  title text not null,
  reason text not null,
  recommended_action text not null,
  priority text not null check(priority in ('P0','P1','P2','P3')),
  severity text not null check(severity in ('Critical','High','Medium','Low')),
  marketplace text,
  entity_type text,
  entity_id uuid,
  deduplication_key text not null,
  status text not null default 'OPEN' check(status in ('OPEN','IN_PROGRESS','SNOOZED','RESOLVED','DISMISSED')),
  evidence jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  generated_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  assigned_to uuid references public.profiles(id),
  started_at timestamptz,
  snoozed_until timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  resolution_note text,
  source_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,id),
  unique(workspace_id,deduplication_key),
  foreign key(workspace_id,assigned_to) references public.profiles(workspace_id,id),
  foreign key(workspace_id,resolved_by) references public.profiles(workspace_id,id),
  foreign key(workspace_id,source_task_id) references public.tasks(workspace_id,id)
);
create index operational_actions_workspace_priority_idx on public.operational_actions(workspace_id,status,priority,due_at);
alter table public.operational_actions enable row level security;
revoke all on public.operational_actions from anon,authenticated;
grant select,insert,update on public.operational_actions to authenticated;
create policy workspace_read on public.operational_actions for select to authenticated using(workspace_id=public.current_workspace());
create policy operator_insert on public.operational_actions for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy operator_update on public.operational_actions for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));

create function public.guard_operational_action() returns trigger language plpgsql set search_path='' as $$
begin
  new.updated_at=now();
  if tg_op='UPDATE' then
    if new.workspace_id<>old.workspace_id or new.rule_id<>old.rule_id or new.deduplication_key<>old.deduplication_key then raise exception 'Action identity is immutable'; end if;
    if new.status='IN_PROGRESS' and old.status is distinct from new.status then new.started_at=now(); end if;
    if new.status in ('RESOLVED','DISMISSED') and old.status is distinct from new.status then new.resolved_at=now(); new.resolved_by=auth.uid(); end if;
    if old.status in ('RESOLVED','DISMISSED') and new.status='OPEN' then new.resolved_at=null;new.resolved_by=null;new.resolution_note=null; end if;
  end if;
  return new;
end $$;
create trigger guard_operational_action before insert or update on public.operational_actions for each row execute function public.guard_operational_action();

create function public.audit_operational_action() returns trigger language plpgsql security definer set search_path='' as $$
declare actor text; action_name text;
begin
  select name into actor from public.profiles where id=auth.uid();
  action_name=case when tg_op='INSERT' then 'Action generated' when new.status='IN_PROGRESS' and old.status is distinct from new.status then 'Action started' when new.status='SNOOZED' and old.status is distinct from new.status then 'Action snoozed' when new.status='RESOLVED' and old.status is distinct from new.status then 'Action resolved' when new.status='DISMISSED' and old.status is distinct from new.status then 'Action dismissed' when new.source_task_id is distinct from old.source_task_id then 'Task created from action' else 'Action evidence updated' end;
  insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata) values(new.workspace_id,auth.uid(),coalesce(actor,'System'),action_name,'operational_actions',new.id,jsonb_build_object('rule_id',new.rule_id,'priority',new.priority,'status',new.status));
  return new;
end $$;
create trigger audit_operational_action after insert or update on public.operational_actions for each row execute function public.audit_operational_action();

commit;
