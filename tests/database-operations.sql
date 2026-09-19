-- Run only against the isolated seeded QA database. All test mutations roll back.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select public.mutate_operations('[{"table":"product_stock_snapshots","record":{"id":"40000000-0000-4000-8000-000000000001","name":"QA stock","status":"Draft","product_id":"10000000-0000-4000-8000-000000000200","marketplace":"Shopee","stock_quantity":5,"snapshot_at":"2026-09-19","source":"Manual"}}]');
select public.mutate_operations('[{"table":"campaign_creators","record":{"id":"40000000-0000-4000-8000-000000000002","campaign_id":"10000000-0000-4000-8000-000000000032","creator_id":"10000000-0000-4000-8000-000000000100","status":"Locked","format":"Live"}}]');
do $$begin
 if (select locked_by from public.campaign_creators where id='40000000-0000-4000-8000-000000000002')<>auth.uid() then raise exception 'Lock actor missing';end if;
 begin update public.product_stock_snapshots set stock_quantity=99;raise exception 'Immutable stock update should fail';exception when insufficient_privilege then null;end;
 begin insert into public.hsl_activations(name,creator_id,campaign_id,shopee_account_id,start_date,end_date) values('Mismatch','10000000-0000-4000-8000-000000000101','10000000-0000-4000-8000-000000000032','10000000-0000-4000-8000-000000000500','2026-09-19','2026-09-25');raise exception 'HSL mismatch was accepted';exception when raise_exception then if sqlerrm<>'Shopee account must belong to creator' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',true);
do $$begin
 begin insert into public.creator_outreach(creator_id,channel,reason) values('10000000-0000-4000-8000-000000000100','WhatsApp','QA');raise exception 'Viewer mutation accepted';exception when insufficient_privilege then null;end;
 begin select public.mutate_operations('[{"table":"campaign_creators","record":{"id":"40000000-0000-4000-8000-000000000002","status":"Active"}}]');raise exception 'Viewer RPC mutation accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000005',true);
do $$begin
 if exists(select 1 from public.creators) then raise exception 'Cross-workspace read';end if;
 begin insert into public.sample_seedings(creator_id,product_id,purpose,requested_at) values('10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000000200','Live','2026-09-19');raise exception 'Cross-workspace relation accepted';exception when foreign_key_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
select public.mutate_operations('[{"table":"reports","record":{"id":"40000000-0000-4000-8000-000000000003","name":"QA Weekly","status":"Draft","marketplace":"Shopee","period_start":"2026-09-01","period_end":"2026-09-17","cutoff_date":"2026-09-17"}}]');
select public.mutate_operations('[{"table":"report_snapshots","record":{"id":"40000000-0000-4000-8000-000000000004","name":"QA Snapshot","report_id":"40000000-0000-4000-8000-000000000003","snapshot_json":"{\"gmv\":100}"}},{"table":"reports","record":{"id":"40000000-0000-4000-8000-000000000003","name":"QA Weekly","status":"Ready","finalized_at":"2026-09-19T08:00:00Z"}}]');
do $$begin
 begin update public.report_snapshots set snapshot_json='{}';raise exception 'Snapshot changed';exception when insufficient_privilege then null;end;
 begin update public.reports set issues='changed' where id='40000000-0000-4000-8000-000000000003';raise exception 'Finalized narrative changed';exception when raise_exception then if sqlerrm<>'Finalized reports are immutable' then raise;end if;end;
end $$;
update public.reports set status='Presented' where id='40000000-0000-4000-8000-000000000003';
select public.process_import('{"id":"40000000-0000-4000-8000-000000000005","marketplace":"Shopee","filename":"qa.csv","status":"Completed","failed_rows":0,"mapping":{},"file_hash":"qa-hash"}','{"path":"qa.csv","size":100,"type":"text/csv"}','[{"gmv":"1000"}]','[]','[{"id":"40000000-0000-4000-8000-000000000006","account_id":"10000000-0000-4000-8000-000000000500","campaign_id":"10000000-0000-4000-8000-000000000032","product_id":"10000000-0000-4000-8000-000000000200","date":"2026-09-17","gmv":1000,"orders":1,"units_sold":1,"commission":0,"clicks":0,"conversion_rate":0}]');
do $$begin
 if (select successful_rows from public.import_jobs where id='40000000-0000-4000-8000-000000000005')<>1 then raise exception 'Import not processed';end if;
 if not exists(select 1 from public.raw_import_rows where import_job_id='40000000-0000-4000-8000-000000000005') then raise exception 'Missing immutable raw rows';end if;
 begin select public.process_import('{"id":"40000000-0000-4000-8000-000000000007","marketplace":"Shopee","filename":"duplicate.csv","status":"Completed","failed_rows":0,"mapping":{},"file_hash":"qa-hash"}','{"path":"duplicate.csv","size":100,"type":"text/csv"}','[{"gmv":"1000"}]','[]','[{"gmv":1000}]');raise exception 'Duplicate import accepted';exception when unique_violation then null;end;
 if exists(select 1 from public.import_jobs where id='40000000-0000-4000-8000-000000000007') then raise exception 'Partial duplicate import persisted';end if;
end $$;
rollback;
select 'PASS: migration, roles, tenant isolation, locking, HSL, immutable history, report freeze, atomic import and duplicate rollback' as result;
