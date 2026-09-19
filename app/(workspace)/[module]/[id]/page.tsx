import { Acquisition, Outreach, PerformanceWatch } from '@/components/workflows/creators';
import { MonthlyPlanning } from '@/components/workflows/workspace';
import { StockWatch, PeakDays } from '@/components/workflows/activations';
import { Reports } from '@/components/workflows/reports';
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
  if (module === 'creators' && id === 'acquisition') return <Acquisition />;
  if (module === 'creators' && id === 'outreach') return <Outreach />;
  if (module === 'creators' && id === 'performance') return <PerformanceWatch />;
  if (module === 'campaigns' && id === 'planning') return <MonthlyPlanning />;
  if (module === 'hsl' && id === 'stock') return <StockWatch />;
  if (module === 'peak-days') return <PeakDays id={id} />;
  if (module === 'reports') return id === 'monthly' ? <Reports monthly /> : <Reports id={id} />;
  if (module === 'imports' && ['tiktok', 'shopee'].includes(id))
    return (
      <ImportCenter key={id} market={id === 'tiktok' ? 'TikTok' : 'Shopee'} />
    );
  if (entities.includes(module as Entity))
    return <EntityDetail key={id} entity={module as Entity} id={id} />;
  notFound();
}
