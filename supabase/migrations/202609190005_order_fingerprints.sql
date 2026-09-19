begin;
create table if not exists public.import_order_keys(
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null default public.current_workspace() references public.workspaces(id),
 marketplace text not null check(marketplace in ('TikTok','Shopee')), order_id text not null, source_import_id uuid not null,
 created_at timestamptz not null default now(), unique(workspace_id,marketplace,order_id),
 foreign key(workspace_id,source_import_id) references public.import_jobs(workspace_id,id)
);
alter table public.import_order_keys enable row level security;
revoke all on public.import_order_keys from anon,authenticated;
grant select,insert on public.import_order_keys to authenticated;
create policy workspace_read on public.import_order_keys for select to authenticated using(workspace_id=public.current_workspace());
create policy workspace_insert on public.import_order_keys for insert to authenticated with check(workspace_id=public.current_workspace() and public.current_role() in ('Admin','Affiliate Manager','Analyst'));
create function public.preserve_payment_order_key() returns trigger language plpgsql security invoker set search_path='' as $$
declare j public.import_jobs; order_column text;
begin
 select * into j from public.import_jobs where id=new.import_job_id and workspace_id=new.workspace_id;
 order_column=j.mapping->>'order_id';
 if order_column is not null and order_column<>'' then
 insert into public.import_order_keys(workspace_id,marketplace,order_id,source_import_id) values(new.workspace_id,j.marketplace,new.payload->>order_column,j.id);
 end if;
 return new;
end $$;
create trigger capture_order_key after insert on public.raw_import_rows for each row execute function public.preserve_payment_order_key();
commit;
