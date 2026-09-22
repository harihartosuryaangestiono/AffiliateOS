begin;
create table if not exists public.report_exports(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  report_id uuid not null,
  foreign key(workspace_id,report_id) references public.reports(workspace_id,id),
  export_type text not null check(export_type in ('Excel','PowerPoint')),
  template_id text not null,
  template_version text not null,
  actor_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists report_exports_workspace_report_idx on public.report_exports(workspace_id,report_id,created_at desc);
alter table public.report_exports enable row level security;
revoke all on public.report_exports from anon,authenticated;
grant select,insert on public.report_exports to authenticated;
create policy workspace_read on public.report_exports for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.report_exports for insert to authenticated with check(workspace_id=public.current_workspace() and actor_id=auth.uid());
create function public.protect_report_export() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Report export audit records are immutable'; end $$;
create trigger protect_report_export before update or delete on public.report_exports for each row execute function public.protect_report_export();
create function public.audit_report_export_v2() returns trigger language plpgsql security definer set search_path='' as $$
declare actor text;
begin
  select name into actor from public.profiles where id=new.actor_id;
  insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata)
  values(new.workspace_id,new.actor_id,coalesce(actor,'System'),new.export_type||' exported','reports',new.report_id,jsonb_build_object('export_type',new.export_type,'template_id',new.template_id,'template_version',new.template_version));
  return new;
end $$;
create trigger audit_report_export after insert on public.report_exports for each row execute function public.audit_report_export_v2();
create function public.audit_report_finalized_v2() returns trigger language plpgsql security definer set search_path='' as $$
declare actor text;
begin
  select name into actor from public.profiles where id=auth.uid();
  insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata)
  values(new.workspace_id,auth.uid(),coalesce(actor,'System'),'Report finalized','reports',new.report_id,jsonb_build_object('snapshot_id',new.id));
  return new;
end $$;
create trigger audit_report_finalized after insert on public.report_snapshots for each row execute function public.audit_report_finalized_v2();
commit;
