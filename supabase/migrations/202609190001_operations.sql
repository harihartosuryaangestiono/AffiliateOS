-- AffiliateOS 1.5: additive upgrade. Apply after schema_v01. Never resets existing data.
begin;
alter table public.creators add column if not exists phone text;
alter table public.creators add column if not exists relationship_status text default 'Prospect';
alter table public.creators add column if not exists acquisition_stage text default 'Prospect';
alter table public.creators add column if not exists acquisition_source text default 'Manual';
alter table public.campaigns add column if not exists campaign_type text;
alter table public.campaigns add column if not exists target_affiliates integer check(target_affiliates>=0);
alter table public.campaigns add column if not exists target_creators integer check(target_creators>=0);
alter table public.campaigns add column if not exists target_live_creators integer check(target_live_creators>=0);
alter table public.campaigns add column if not exists target_video_creators integer check(target_video_creators>=0);
alter table public.campaigns add column if not exists target_content integer check(target_content>=0);
alter table public.tasks add column if not exists recurrence_type text default 'None';
alter table public.tasks add column if not exists weekly_day text;
alter table public.tasks add column if not exists monthly_week integer;
alter table public.tasks add column if not exists relative_campaign_event text;
alter table public.products add column if not exists tiktok_product_id text;
alter table public.products add column if not exists shopee_item_id text;
alter table public.import_jobs add column if not exists file_hash text;
alter table public.campaign_creators add column if not exists format text;
alter table public.campaign_creators add column if not exists scheduled_at date;
alter table public.campaign_creators add column if not exists notes text;
alter table public.campaign_creators add column if not exists locked_at timestamptz;
alter table public.campaign_creators add column if not exists locked_by uuid references auth.users(id);
alter table public.reports add column if not exists report_type text;
alter table public.reports add column if not exists cutoff_date date;
alter table public.reports add column if not exists what_went_well text;
alter table public.reports add column if not exists issues text;
alter table public.reports add column if not exists next_action text;
alter table public.reports add column if not exists finalized_at timestamptz;
create unique index if not exists import_file_hash_unique on public.import_jobs(workspace_id,marketplace,file_hash) where file_hash is not null;
alter table public.campaigns alter column target_gmv drop default;
create table if not exists public.outreach_templates(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  marketplace text not null check(marketplace in ('Shopee','TikTok','Multi-platform')),
  activation_type text,
  message text
);
create index if not exists outreach_templates_workspace_idx on public.outreach_templates(workspace_id);
alter table public.outreach_templates enable row level security;
revoke all on public.outreach_templates from anon,authenticated;
grant select,insert,update,delete on public.outreach_templates to authenticated;
create policy workspace_read on public.outreach_templates for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.outreach_templates for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.outreach_templates for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.outreach_templates for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.outreach_templates for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.outreach_templates for each row execute function public.audit_record();
create table if not exists public.creator_outreach(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  creator_id uuid not null,
  foreign key(workspace_id,creator_id) references public.creators(workspace_id,id),
  campaign_id uuid,
  foreign key(workspace_id,campaign_id) references public.campaigns(workspace_id,id),
  channel text not null check(channel in ('WhatsApp','Email','Phone','Other')),
  reason text not null,
  template_id uuid,
  foreign key(workspace_id,template_id) references public.outreach_templates(workspace_id,id),
  contacted_at date,
  follow_up_at date,
  notes text
);
create index if not exists creator_outreach_workspace_idx on public.creator_outreach(workspace_id);
alter table public.creator_outreach enable row level security;
revoke all on public.creator_outreach from anon,authenticated;
grant select,insert,update,delete on public.creator_outreach to authenticated;
create policy workspace_read on public.creator_outreach for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.creator_outreach for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.creator_outreach for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.creator_outreach for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.creator_outreach for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.creator_outreach for each row execute function public.audit_record();
create table if not exists public.creator_acquisition_events(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  creator_id uuid not null,
  foreign key(workspace_id,creator_id) references public.creators(workspace_id,id),
  source text,
  notes text
);
create index if not exists creator_acquisition_events_workspace_idx on public.creator_acquisition_events(workspace_id);
alter table public.creator_acquisition_events enable row level security;
revoke all on public.creator_acquisition_events from anon,authenticated;
grant select,insert on public.creator_acquisition_events to authenticated;
create policy workspace_read on public.creator_acquisition_events for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.creator_acquisition_events for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.creator_acquisition_events for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.creator_acquisition_events for each row execute function public.audit_record();
create table if not exists public.hsl_activations(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  creator_id uuid not null,
  foreign key(workspace_id,creator_id) references public.creators(workspace_id,id),
  campaign_id uuid not null,
  foreign key(workspace_id,campaign_id) references public.campaigns(workspace_id,id),
  shopee_account_id uuid not null,
  foreign key(workspace_id,shopee_account_id) references public.shopee_accounts(workspace_id,id),
  start_date date not null,
  end_date date not null,
  strategy_notes text,
  performance_notes text
);
create index if not exists hsl_activations_workspace_idx on public.hsl_activations(workspace_id);
alter table public.hsl_activations enable row level security;
revoke all on public.hsl_activations from anon,authenticated;
grant select,insert,update,delete on public.hsl_activations to authenticated;
create policy workspace_read on public.hsl_activations for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.hsl_activations for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.hsl_activations for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.hsl_activations for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.hsl_activations for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.hsl_activations for each row execute function public.audit_record();
create table if not exists public.hsl_creator_products(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  hsl_activation_id uuid not null,
  foreign key(workspace_id,hsl_activation_id) references public.hsl_activations(workspace_id,id),
  product_id uuid not null,
  foreign key(workspace_id,product_id) references public.products(workspace_id,id),
  priority text not null check(priority in ('Hero','Primary','Secondary','Test')),
  reason text,
  notes text,
  unique(workspace_id,hsl_activation_id,product_id)
);
create index if not exists hsl_creator_products_workspace_idx on public.hsl_creator_products(workspace_id);
alter table public.hsl_creator_products enable row level security;
revoke all on public.hsl_creator_products from anon,authenticated;
grant select,insert,update,delete on public.hsl_creator_products to authenticated;
create policy workspace_read on public.hsl_creator_products for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.hsl_creator_products for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.hsl_creator_products for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.hsl_creator_products for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.hsl_creator_products for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.hsl_creator_products for each row execute function public.audit_record();
create table if not exists public.product_stock_snapshots(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  product_id uuid not null,
  foreign key(workspace_id,product_id) references public.products(workspace_id,id),
  marketplace text not null check(marketplace in ('Shopee','TikTok')),
  stock_quantity numeric not null check(stock_quantity>=0),
  snapshot_at date not null,
  source text not null check(source in ('Manual','Import')),
  notes text
);
create index if not exists product_stock_snapshots_workspace_idx on public.product_stock_snapshots(workspace_id);
alter table public.product_stock_snapshots enable row level security;
revoke all on public.product_stock_snapshots from anon,authenticated;
grant select,insert on public.product_stock_snapshots to authenticated;
create policy workspace_read on public.product_stock_snapshots for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.product_stock_snapshots for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.product_stock_snapshots for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.product_stock_snapshots for each row execute function public.audit_record();
create table if not exists public.sample_seedings(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  creator_id uuid not null,
  foreign key(workspace_id,creator_id) references public.creators(workspace_id,id),
  campaign_id uuid,
  foreign key(workspace_id,campaign_id) references public.campaigns(workspace_id,id),
  product_id uuid not null,
  foreign key(workspace_id,product_id) references public.products(workspace_id,id),
  purpose text not null check(purpose in ('Live','Video','Campaign','Product Launch','Testing')),
  requested_at date not null,
  approved_at date,
  shipped_at date,
  received_at date,
  expected_activation_at date,
  activated_at date,
  tracking_number text,
  notes text
);
create index if not exists sample_seedings_workspace_idx on public.sample_seedings(workspace_id);
alter table public.sample_seedings enable row level security;
revoke all on public.sample_seedings from anon,authenticated;
grant select,insert,update,delete on public.sample_seedings to authenticated;
create policy workspace_read on public.sample_seedings for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.sample_seedings for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.sample_seedings for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.sample_seedings for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.sample_seedings for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.sample_seedings for each row execute function public.audit_record();
create table if not exists public.peak_days(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  event_type text not null,
  campaign_id uuid not null,
  foreign key(workspace_id,campaign_id) references public.campaigns(workspace_id,id),
  event_date date not null,
  target_gmv numeric check(target_gmv>=0),
  target_creators numeric check(target_creators>=0),
  target_live_creators numeric check(target_live_creators>=0),
  target_video_creators numeric check(target_video_creators>=0),
  strategy text
);
create index if not exists peak_days_workspace_idx on public.peak_days(workspace_id);
alter table public.peak_days enable row level security;
revoke all on public.peak_days from anon,authenticated;
grant select,insert,update,delete on public.peak_days to authenticated;
create policy workspace_read on public.peak_days for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.peak_days for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.peak_days for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.peak_days for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.peak_days for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.peak_days for each row execute function public.audit_record();
create table if not exists public.peak_day_creators(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  peak_day_id uuid not null,
  foreign key(workspace_id,peak_day_id) references public.peak_days(workspace_id,id),
  creator_id uuid not null,
  foreign key(workspace_id,creator_id) references public.creators(workspace_id,id),
  format text not null check(format in ('Live','Video','Both')),
  unique(workspace_id,peak_day_id,creator_id)
);
create index if not exists peak_day_creators_workspace_idx on public.peak_day_creators(workspace_id);
alter table public.peak_day_creators enable row level security;
revoke all on public.peak_day_creators from anon,authenticated;
grant select,insert,update,delete on public.peak_day_creators to authenticated;
create policy workspace_read on public.peak_day_creators for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.peak_day_creators for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.peak_day_creators for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.peak_day_creators for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.peak_day_creators for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.peak_day_creators for each row execute function public.audit_record();
create table if not exists public.monthly_plans(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  month date not null,
  objectives text,
  planned_campaigns text,
  peak_days text,
  target_creators numeric check(target_creators>=0),
  product_focus text,
  hero_skus text,
  strategy text,
  risks text,
  notes text
);
create index if not exists monthly_plans_workspace_idx on public.monthly_plans(workspace_id);
alter table public.monthly_plans enable row level security;
revoke all on public.monthly_plans from anon,authenticated;
grant select,insert,update,delete on public.monthly_plans to authenticated;
create policy workspace_read on public.monthly_plans for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.monthly_plans for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.monthly_plans for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.monthly_plans for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.monthly_plans for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.monthly_plans for each row execute function public.audit_record();
create table if not exists public.recurring_task_templates(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  recurrence_type text not null check(recurrence_type in ('Weekly','Monthly','Campaign event')),
  weekly_day text check(weekly_day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  monthly_week numeric check(monthly_week>=1 and monthly_week<=5),
  relative_campaign_event text,
  campaign_id uuid,
  foreign key(workspace_id,campaign_id) references public.campaigns(workspace_id,id),
  owner text,
  notes text
);
create index if not exists recurring_task_templates_workspace_idx on public.recurring_task_templates(workspace_id);
alter table public.recurring_task_templates enable row level security;
revoke all on public.recurring_task_templates from anon,authenticated;
grant select,insert,update,delete on public.recurring_task_templates to authenticated;
create policy workspace_read on public.recurring_task_templates for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.recurring_task_templates for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.recurring_task_templates for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.recurring_task_templates for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.recurring_task_templates for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.recurring_task_templates for each row execute function public.audit_record();
create table if not exists public.report_snapshots(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  report_id uuid not null,
  foreign key(workspace_id,report_id) references public.reports(workspace_id,id),
  snapshot_json text,
  unique(workspace_id,report_id)
);
create index if not exists report_snapshots_workspace_idx on public.report_snapshots(workspace_id);
alter table public.report_snapshots enable row level security;
revoke all on public.report_snapshots from anon,authenticated;
grant select,insert on public.report_snapshots to authenticated;
create policy workspace_read on public.report_snapshots for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.report_snapshots for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
create trigger touch_updated_at before update on public.report_snapshots for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.report_snapshots for each row execute function public.audit_record();
create table if not exists public.workspace_preferences(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  growth_threshold numeric check(growth_threshold>=0),
  decline_threshold numeric check(decline_threshold>=-100 and decline_threshold<=0),
  critical_threshold numeric check(critical_threshold>=-100 and critical_threshold<=0),
  inactivity_days numeric check(inactivity_days>=0),
  low_stock numeric check(low_stock>=0),
  critical_stock numeric check(critical_stock>=0),
  sample_days numeric check(sample_days>=0),
  cutoff_days numeric check(cutoff_days>=0),
  unique(workspace_id)
);
create index if not exists workspace_preferences_workspace_idx on public.workspace_preferences(workspace_id);
alter table public.workspace_preferences enable row level security;
revoke all on public.workspace_preferences from anon,authenticated;
grant select,insert,update,delete on public.workspace_preferences to authenticated;
create policy workspace_read on public.workspace_preferences for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.workspace_preferences for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin'));
create policy workspace_update on public.workspace_preferences for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin'));
create policy workspace_delete on public.workspace_preferences for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin'));
create trigger touch_updated_at before update on public.workspace_preferences for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.workspace_preferences for each row execute function public.audit_record();
create table if not exists public.operational_alerts(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
  name text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_by uuid default auth.uid() references auth.users(id),
  unique(workspace_id,id),
  alert_type text,
  entity_type text,
  entity_id text,
  message text,
  severity text not null check(severity in ('Info','Warning','Critical')),
  resolved_at date
);
create index if not exists operational_alerts_workspace_idx on public.operational_alerts(workspace_id);
alter table public.operational_alerts enable row level security;
revoke all on public.operational_alerts from anon,authenticated;
grant select,insert,update,delete on public.operational_alerts to authenticated;
create policy workspace_read on public.operational_alerts for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.operational_alerts for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_update on public.operational_alerts for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create policy workspace_delete on public.operational_alerts for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));
create trigger touch_updated_at before update on public.operational_alerts for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.operational_alerts for each row execute function public.audit_record();
drop policy workspace_insert on public.reports;
create policy workspace_insert on public.reports for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_update on public.reports;
create policy workspace_update on public.reports for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_insert on public.import_jobs;
create policy workspace_insert on public.import_jobs for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_update on public.import_jobs;
create policy workspace_update on public.import_jobs for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_insert on public.import_files;
create policy workspace_insert on public.import_files for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_insert on public.import_column_mappings;
create policy workspace_insert on public.import_column_mappings for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_insert on public.raw_import_rows;
create policy workspace_insert on public.raw_import_rows for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_insert on public.import_errors;
create policy workspace_insert on public.import_errors for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_insert on public.tiktok_performance_daily;
create policy workspace_insert on public.tiktok_performance_daily for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_insert on public.shopee_performance_daily;
create policy workspace_insert on public.shopee_performance_daily for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
-- No client can alter a finalized report body or its metric snapshot.
create function public.protect_finalized_report() returns trigger language plpgsql set search_path='' as $$
begin
 if old.finalized_at is not null and (tg_op='DELETE' or (to_jsonb(new)-'status'-'updated_at')<>(to_jsonb(old)-'status'-'updated_at')) then raise exception 'Finalized reports are immutable'; end if;
 if old.finalized_at is not null and new.status not in ('Ready','Presented','Archived') then raise exception 'Cannot reopen a finalized report'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger protect_finalized before update or delete on public.reports for each row execute function public.protect_finalized_report();
-- Atomic bulk actions; invoker privileges and RLS apply to every row. Identifier allowlist, no arbitrary SQL.
create function public.mutate_operations(changes jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare c jsonb; t text; r jsonb; cols text; vals text; updates text;
begin
 if jsonb_array_length(changes)>200 then raise exception 'Too many changes'; end if;
 for c in select value from jsonb_array_elements(changes) loop
 t=c->>'table';
 if t not in ('creator_outreach','outreach_templates','creator_acquisition_events','hsl_activations','hsl_creator_products','product_stock_snapshots','sample_seedings','peak_days','peak_day_creators','campaign_creators','monthly_plans','recurring_task_templates','reports','report_snapshots','workspace_preferences','operational_alerts','tasks','creators') then raise exception 'Unsupported operation'; end if;
 r=(c->'record')||jsonb_build_object('workspace_id',public.current_workspace());
 if c->>'remove'='true' then execute format('delete from public.%I where workspace_id=$1 and id=$2',t) using public.current_workspace(),(r->>'id')::uuid;
 else
 select string_agg(quote_ident(key),','),string_agg('x.'||quote_ident(key),','),string_agg(quote_ident(key)||'=excluded.'||quote_ident(key),',') into cols,vals,updates from jsonb_object_keys(r) key;
 if t in ('report_snapshots','creator_acquisition_events','product_stock_snapshots') then
 execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) x',t,cols,vals,t) using r;
 else
 execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) x on conflict(id) do update set %s',t,cols,vals,t,updates) using r;
 end if;
 end if;
 end loop;
end $$;
revoke all on function public.mutate_operations(jsonb) from public;
grant execute on function public.mutate_operations(jsonb) to authenticated;
commit;
