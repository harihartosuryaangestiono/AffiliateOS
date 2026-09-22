begin;

create table if not exists public.business_rules(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  rule_key text not null,
  canonical_metric_id text not null,
  name text not null,
  marketplace text not null check(marketplace in ('TikTok','Shopee','Multi-platform')),
  scope_type text not null check(scope_type in ('GLOBAL','MARKETPLACE','CLIENT','REPORT_TEMPLATE')),
  client_id uuid,
  report_template_id text,
  question text not null,
  evidence_summary text not null,
  operational_behavior text not null,
  possible_definitions jsonb not null default '[]'::jsonb check(jsonb_typeof(possible_definitions)='array'),
  impact text[] not null default '{}',
  selected_definition text,
  status text not null default 'OPEN' check(status in ('OPEN','CONFIRMED','DEFERRED','SUPERSEDED')),
  effective_from date,
  effective_until date,
  version integer not null default 1 check(version>0),
  supersedes_id uuid,
  superseded_by_id uuid,
  notes text,
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,id),
  unique(workspace_id,rule_key,version),
  foreign key(workspace_id,client_id) references public.clients(workspace_id,id),
  foreign key(workspace_id,supersedes_id) references public.business_rules(workspace_id,id),
  foreign key(workspace_id,superseded_by_id) references public.business_rules(workspace_id,id),
  check(effective_until is null or effective_from is null or effective_until>=effective_from),
  check((scope_type='CLIENT' and client_id is not null) or (scope_type<>'CLIENT' and client_id is null)),
  check((scope_type='REPORT_TEMPLATE' and report_template_id is not null) or (scope_type<>'REPORT_TEMPLATE' and report_template_id is null)),
  check(status<>'CONFIRMED' or (selected_definition is not null and effective_from is not null))
);
create index if not exists business_rules_workspace_metric_idx on public.business_rules(workspace_id,canonical_metric_id,marketplace,status,effective_from);
alter table public.business_rules enable row level security;
revoke all on public.business_rules from anon,authenticated;
grant select,insert,update on public.business_rules to authenticated;
create policy workspace_read on public.business_rules for select to authenticated using(workspace_id=public.current_workspace());
create policy admin_insert on public.business_rules for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role()='Admin');
create policy admin_update on public.business_rules for update to authenticated using(workspace_id=public.current_workspace() and public.current_role()='Admin') with check(workspace_id=public.current_workspace() and public.current_role()='Admin');

create function public.guard_business_rule() returns trigger language plpgsql set search_path='' as $$
begin
  new.updated_at=now();
  if tg_op='UPDATE' then
    if new.workspace_id<>old.workspace_id or new.rule_key<>old.rule_key or new.canonical_metric_id<>old.canonical_metric_id or new.version<>old.version or new.created_by<>old.created_by then
      raise exception 'Business rule identity and version are immutable';
    end if;
    if old.status in ('CONFIRMED','DEFERRED','SUPERSEDED') and new.status=old.status and (to_jsonb(new)-'updated_at')<>(to_jsonb(old)-'updated_at') then
      raise exception 'Decided business rules are immutable; create a new version';
    end if;
    if new.status='SUPERSEDED' and new.superseded_by_id is null then raise exception 'A superseding version is required'; end if;
  end if;
  if new.status='CONFIRMED' then
    if new.selected_definition is null or new.effective_from is null then raise exception 'Confirmed rules require a definition and effective date'; end if;
    if new.selected_definition='UNRESOLVED' or not exists(select 1 from jsonb_array_elements(new.possible_definitions) option where option->>'key'=new.selected_definition) then raise exception 'Choose a valid resolved definition'; end if;
    new.confirmed_by=auth.uid(); new.confirmed_at=now();
  elsif new.status='DEFERRED' then
    new.selected_definition=null; new.confirmed_by=auth.uid(); new.confirmed_at=now();
  elsif new.status='OPEN' then
    new.selected_definition=null; new.confirmed_by=null; new.confirmed_at=null;
  elsif new.status='SUPERSEDED' then
    new.confirmed_by=old.confirmed_by; new.confirmed_at=old.confirmed_at;
  end if;
  return new;
end $$;
create trigger guard_business_rule before insert or update on public.business_rules for each row execute function public.guard_business_rule();

create function public.audit_business_rule() returns trigger language plpgsql security definer set search_path='' as $$
declare actor text; action_name text;
begin
  select name into actor from public.profiles where id=auth.uid();
  action_name=case
    when tg_op='INSERT' then 'Business rule created'
    when new.status='CONFIRMED' and old.status is distinct from new.status then 'Business rule confirmed'
    when new.status='DEFERRED' and old.status is distinct from new.status then 'Business rule deferred'
    when new.status='SUPERSEDED' and old.status is distinct from new.status then 'Business rule superseded'
    when new.effective_from is distinct from old.effective_from or new.effective_until is distinct from old.effective_until then 'Business rule effective date changed'
    else 'Business rule updated' end;
  insert into public.activity_logs(workspace_id,user_id,actor_name,action,entity_type,entity_id,metadata)
  values(new.workspace_id,auth.uid(),coalesce(actor,'System'),action_name,'business_rules',new.id,jsonb_build_object('rule_key',new.rule_key,'version',new.version,'status',new.status));
  return new;
end $$;
create trigger audit_business_rule after insert or update on public.business_rules for each row execute function public.audit_business_rule();

create function public.decide_business_rule(rule_id uuid,decision text,definition text default null,effective_date date default null,decision_notes text default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare rule public.business_rules;
begin
  if public.current_role()<>'Admin' then raise exception 'Admin access required'; end if;
  if decision not in ('CONFIRMED','DEFERRED') then raise exception 'Invalid decision'; end if;
  select * into rule from public.business_rules where id=rule_id and workspace_id=public.current_workspace() for update;
  if rule.id is null then raise exception 'Business rule not found'; end if;
  if rule.status<>'OPEN' then raise exception 'Only open rules can be decided'; end if;
  if decision='CONFIRMED' and (definition is null or effective_date is null) then raise exception 'Definition and effective date required'; end if;
  if decision='CONFIRMED' and (definition='UNRESOLVED' or not exists(select 1 from jsonb_array_elements(rule.possible_definitions) option where option->>'key'=definition)) then raise exception 'Choose a valid resolved definition'; end if;
  update public.business_rules set status=decision,selected_definition=case when decision='CONFIRMED' then definition else null end,effective_from=case when decision='CONFIRMED' then effective_date else effective_from end,notes=decision_notes where id=rule.id and workspace_id=rule.workspace_id;
  return rule.id;
end $$;
revoke all on function public.decide_business_rule(uuid,text,text,date,text) from public;
grant execute on function public.decide_business_rule(uuid,text,text,date,text) to authenticated;

create function public.supersede_business_rule(rule_id uuid,new_effective_from date) returns uuid language plpgsql security invoker set search_path='' as $$
declare old_rule public.business_rules; new_id uuid:=gen_random_uuid();
begin
  if public.current_role()<>'Admin' then raise exception 'Admin access required'; end if;
  select * into old_rule from public.business_rules where id=rule_id and workspace_id=public.current_workspace() for update;
  if old_rule.id is null then raise exception 'Business rule not found'; end if;
  if old_rule.status='SUPERSEDED' then raise exception 'Rule already superseded'; end if;
  if new_effective_from is null then raise exception 'New effective date required'; end if;
  insert into public.business_rules(id,workspace_id,rule_key,canonical_metric_id,name,marketplace,scope_type,client_id,report_template_id,question,evidence_summary,operational_behavior,possible_definitions,impact,status,effective_from,version,supersedes_id,notes)
  values(new_id,old_rule.workspace_id,old_rule.rule_key,old_rule.canonical_metric_id,old_rule.name,old_rule.marketplace,old_rule.scope_type,old_rule.client_id,old_rule.report_template_id,old_rule.question,old_rule.evidence_summary,old_rule.operational_behavior,old_rule.possible_definitions,old_rule.impact,'OPEN',new_effective_from,old_rule.version+1,old_rule.id,'New version awaiting confirmation');
  update public.business_rules set status='SUPERSEDED',superseded_by_id=new_id,effective_until=new_effective_from-1 where id=old_rule.id and workspace_id=old_rule.workspace_id;
  return new_id;
end $$;
revoke all on function public.supersede_business_rule(uuid,date) from public;
grant execute on function public.supersede_business_rule(uuid,date) to authenticated;

insert into public.business_rules(workspace_id,rule_key,canonical_metric_id,name,marketplace,scope_type,question,evidence_summary,operational_behavior,possible_definitions,impact,status,version,created_by)
select w.id,q.rule_key,q.metric_id,q.name,q.marketplace,q.scope_type,q.question,q.evidence,q.behavior,q.options::jsonb,q.impact,'OPEN',1,p.id
from public.workspaces w
join lateral (select id from public.profiles where workspace_id=w.id and role='Admin' order by created_at limit 1) p on true
cross join (values
 ('BQ-01','shopee.affiliate_gmv','Shopee Affiliate Revenue','Shopee','MARKETPLACE','Should Shopee Affiliate Revenue use gross verified Purchase Value or subtract Refund Amount?','The supplied Shopee Simba report for 1–6 August uses full verified Purchase Value before refunds.','Operational imports currently calculate Purchase Value less Refund Amount.','[{"key":"GROSS_VERIFIED","label":"Gross verified purchase value"},{"key":"NET_REFUND","label":"Purchase value after refund"},{"key":"TEMPLATE_SPECIFIC","label":"Definition depends on report template"},{"key":"UNRESOLVED","label":"Keep unresolved"}]','{"Affiliate Revenue","ASP","ROI","Cost Ratio","Contribution","Growth"}'::text[]),
 ('BQ-02','shopee.reporting_date','Shopee Reporting Date','Shopee','MARKETPLACE','Which Shopee timestamp controls the reporting period?','The validated week matches Order Time; completion, conversion, and deduction timestamps also exist.','Operational imports use the explicitly mapped date field.','[{"key":"ORDER_TIME","label":"Order Time"},{"key":"COMPLETED_TIME","label":"Order Completed Time"},{"key":"CONVERSION_TIME","label":"Conversion Completed Time"},{"key":"TEMPLATE_SPECIFIC","label":"Definition depends on report template"},{"key":"UNRESOLVED","label":"Keep unresolved"}]','{"Period membership","H-2","Growth"}'::text[]),
 ('BQ-03','shopee.quantity','Shopee Quantity','Shopee','MARKETPLACE','Should Shopee Qty count converted order-item lines or product units?','The historical Qty of 420 equals Valid positive-purchase rows, not the sum of exported Qty.','Operational imports currently sum the source quantity/unit field.','[{"key":"ORDER_ITEM_LINES","label":"Converted order-item lines"},{"key":"PRODUCT_UNITS","label":"Product units"},{"key":"TEMPLATE_SPECIFIC","label":"Definition depends on report template"},{"key":"UNRESOLVED","label":"Keep unresolved"}]','{"Qty","ASP","Product volume"}'::text[]),
 ('BQ-04','tiktok.reporting_date','TikTok Reporting Date','TikTok','MARKETPLACE','Which TikTok timestamp, timezone, and date format control reporting?','The validated week matches Time Created interpreted DD/MM/YYYY.','Operational imports require a mapped ISO date and use Asia/Jakarta reporting periods.','[{"key":"TIME_CREATED_JAKARTA","label":"Time Created in Asia/Jakarta"},{"key":"PAYMENT_TIME","label":"Payment Time"},{"key":"COMMISSION_PAID_TIME","label":"Commission Paid Time"},{"key":"TEMPLATE_SPECIFIC","label":"Definition depends on report template"},{"key":"UNRESOLVED","label":"Keep unresolved"}]','{"Period membership","H-2","Growth"}'::text[]),
 ('BQ-05','tiktok.commission','TikTok Commission','TikTok','MARKETPLACE','Which TikTok commission components belong in the report?','The validated Simba output uses Actual Commission Payment and excludes Shop Ads commission.','Operational imports use one explicitly mapped commission value.','[{"key":"STANDARD_ONLY","label":"Actual standard commission only"},{"key":"STANDARD_PLUS_ADS","label":"Standard plus Shop Ads commission"},{"key":"TEMPLATE_SPECIFIC","label":"Definition depends on report template"},{"key":"UNRESOLVED","label":"Keep unresolved"}]','{"Commission","ROI","Cost Ratio"}'::text[]),
 ('BQ-06','common.store_revenue_source','Store Revenue and Target Source','Multi-platform','GLOBAL','Which approved source owns Store Revenue and report targets?','The matching raw payment-order sheets do not contain Store Revenue; some historical target cells are blank.','Store Revenue remains unavailable; AffiliateOS targets use the existing target/campaign system.','[{"key":"SELLER_CENTER","label":"Marketplace seller-center source"},{"key":"COMMERCIAL_REPORT","label":"Commercial or brand report"},{"key":"MANUAL_APPROVED","label":"Approved manual input"},{"key":"TEMPLATE_SPECIFIC","label":"Definition depends on report template"},{"key":"UNRESOLVED","label":"Keep unresolved"}]','{"Store Revenue","Contribution","Target Achievement"}'::text[]),
 ('BQ-07','common.comparable_period','Comparable Period','Multi-platform','GLOBAL','Which prior period should be used for growth comparisons?','The supplied raw/output pair covers only one matching historical period.','AffiliateOS currently compares the same calendar date span in the previous month.','[{"key":"PREVIOUS_CALENDAR_SPAN","label":"Same calendar date span previous month"},{"key":"PREVIOUS_DAY_COUNT","label":"Same number of previous days"},{"key":"EQUIVALENT_WEEKDAYS","label":"Equivalent weekday range"},{"key":"H2_ALIGNED_MTD","label":"H-2 aligned MTD"},{"key":"CAMPAIGN_ALIGNED","label":"Campaign-aligned comparison"},{"key":"UNRESOLVED","label":"Keep unresolved"}]','{"Growth","Trend narratives"}'::text[]),
 ('BQ-08','common.creator_identity','Cross-marketplace Creator Identity','Multi-platform','GLOBAL','How should one person with multiple marketplace accounts be deduplicated in cross-marketplace reports?','Single-marketplace parity succeeds with normalized marketplace usernames.','Shopee account, TikTok account, and canonical creator remain distinct linked concepts.','[{"key":"CANONICAL_CREATOR","label":"Deduplicate by canonical creator"},{"key":"MARKETPLACE_ACCOUNT","label":"Count each marketplace account"},{"key":"TEMPLATE_SPECIFIC","label":"Definition depends on report template"},{"key":"UNRESOLVED","label":"Keep unresolved"}]','{"Total Affiliates","Affiliates With Sales","Cross-marketplace reporting"}'::text[])
) as q(rule_key,metric_id,name,marketplace,scope_type,question,evidence,behavior,options,impact)
on conflict(workspace_id,rule_key,version) do nothing;

commit;
