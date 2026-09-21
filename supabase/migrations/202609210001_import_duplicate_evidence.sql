begin;

create or replace function public.preserve_payment_order_key()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  j public.import_jobs;
  order_column text;
  product_column text;
  item_column text;
begin
  select * into j
  from public.import_jobs
  where id = new.import_job_id and workspace_id = new.workspace_id;

  order_column = j.mapping->>'order_id';
  product_column = j.mapping->>'source_product_id';
  item_column = j.mapping->>'source_item_id';

  if order_column is not null and nullif(new.payload->>order_column, '') is not null then
    insert into public.import_order_keys(
      workspace_id,
      marketplace,
      order_id,
      source_product_id,
      source_item_id,
      source_import_id
    )
    values(
      new.workspace_id,
      j.marketplace,
      new.payload->>order_column,
      new.payload->>product_column,
      new.payload->>item_column,
      j.id
    )
    on conflict do nothing;
  end if;

  return new;
end
$$;

commit;
