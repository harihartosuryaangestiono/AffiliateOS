import { notFound } from 'next/navigation';
import { EntityTable } from '@/components/operations/entity-table';
import { MarketplacePage } from '@/components/operations/marketplace';
import { ImportCenter } from '@/components/operations/import-center';
import {
  ReportsPage,
  UsersPage,
  SettingsPage,
} from '@/components/operations/system-pages';
import { entities, type Entity } from '@/types/domain';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ create?: string }>;
}) {
  const { module } = await params;
  const query = await searchParams;
  if (entities.includes(module as Entity))
    return (
      <EntityTable
        key={module + (query.create || '')}
        entity={module as Entity}
      />
    );
  if (module === 'tiktok' || module === 'shopee')
    return (
      <MarketplacePage
        key={module}
        market={module === 'tiktok' ? 'TikTok' : 'Shopee'}
      />
    );
  if (module === 'imports') return <ImportCenter />;
  if (module === 'reports') return <ReportsPage />;
  if (module === 'users') return <UsersPage />;
  if (module === 'settings') return <SettingsPage />;
  notFound();
}
