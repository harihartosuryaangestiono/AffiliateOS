begin;

alter table public.import_jobs add column if not exists source_type text;
alter table public.import_jobs add column if not exists sales_metric text;
alter table public.import_jobs add column if not exists period_start date;
alter table public.import_jobs add column if not exists period_end date;
update storage.buckets set file_size_limit=52428800 where id='workspace-files';

alter table public.import_order_keys add column if not exists source_product_id text;
alter table public.import_order_keys add column if not exists source_item_id text;
alter table public.import_order_keys drop constraint if exists import_order_keys_workspace_id_marketplace_order_id_key;
create unique index if not exists import_order_item_key_unique on public.import_order_keys(workspace_id,marketplace,order_id,coalesce(source_product_id,''),coalesce(source_item_id,''));

create or replace function public.preserve_payment_order_key() returns trigger language plpgsql security invoker set search_path='' as $$
declare j public.import_jobs; order_column text; product_column text; item_column text;
begin
 select * into j from public.import_jobs where id=new.import_job_id and workspace_id=new.workspace_id;
 order_column=j.mapping->>'order_id'; product_column=j.mapping->>'source_product_id'; item_column=j.mapping->>'source_item_id';
 if order_column is not null and nullif(new.payload->>order_column,'') is not null then
  insert into public.import_order_keys(workspace_id,marketplace,order_id,source_product_id,source_item_id,source_import_id)
  values(new.workspace_id,j.marketplace,new.payload->>order_column,new.payload->>product_column,new.payload->>item_column,j.id);
 end if;
 return new;
end $$;

create table if not exists public.import_mapping_profiles(
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
 marketplace text not null check(marketplace in ('TikTok','Shopee')),
 source_type text not null,
 name text not null,
 mapping_json jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workspace_id,marketplace,source_type,name),
 unique(workspace_id,id)
);
alter table public.import_mapping_profiles enable row level security;
revoke all on public.import_mapping_profiles from anon,authenticated;
grant select,insert,update,delete on public.import_mapping_profiles to authenticated;
create policy workspace_read on public.import_mapping_profiles for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.import_mapping_profiles for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
create policy workspace_update on public.import_mapping_profiles for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
create policy workspace_delete on public.import_mapping_profiles for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));

create table if not exists public.import_normalization_results(
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
 import_job_id uuid not null,
 normalized_id uuid,
 raw_row_number integer not null,
 source_order_id text,
 source_product_id text,
 status text not null,
 created_at timestamptz not null default now(),
 unique(workspace_id,import_job_id,raw_row_number),
 foreign key(workspace_id,import_job_id) references public.import_jobs(workspace_id,id)
);
alter table public.import_normalization_results enable row level security;
revoke all on public.import_normalization_results from anon,authenticated;
grant select,insert on public.import_normalization_results to authenticated;
create policy workspace_read on public.import_normalization_results for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.import_normalization_results for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));

create table if not exists public.metric_targets(
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
 name text not null default 'Reporting target',
 status text not null default 'Active',
 client_id uuid,
 brand_id uuid,
 campaign_id uuid,
 marketplace text not null check(marketplace in ('TikTok','Shopee','Multi-platform')),
 metric text not null check(metric in ('Affiliate GMV','Affiliates With Sales','Orders','Units Sold')),
 period_start date not null,
 period_end date not null,
 target_value numeric(18,2) not null check(target_value>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(period_end>=period_start),
 unique(workspace_id,client_id,brand_id,campaign_id,marketplace,metric,period_start,period_end),
 unique(workspace_id,id)
);
alter table public.metric_targets enable row level security;
revoke all on public.metric_targets from anon,authenticated;
grant select,insert,update,delete on public.metric_targets to authenticated;
create policy workspace_read on public.metric_targets for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.metric_targets for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
create policy workspace_update on public.metric_targets for update to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst')) with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
create policy workspace_delete on public.metric_targets for delete to authenticated using(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager'));

create index if not exists tiktok_performance_workspace_date_account_idx on public.tiktok_performance_daily(workspace_id,date,account_id);
create index if not exists tiktok_performance_workspace_product_date_idx on public.tiktok_performance_daily(workspace_id,product_id,date) where product_id is not null;
create index if not exists shopee_performance_workspace_date_account_idx on public.shopee_performance_daily(workspace_id,date,account_id);
create index if not exists shopee_performance_workspace_product_date_idx on public.shopee_performance_daily(workspace_id,product_id,date) where product_id is not null;

create or replace function public.stage_import(job jsonb,file_metadata jsonb,raw_rows jsonb,validation_errors jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare jid uuid := (job->>'id')::uuid; wid uuid := public.current_workspace();
begin
 if public.current_role() not in ('Admin','Affiliate Manager','Analyst') then raise exception 'Insufficient access'; end if;
 if jsonb_array_length(raw_rows)>50000 then raise exception 'Row limit exceeded'; end if;
 insert into public.import_jobs(id,workspace_id,marketplace,original_filename,uploaded_by,status,row_count,successful_rows,failed_rows,mapping)
 values(jid,wid,job->>'marketplace',job->>'filename',auth.uid(),job->>'status',jsonb_array_length(raw_rows),0,(job->>'failed_rows')::integer,job->'mapping');
 insert into public.import_files(workspace_id,import_job_id,storage_path,original_filename,size_bytes,mime_type)
 values(wid,jid,file_metadata->>'path',job->>'filename',(file_metadata->>'size')::bigint,file_metadata->>'type');
 insert into public.import_column_mappings(workspace_id,import_job_id,marketplace,mapping) values(wid,jid,job->>'marketplace',job->'mapping');
 insert into public.raw_import_rows(workspace_id,import_job_id,row_number,payload) select wid,jid,ordinality::integer+1,value from jsonb_array_elements(raw_rows) with ordinality;
 insert into public.import_errors(workspace_id,import_job_id,message) select wid,jid,value #>> '{}' from jsonb_array_elements(validation_errors);
 return jid;
end $$;

create or replace function public.process_import_v16(job jsonb,file_metadata jsonb,raw_rows jsonb,validation_results jsonb,normalized_rows jsonb,normalization_results jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare t text; r jsonb; w uuid:=public.current_workspace(); jid uuid:=(job->>'id')::uuid; min_date date; max_date date;
begin
 if public.current_role() not in ('Admin','Affiliate Manager','Analyst') or w is null then raise exception 'Insufficient access'; end if;
 if jsonb_array_length(raw_rows)>50000 then raise exception 'Row limit exceeded'; end if;
 if jsonb_array_length(normalized_rows)=0 then raise exception 'No normalized rows'; end if;
 perform public.stage_import(job,file_metadata,raw_rows,'[]'::jsonb);
 select min((value->>'date')::date),max((value->>'date')::date) into min_date,max_date from jsonb_array_elements(normalized_rows);
 update public.import_jobs set file_hash=job->>'file_hash',status=job->>'status',successful_rows=(job->>'successful_rows')::integer,failed_rows=(job->>'failed_rows')::integer,source_type=job->>'source_type',sales_metric=job->>'sales_metric',period_start=min_date,period_end=max_date where id=jid and workspace_id=w;
 insert into public.import_errors(workspace_id,import_job_id,row_number,message,severity)
 select w,jid,(value->>'row')::integer,value->>'message',lower(value->>'severity') from jsonb_array_elements(validation_results);
 insert into public.import_normalization_results(workspace_id,import_job_id,normalized_id,raw_row_number,source_order_id,source_product_id,status)
 select w,jid,nullif(value->>'normalized_id','')::uuid,(value->>'raw_row_number')::integer,value->>'source_order_id',value->>'source_product_id',value->>'status' from jsonb_array_elements(normalization_results);
 insert into public.import_mapping_profiles(workspace_id,marketplace,source_type,name,mapping_json)
 values(w,job->>'marketplace',job->>'source_type',(job->>'marketplace')||' Payment Order — Default Mapping',job->'mapping')
 on conflict(workspace_id,marketplace,source_type,name) do update set mapping_json=excluded.mapping_json,updated_at=now();
 if job->>'marketplace'='TikTok' then t:='tiktok_performance_daily'; elsif job->>'marketplace'='Shopee' then t:='shopee_performance_daily'; else raise exception 'Invalid marketplace'; end if;
 for r in select value from jsonb_array_elements(normalized_rows) loop
  r=r||jsonb_build_object('workspace_id',w,'source_import_id',jid,'created_at',now(),'updated_at',now());
  execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I,$1)',t,t) using r;
 end loop;
end $$;
revoke all on function public.process_import_v16(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.process_import_v16(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.mutate_operations(changes jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare c jsonb; t text; r jsonb; cols text; vals text; updates text;
begin
 if jsonb_array_length(changes)>200 then raise exception 'Too many changes'; end if;
 for c in select value from jsonb_array_elements(changes) loop
  t=c->>'table';
  if t not in ('creator_outreach','outreach_templates','creator_acquisition_events','hsl_activations','hsl_creator_products','product_stock_snapshots','sample_seedings','peak_days','peak_day_creators','campaign_creators','monthly_plans','recurring_task_templates','reports','report_snapshots','workspace_preferences','operational_alerts','metric_targets','tasks','creators') then raise exception 'Unsupported operation'; end if;
  r=(c->'record')||jsonb_build_object('workspace_id',public.current_workspace());
  if c->>'remove'='true' then execute format('delete from public.%I where workspace_id=$1 and id=$2',t) using public.current_workspace(),(r->>'id')::uuid;
  else
   select string_agg(quote_ident(key),','),string_agg('x.'||quote_ident(key),','),string_agg(quote_ident(key)||'=excluded.'||quote_ident(key),',') into cols,vals,updates from jsonb_object_keys(r) key;
   if t in ('report_snapshots','creator_acquisition_events','product_stock_snapshots') then execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) x',t,cols,vals,t) using r;
   else execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) x on conflict(id) do update set %s',t,cols,vals,t,updates) using r;
   end if;
  end if;
 end loop;
end $$;

commit;
