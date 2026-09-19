begin;
-- Preserve the existing per-marketplace mappings as the canonical mapping records.
update public.products p set tiktok_product_id=m.tiktok_product_id from public.tiktok_product_mappings m where m.workspace_id=p.workspace_id and m.product_id=p.id and p.tiktok_product_id is null;
update public.products p set shopee_item_id=m.shopee_item_id from public.shopee_product_mappings m where m.workspace_id=p.workspace_id and m.product_id=p.id and p.shopee_item_id is null;
create function public.sync_product_mappings() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.tiktok_product_id is not null and new.tiktok_product_id<>'' then insert into public.tiktok_product_mappings(workspace_id,product_id,tiktok_product_id) values(new.workspace_id,new.id,new.tiktok_product_id) on conflict(workspace_id,product_id) do update set tiktok_product_id=excluded.tiktok_product_id;else delete from public.tiktok_product_mappings where workspace_id=new.workspace_id and product_id=new.id;end if;
 if new.shopee_item_id is not null and new.shopee_item_id<>'' then insert into public.shopee_product_mappings(workspace_id,product_id,shopee_item_id) values(new.workspace_id,new.id,new.shopee_item_id) on conflict(workspace_id,product_id) do update set shopee_item_id=excluded.shopee_item_id;else delete from public.shopee_product_mappings where workspace_id=new.workspace_id and product_id=new.id;end if;
 return new;
end $$;
create trigger sync_marketplace_mappings after insert or update of tiktok_product_id,shopee_item_id on public.products for each row execute function public.sync_product_mappings();
commit;
