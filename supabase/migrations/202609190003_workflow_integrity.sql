begin;
alter table public.creator_outreach add column if not exists contacted_by uuid references auth.users(id);
create function public.track_acquisition_stage() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or new.acquisition_stage is distinct from old.acquisition_stage then
 insert into public.creator_acquisition_events(workspace_id,creator_id,name,status,source,created_by,updated_by) values(new.workspace_id,new.id,new.name,coalesce(new.acquisition_stage,'Prospect'),new.acquisition_source,auth.uid(),auth.uid());
 end if;
 return new;
end $$;
create trigger acquisition_history after insert or update of acquisition_stage on public.creators for each row execute function public.track_acquisition_stage();
create function public.operational_transition() returns trigger language plpgsql security definer set search_path='' as $$
declare stage text;
begin
 if tg_table_name='campaign_creators' then
   if new.status in ('Locked','Ready','Active','Completed') then
     if tg_op='INSERT' then new.locked_at=now();new.locked_by=auth.uid(); else new.locked_at=coalesce(old.locked_at,now());new.locked_by=coalesce(old.locked_by,auth.uid()); end if;
     stage=case when new.status in ('Active','Completed') then 'Activated' else 'Locked' end;
   end if;
 elsif tg_table_name='creator_outreach' then
   new.updated_by=auth.uid();
   if new.contacted_at is not null then new.contacted_by=auth.uid();stage='Contacted';end if;
   if new.status='Replied' then stage='Responded';elsif new.status='Interested' then stage='Interested';elsif new.status='Converted' then stage='Activated';end if;
 elsif tg_table_name='hsl_activations' then
   if not exists(select 1 from public.shopee_accounts a where a.workspace_id=new.workspace_id and a.id=new.shopee_account_id and a.creator_id=new.creator_id) then raise exception 'Shopee account must belong to creator';end if;
   if exists(select 1 from public.campaigns c where c.workspace_id=new.workspace_id and c.id=new.campaign_id and c.marketplace='TikTok') then raise exception 'HSL requires Shopee campaign';end if;
   new.updated_by=auth.uid();
 end if;
 if stage is not null then
 update public.creators set acquisition_stage=stage where workspace_id=new.workspace_id and id=new.creator_id and array_position(array['Prospect','Contacted','Responded','Interested','Locked','Activated','Affiliate With Sales'],coalesce(acquisition_stage,'Prospect'))<array_position(array['Prospect','Contacted','Responded','Interested','Locked','Activated','Affiliate With Sales'],stage);
 end if;
 return new;
end $$;
create trigger activation_transition before insert or update on public.campaign_creators for each row execute function public.operational_transition();
create trigger outreach_transition before insert or update on public.creator_outreach for each row execute function public.operational_transition();
create trigger hsl_integrity before insert or update on public.hsl_activations for each row execute function public.operational_transition();
create function public.sales_acquisition() returns trigger language plpgsql security definer set search_path='' as $$
declare creator uuid;
begin
 if new.orders>0 then
 if tg_table_name='shopee_performance_daily' then select creator_id into creator from public.shopee_accounts where id=new.account_id and workspace_id=new.workspace_id; else select creator_id into creator from public.tiktok_accounts where id=new.account_id and workspace_id=new.workspace_id;end if;
 update public.creators set acquisition_stage='Affiliate With Sales' where id=creator and workspace_id=new.workspace_id and acquisition_stage is distinct from 'Affiliate With Sales';
 end if;return new;
end $$;
create trigger sales_stage after insert on public.shopee_performance_daily for each row execute function public.sales_acquisition();
create trigger sales_stage after insert on public.tiktok_performance_daily for each row execute function public.sales_acquisition();
alter table public.workspace_preferences add constraint valid_threshold_order check(critical_stock<=low_stock and critical_threshold<=decline_threshold);
create function public.audit_operational_change() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb;actor text;
begin
 if tg_op='DELETE' then r=to_jsonb(old);else r=to_jsonb(new);end if;
 select name into actor from public.profiles where id=auth.uid();
 insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata) values((r->>'workspace_id')::uuid,auth.uid(),coalesce(actor,'System'),replace(tg_table_name,'_',' ')||' '||lower(tg_op)||coalesce(' · '||(r->>'status'),''),tg_table_name,(r->>'id')::uuid,jsonb_build_object('status',r->>'status'));
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger audit_report_change after insert or update on public.reports for each row execute function public.audit_operational_change();
commit;
