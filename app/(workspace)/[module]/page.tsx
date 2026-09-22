import { PerformanceOverview, MyWork } from '@/components/workflows/workspace';
import { HSL, Samples, PeakDays } from '@/components/workflows/activations';
import { Reports } from '@/components/workflows/reports';
import { notFound } from 'next/navigation';
import { EntityTable } from '@/components/operations/entity-table';
import { MarketplacePage } from '@/components/operations/marketplace';
import { ImportCenter } from '@/components/operations/import-center';
import {
  UsersPage,
  SettingsPage,
} from '@/components/operations/system-pages';
import { entities, type Entity } from '@/types/domain';
import { ActionCenter } from '@/components/workflows/action-center';
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
  if (module === 'reports') return <Reports />;
  if (module === 'my-work') return <MyWork />;
  if (module === 'actions') return <ActionCenter />;
  if (module === 'performance') return <PerformanceOverview />;
  if (module === 'hsl') return <HSL />;
  if (module === 'samples') return <Samples />;
  if (module === 'peak-days') return <PeakDays />;
  if (module === 'users') return <UsersPage />;
  if (module === 'settings') return <SettingsPage />;
  notFound();
}
