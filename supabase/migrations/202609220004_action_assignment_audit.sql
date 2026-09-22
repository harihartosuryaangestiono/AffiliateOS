begin;

create or replace function public.audit_operational_action() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor text;
begin
  select name into actor from public.profiles where id=auth.uid();
  if tg_op='INSERT' then
    insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata)
    values(new.workspace_id,auth.uid(),coalesce(actor,'System'),'Action generated','operational_actions',new.id,jsonb_build_object('rule_id',new.rule_id,'priority',new.priority,'status',new.status));
    return new;
  end if;
  if new.source_task_id is distinct from old.source_task_id then
    insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata)
    values(new.workspace_id,auth.uid(),coalesce(actor,'System'),'Task created from action','operational_actions',new.id,jsonb_build_object('rule_id',new.rule_id,'priority',new.priority,'status',new.status));
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata)
    values(new.workspace_id,auth.uid(),coalesce(actor,'System'),'Action assigned','operational_actions',new.id,jsonb_build_object('rule_id',new.rule_id,'priority',new.priority,'status',new.status));
  end if;
  if new.status is distinct from old.status then
    insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata)
    values(new.workspace_id,auth.uid(),coalesce(actor,'System'),case new.status when 'IN_PROGRESS' then 'Action started' when 'SNOOZED' then 'Action snoozed' when 'RESOLVED' then 'Action resolved' when 'DISMISSED' then 'Action dismissed' when 'OPEN' then 'Action reopened' else 'Action updated' end,'operational_actions',new.id,jsonb_build_object('rule_id',new.rule_id,'priority',new.priority,'status',new.status));
  end if;
  if new.evidence is distinct from old.evidence then
    insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata)
    values(new.workspace_id,auth.uid(),coalesce(actor,'System'),'Action evidence updated','operational_actions',new.id,jsonb_build_object('rule_id',new.rule_id,'priority',new.priority,'status',new.status));
  end if;
  return new;
end $$;

commit;
