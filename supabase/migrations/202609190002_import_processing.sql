-- Store raw evidence and normalized rows in one transaction. Unique keys reject concurrent duplicates.
begin;
create or replace function public.stage_import(job jsonb, file_metadata jsonb, raw_rows jsonb, validation_errors jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare jid uuid := (job->>'id')::uuid; wid uuid := public.current_workspace();
begin
  if public.current_role() not in ('Admin','Affiliate Manager','Analyst') then raise exception 'Insufficient access'; end if;
  if jsonb_array_length(raw_rows)>10000 then raise exception 'Row limit exceeded'; end if;
  insert into public.import_jobs(id,workspace_id,marketplace,original_filename,uploaded_by,status,row_count,successful_rows,failed_rows,mapping)
  values(jid,wid,job->>'marketplace',job->>'filename',auth.uid(),job->>'status',jsonb_array_length(raw_rows),0,(job->>'failed_rows')::integer,job->'mapping');
  insert into public.import_files(workspace_id,import_job_id,storage_path,original_filename,size_bytes,mime_type)
  values(wid,jid,file_metadata->>'path',job->>'filename',(file_metadata->>'size')::bigint,file_metadata->>'type');
  insert into public.import_column_mappings(workspace_id,import_job_id,marketplace,mapping) values(wid,jid,job->>'marketplace',job->'mapping');
  insert into public.raw_import_rows(workspace_id,import_job_id,row_number,payload) select wid,jid,ordinality::integer+1,value from jsonb_array_elements(raw_rows) with ordinality;
  insert into public.import_errors(workspace_id,import_job_id,message) select wid,jid,value #>> '{}' from jsonb_array_elements(validation_errors);
  return jid;
end $$;
create function public.process_import(job jsonb,file_metadata jsonb,raw_rows jsonb,validation_errors jsonb,normalized_rows jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare t text; r jsonb; w uuid:=public.current_workspace(); jid uuid:=(job->>'id')::uuid;
begin
 if public.current_role() not in ('Admin','Affiliate Manager','Analyst') or w is null then raise exception 'Insufficient access'; end if;
 if jsonb_array_length(validation_errors)>0 or jsonb_array_length(normalized_rows)=0 then raise exception 'Fix import validation before processing'; end if;
 perform public.stage_import(job,file_metadata,raw_rows,validation_errors);
 update public.import_jobs set file_hash=job->>'file_hash',status='Completed',successful_rows=jsonb_array_length(raw_rows),failed_rows=0 where id=jid and workspace_id=w;
 if job->>'marketplace'='TikTok' then t:='tiktok_performance_daily'; elsif job->>'marketplace'='Shopee' then t:='shopee_performance_daily'; else raise exception 'Invalid marketplace'; end if;
 for r in select value from jsonb_array_elements(normalized_rows) loop
 r=r||jsonb_build_object('workspace_id',w,'source_import_id',jid,'created_at',now(),'updated_at',now());
 execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I,$1)',t,t) using r;
 end loop;
end $$;
revoke all on function public.process_import(jsonb,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.process_import(jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;
-- Add the reporting role to private import-file storage only.
drop policy workspace_files_insert on storage.objects;
create policy workspace_files_insert on storage.objects for insert to authenticated with check(bucket_id='workspace-files' and (storage.foldername(name))[1]=public.current_workspace()::text and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
drop policy workspace_files_delete on storage.objects;
create policy workspace_files_delete on storage.objects for delete to authenticated using(bucket_id='workspace-files' and (storage.foldername(name))[1]=public.current_workspace()::text and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
commit;
