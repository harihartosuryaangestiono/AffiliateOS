import type { ReportTemplate } from './templates.ts';

export type FrozenReportSnapshot = {
  period: { start: string; end: string; cutoff?: string };
  marketplace: string;
  metrics: Record<string, number | null | undefined>;
  sources?: Array<Record<string, string | number | null | undefined>>;
  narrative?: Record<string, string | null | undefined>;
  finalized_by?: string;
  template?: { id: string; version: string; name: string };
};

const aliases: Record<string, string[]> = {
  affiliateGmv: ['affiliateGmv', 'gmv'],
  quantity: ['quantity', 'units'],
  affiliatesWithSales: ['affiliatesWithSales', 'affiliates'],
  totalAffiliates: ['totalAffiliates', 'activeCreators'],
  targetAchievement: ['targetAchievement', 'achievement'],
};

export function snapshotMetric(
  snapshot: FrozenReportSnapshot,
  key: string,
): number | null {
  for (const candidate of aliases[key] || [key]) {
    const value = snapshot.metrics[candidate];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value === null) return null;
  }
  return null;
}

export function snapshotWithTemplate(
  snapshot: FrozenReportSnapshot,
  template: ReportTemplate,
): FrozenReportSnapshot {
  return {
    ...snapshot,
    template: snapshot.template || {
      id: template.id,
      version: template.version,
      name: template.name,
    },
  };
}

export const metricLabels: Record<string, string> = {
  affiliateGmv: 'Affiliate Revenue',
  orders: 'Orders',
  quantity: 'Qty',
  affiliatesWithSales: 'Affiliate With Sales',
  totalAffiliates: 'Total Numbers of Affiliate',
  commission: 'Commission',
  asp: 'ASP',
  roi: 'ROI',
  costRatio: 'Cost Ratio',
  storeRevenue: 'Store Revenue',
  affiliateContribution: 'Contribution to Store GMV',
  target: 'Target',
  targetAchievement: 'Contribution to Target',
  growth: 'Growth',
};

export function safeReportFilename(
  parts: string[],
  extension: 'xlsx' | 'pptx',
) {
  return `${parts
    .join('_')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')}.${extension}`;
}
