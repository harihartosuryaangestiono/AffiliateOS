import { notFound } from 'next/navigation';
import { EntityDetail } from '@/components/operations/entity-detail';
import { ImportCenter } from '@/components/operations/import-center';
import { entities, type Entity } from '@/types/domain';
export default async function Page({
  params,
}: {
  params: Promise<{ module: string; id: string }>;
}) {
  const { module, id } = await params;
  if (module === 'imports' && ['tiktok', 'shopee'].includes(id))
    return (
      <ImportCenter key={id} market={id === 'tiktok' ? 'TikTok' : 'Shopee'} />
    );
  if (entities.includes(module as Entity))
    return <EntityDetail key={id} entity={module as Entity} id={id} />;
  notFound();
}
