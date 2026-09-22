import type { WorkspaceData, RecordData, Performance } from '../../types/domain.ts';
import { metrics, comparable, performanceRows } from '../operations/engine.ts';
import { aggregateBrandPerformance, type BrandPerformanceRow } from './brand-mapping.ts';
import {
  BUSINESS_CONFIRMATION_NOTE,
  type DataClassification,
  type SlideContract,
} from './contracts.ts';

type AugmentedPerformance = Performance & {
  creator_id?: string;
  quantity?: number;
  channel?: string;
  format?: string;
};

export type TimeSeriesPoint = {
  date: string;
  marketplace: string;
  affiliateGmv: number | null;
  orders: number | null;
  quantity: number | null;
  affiliatesWithSales: number | null;
  totalAffiliates: number | null;
  commission: number | null;
  asp: number | null;
  abs: number | null;
  roi: number | null;
  costRatio: number | null;
  storeRevenue: number | null;
  contribution: number | null;
  target: number | null;
};

export type FunnelSplitData = {
  classification: DataClassification;
  open: { gmv: number | null; affiliates: number | null; contribution: number | null };
  targeted: { gmv: number | null; affiliates: number | null; contribution: number | null };
  channels: {
    live: { gmv: number | null; affiliates: number | null; sessions: number | null };
    video: { gmv: number | null; affiliates: number | null; videos: number | null };
    shareLink: { gmv: number | null; affiliates: number | null };
  };
  reason: string;
};

export type PeakDayComparisonData = {
  classification: DataClassification;
  currentPeakDay: { name: string; date: string; gmv: number; orders: number; quantity: number; commission: number; roi: number | null; costRatio: number | null; affiliates: number } | null;
  comparisonPeakDay: { name: string; date: string; gmv: number; orders: number; quantity: number; commission: number; roi: number | null; costRatio: number | null; affiliates: number } | null;
  growth: { gmv: number | null; orders: number | null; quantity: number | null; commission: number | null; affiliates: number | null } | null;
  reason: string;
};

export type ActivationPlanningData = {
  classification: DataClassification;
  initiatives: Array<{
    name: string;
    creatorsTarget: number | null;
    contentTarget: string | null;
    budget: number | null;
  }>;
  totalBudget: number | null;
  totalCreators: number | null;
  reason: string;
};

export type SectionCompleteness = {
  section: string;
  percentage: number;
  status: 'READY' | 'PARTIAL' | 'SOURCE_UNAVAILABLE' | 'NEEDS_CONFIRMATION';
};

export type ReportDataset = {
  schemaVersion: string;
  generatedAt: string;
  generatedBy: string;
  reportId: string;
  reportName: string;
  marketplace: string;
  period: { start: string; end: string; cutoff: string };
  businessConfirmationNote: string;
  kpiSummary: {
    current: Record<string, number | null>;
    previous: Record<string, number | null>;
    growth: Record<string, number | null>;
  };
  timeSeries: TimeSeriesPoint[];
  funnel: FunnelSplitData;
  brandPerformance: {
    classification: DataClassification;
    rows: BrandPerformanceRow[];
    reason: string;
  };
  peakDayComparison: PeakDayComparisonData;
  activationPlanning: ActivationPlanningData;
  operationalNarratives: {
    what_went_well: string;
    issues: string;
    next_action: string;
  };
  sourceLineage: Array<{
    id: string;
    marketplace: string;
    filename: string;
    period_start: string;
    period_end: string;
    sales_metric: string;
    status: string;
  }>;
  completeness: SectionCompleteness[];
  slideReadiness: SlideContract[];
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
};

export function buildReportDataset(input: {
  report: RecordData;
  data: WorkspaceData;
  actorName?: string;
}): ReportDataset {
  const { report, data, actorName = 'System' } = input;
  const period = {
    start: String(report.period_start),
    end: String(report.period_end) < String(report.cutoff_date) ? String(report.period_end) : String(report.cutoff_date),
    cutoff: String(report.cutoff_date),
  };
  const marketplace = String(report.marketplace);
  const filter = {
    campaign_id: report.campaign_id ? String(report.campaign_id) : undefined,
    client_id: report.client_id ? String(report.client_id) : undefined,
  };

  // 1. KPI Summary
  const currentMetrics = metrics(data, period, marketplace, filter);
  const prevPeriod = comparable(period);
  const prevMetrics = metrics(data, prevPeriod, marketplace, filter);

  const calcGrowth = (curr: number | null, prev: number | null) =>
    curr !== null && prev !== null && prev > 0 ? ((curr - prev) / prev) * 100 : null;

  const kpiSummary = {
    current: {
      affiliateGmv: currentMetrics.gmv,
      orders: currentMetrics.orders,
      quantity: currentMetrics.units,
      affiliatesWithSales: currentMetrics.affiliates,
      totalAffiliates: currentMetrics.activeCreators,
      commission: currentMetrics.commission,
      asp: currentMetrics.asp,
      abs: currentMetrics.abs,
      roi: currentMetrics.roi,
      costRatio: currentMetrics.costRatio,
      storeRevenue: null,
      contribution: null,
      target: currentMetrics.target,
      targetAchievement: currentMetrics.achievement,
    },
    previous: {
      affiliateGmv: prevMetrics.gmv,
      orders: prevMetrics.orders,
      quantity: prevMetrics.units,
      affiliatesWithSales: prevMetrics.affiliates,
      totalAffiliates: prevMetrics.activeCreators,
      commission: prevMetrics.commission,
      asp: prevMetrics.asp,
      abs: prevMetrics.abs,
      roi: prevMetrics.roi,
      costRatio: prevMetrics.costRatio,
      storeRevenue: null,
      contribution: null,
      target: prevMetrics.target,
      targetAchievement: prevMetrics.achievement,
    },
    growth: {
      affiliateGmv: currentMetrics.growth,
      orders: calcGrowth(currentMetrics.orders, prevMetrics.orders),
      quantity: calcGrowth(currentMetrics.units, prevMetrics.units),
      affiliatesWithSales: calcGrowth(currentMetrics.affiliates, prevMetrics.affiliates),
      totalAffiliates: calcGrowth(currentMetrics.activeCreators, prevMetrics.activeCreators),
      commission: calcGrowth(currentMetrics.commission, prevMetrics.commission),
      asp: calcGrowth(currentMetrics.asp, prevMetrics.asp),
      abs: calcGrowth(currentMetrics.abs, prevMetrics.abs),
      roi: currentMetrics.roi !== null && prevMetrics.roi !== null ? currentMetrics.roi - prevMetrics.roi : null,
      costRatio: currentMetrics.costRatio !== null && prevMetrics.costRatio !== null ? (currentMetrics.costRatio - prevMetrics.costRatio) * 100 : null,
      storeRevenue: null,
      contribution: null,
      target: null,
      targetAchievement: null,
    },
  };

  // 2. Historical Time Series
  const allRows = performanceRows(data, marketplace, filter) as AugmentedPerformance[];
  const rowsInPeriod = allRows.filter((r) => r.date >= period.start && r.date <= period.end);

  const datesMap = new Map<string, AugmentedPerformance[]>();
  for (const r of rowsInPeriod) {
    const list = datesMap.get(r.date) || [];
    list.push(r);
    datesMap.set(r.date, list);
  }

  const timeSeries: TimeSeriesPoint[] = Array.from(datesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => {
      const gmv = rows.reduce((s, r) => s + Number(r.gmv || 0), 0);
      const orders = rows.reduce((s, r) => s + Number(r.orders || 0), 0);
      const quantity = rows.reduce((s, r) => s + Number(r.units_sold || r.quantity || 0), 0);
      const commission = rows.reduce((s, r) => s + Number(r.commission || 0), 0);
      const affiliates = new Set(rows.filter((r) => r.orders > 0).map((r) => r.creator_id || r.account_id)).size;

      return {
        date,
        marketplace,
        affiliateGmv: gmv,
        orders,
        quantity,
        affiliatesWithSales: affiliates,
        totalAffiliates: new Set(rows.map((r) => r.creator_id || r.account_id)).size,
        commission,
        asp: quantity ? gmv / quantity : null,
        abs: orders ? gmv / orders : null,
        roi: commission ? gmv / commission : null,
        costRatio: gmv ? commission / gmv : null,
        storeRevenue: null,
        contribution: null,
        target: null,
      };
    });

  // 3. Funnel Data
  const funnel: FunnelSplitData = {
    classification: 'PARTIALLY_SUPPORTED',
    open: { gmv: null, affiliates: null, contribution: null },
    targeted: { gmv: null, affiliates: null, contribution: null },
    channels: {
      live: {
        gmv: rowsInPeriod.filter((r) => r.channel === 'Live' || r.format === 'Live').reduce((s, r) => s + Number(r.gmv || 0), 0) || null,
        affiliates: new Set(rowsInPeriod.filter((r) => r.channel === 'Live' || r.format === 'Live').map((r) => r.creator_id || r.account_id)).size || null,
        sessions: null,
      },
      video: {
        gmv: rowsInPeriod.filter((r) => r.channel === 'Video' || r.format === 'Video').reduce((s, r) => s + Number(r.gmv || 0), 0) || null,
        affiliates: new Set(rowsInPeriod.filter((r) => r.channel === 'Video' || r.format === 'Video').map((r) => r.creator_id || r.account_id)).size || null,
        videos: null,
      },
      shareLink: {
        gmv: rowsInPeriod.filter((r) => r.channel === 'Share Link').reduce((s, r) => s + Number(r.gmv || 0), 0) || null,
        affiliates: new Set(rowsInPeriod.filter((r) => r.channel === 'Share Link').map((r) => r.creator_id || r.account_id)).size || null,
      },
    },
    reason: 'Channel split is supported from normalized performance. Open vs Targeted tier split requires human business confirmation.',
  };

  // 4. Brand Performance
  const brandRows = aggregateBrandPerformance(rowsInPeriod, data, currentMetrics.gmv);
  const brandPerformance = {
    classification: brandRows.length ? ('SUPPORTED' as DataClassification) : ('SOURCE_UNAVAILABLE' as DataClassification),
    rows: brandRows,
    reason: brandRows.length ? 'Brand performance mapped via master brand definitions.' : 'No product rows found for brand attribution.',
  };

  // 5. Peak Day Comparison
  const ops = data.operations || {};
  const peakDays = ops.peak_days || [];
  const peak1 = peakDays[0];
  const peak2 = peakDays[1];

  let peakDayComparison: PeakDayComparisonData;

  if (peak1 && peak2) {
    const p1Rows = allRows.filter((r) => r.date === peak1.event_date);
    const p2Rows = allRows.filter((r) => r.date === peak2.event_date);

    const calcPeak = (p: RecordData, rows: AugmentedPerformance[]) => {
      const gmv = rows.reduce((s, r) => s + Number(r.gmv || 0), 0);
      const orders = rows.reduce((s, r) => s + Number(r.orders || 0), 0);
      const quantity = rows.reduce((s, r) => s + Number(r.units_sold || r.quantity || 0), 0);
      const commission = rows.reduce((s, r) => s + Number(r.commission || 0), 0);
      return {
        name: String(p.name),
        date: String(p.event_date),
        gmv,
        orders,
        quantity,
        commission,
        roi: commission ? gmv / commission : null,
        costRatio: gmv ? commission / gmv : null,
        affiliates: new Set(rows.filter((r) => r.orders > 0).map((r) => r.creator_id || r.account_id)).size,
      };
    };

    const c1 = calcPeak(peak1, p1Rows);
    const c2 = calcPeak(peak2, p2Rows);

    peakDayComparison = {
      classification: 'SUPPORTED',
      currentPeakDay: c2,
      comparisonPeakDay: c1,
      growth: {
        gmv: calcGrowth(c2.gmv, c1.gmv),
        orders: calcGrowth(c2.orders, c1.orders),
        quantity: calcGrowth(c2.quantity, c1.quantity),
        commission: calcGrowth(c2.commission, c1.commission),
        affiliates: calcGrowth(c2.affiliates, c1.affiliates),
      },
      reason: `Compared ${c2.name} (${c2.date}) against previous Peak Day ${c1.name} (${c1.date}).`,
    };
  } else if (peak1) {
    const p1Rows = allRows.filter((r) => r.date === peak1.event_date);
    const gmv = p1Rows.reduce((s, r) => s + Number(r.gmv || 0), 0);
    const orders = p1Rows.reduce((s, r) => s + Number(r.orders || 0), 0);
    const quantity = p1Rows.reduce((s, r) => s + Number(r.units_sold || r.quantity || 0), 0);
    const commission = p1Rows.reduce((s, r) => s + Number(r.commission || 0), 0);

    peakDayComparison = {
      classification: 'PARTIALLY_SUPPORTED',
      currentPeakDay: {
        name: String(peak1.name),
        date: String(peak1.event_date),
        gmv,
        orders,
        quantity,
        commission,
        roi: commission ? gmv / commission : null,
        costRatio: gmv ? commission / gmv : null,
        affiliates: new Set(p1Rows.filter((r) => r.orders > 0).map((r) => r.creator_id || r.account_id)).size,
      },
      comparisonPeakDay: null,
      growth: null,
      reason: 'Single Peak Day recorded; comparison Peak Day unavailable.',
    };
  } else {
    peakDayComparison = {
      classification: 'SOURCE_UNAVAILABLE',
      currentPeakDay: null,
      comparisonPeakDay: null,
      growth: null,
      reason: 'No Peak Day campaign events found in workspace.',
    };
  }

  // 6. Activation Planning
  const monthlyPlans = ops.monthly_plans || [];
  const activePlan = monthlyPlans.find((p) => String(p.month).slice(0, 7) === period.start.slice(0, 7)) || monthlyPlans[0];

  const activationPlanning: ActivationPlanningData = {
    classification: activePlan ? 'SUPPORTED' : 'SOURCE_UNAVAILABLE',
    initiatives: activePlan
      ? [
          {
            name: String(activePlan.name || 'Monthly Activation Plan'),
            creatorsTarget: activePlan.target_creators ? Number(activePlan.target_creators) : null,
            contentTarget: String(activePlan.strategy || activePlan.product_focus || 'Planned activations'),
            budget: null,
          },
        ]
      : [],
    totalBudget: null,
    totalCreators: activePlan?.target_creators ? Number(activePlan.target_creators) : null,
    reason: activePlan ? 'Monthly plan objectives found.' : 'No monthly planning records exist for this period.',
  };

  // 7. Source Lineage
  const sources = data.imports
    .filter((job) => currentMetrics.sourceImportIds.includes(job.id))
    .map((job) => ({
      id: job.id,
      marketplace: job.marketplace,
      filename: job.filename || 'Payment Order',
      period_start: String(job.period_start || '—'),
      period_end: String(job.period_end || '—'),
      sales_metric: String(job.sales_metric || 'Processed affiliate sales'),
      status: String(job.status || 'Processed'),
    }));

  // 8. Slide Readiness
  const slideReadiness: SlideContract[] = [
    {
      slideId: 'slide_16',
      slideNumber: 16,
      title: 'Affiliate KPI Summary',
      classification: currentMetrics.gmv > 0 ? 'SUPPORTED' : 'PARTIALLY_SUPPORTED',
      requiredFields: ['affiliateGmv', 'orders', 'quantity', 'commission', 'affiliatesWithSales'],
      supportedFields: ['affiliateGmv', 'orders', 'quantity', 'commission', 'affiliatesWithSales', 'roi', 'costRatio'],
      missingFields: [],
      reason: 'KPI summary and time-series metrics populated from normalized sales.',
    },
    {
      slideId: 'slide_17',
      slideNumber: 17,
      title: 'Funnel Split',
      classification: 'PARTIALLY_SUPPORTED',
      requiredFields: ['liveGmv', 'videoGmv', 'shareLinkGmv', 'openGmv', 'targetedGmv'],
      supportedFields: ['liveGmv', 'videoGmv', 'shareLinkGmv'],
      missingFields: ['openGmv', 'targetedGmv'],
      reason: 'Channel metrics supported; Open vs Targeted tier split marked BUSINESS_CONFIRMATION_REQUIRED.',
    },
    {
      slideId: 'slide_18',
      slideNumber: 18,
      title: 'Brand Performance',
      classification: brandPerformance.classification,
      requiredFields: ['brand', 'gmv', 'orders', 'quantity'],
      supportedFields: brandRows.map((b) => b.brand_name),
      missingFields: [],
      reason: brandPerformance.reason,
    },
    {
      slideId: 'slide_19',
      slideNumber: 19,
      title: 'Rank-up Program',
      classification: 'SOURCE_UNAVAILABLE',
      requiredFields: ['topTierCount', 'risingTierCount', 'newTierCount', 'tierTargets'],
      supportedFields: [],
      missingFields: ['topTierCount', 'risingTierCount', 'newTierCount', 'tierTargets'],
      reason: 'AffiliateOS does not store creator rank tier baselines. Excluded from deck assembly without fabricated rank data.',
    },
    {
      slideId: 'slide_20',
      slideNumber: 20,
      title: 'Peak Day Comparison',
      classification: peakDayComparison.classification,
      requiredFields: ['currentPeakDay', 'comparisonPeakDay', 'growth'],
      supportedFields: peakDayComparison.currentPeakDay ? ['currentPeakDay'] : [],
      missingFields: peakDayComparison.comparisonPeakDay ? [] : ['comparisonPeakDay'],
      reason: peakDayComparison.reason,
    },
    {
      slideId: 'slide_21',
      slideNumber: 21,
      title: 'Operational Narrative',
      classification: 'SUPPORTED',
      requiredFields: ['what_went_well', 'issues', 'next_action'],
      supportedFields: ['what_went_well', 'issues', 'next_action'],
      missingFields: [],
      reason: 'Manual narratives and snapshot KPIs are fully supported.',
    },
    {
      slideId: 'slide_31',
      slideNumber: 31,
      title: 'Q4 Activation Plan',
      classification: activationPlanning.classification,
      requiredFields: ['initiative', 'creatorTarget', 'budget'],
      supportedFields: ['initiative', 'creatorTarget'],
      missingFields: ['budget'],
      reason: activationPlanning.reason,
    },
  ];

  // 9. Completeness Summary
  const completeness: SectionCompleteness[] = [
    { section: 'KPI Summary', percentage: 100, status: 'READY' },
    { section: 'Time Series', percentage: timeSeries.length ? 100 : 0, status: timeSeries.length ? 'READY' : 'SOURCE_UNAVAILABLE' },
    { section: 'Funnel Split', percentage: 60, status: 'NEEDS_CONFIRMATION' },
    { section: 'Brand Performance', percentage: brandRows.length ? 100 : 0, status: brandRows.length ? 'READY' : 'SOURCE_UNAVAILABLE' },
    { section: 'Peak Day Comparison', percentage: peakDayComparison.currentPeakDay ? 100 : 0, status: peakDayComparison.currentPeakDay ? 'READY' : 'SOURCE_UNAVAILABLE' },
    { section: 'Activation Planning', percentage: activePlan ? 70 : 0, status: activePlan ? 'PARTIAL' : 'SOURCE_UNAVAILABLE' },
    { section: 'Narratives', percentage: 100, status: 'READY' },
    { section: 'Source Lineage', percentage: sources.length ? 100 : 0, status: sources.length ? 'READY' : 'SOURCE_UNAVAILABLE' },
  ];

  // 10. Dataset Validation
  const errors: string[] = [];
  const warnings: string[] = [];

  if (currentMetrics.gmv === 0) {
    warnings.push('Report period contains zero affiliate GMV.');
  }
  if (!sources.length) {
    warnings.push('No source import jobs found for this reporting period.');
  }

  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    generatedBy: actorName,
    reportId: String(report.id),
    reportName: String(report.name),
    marketplace,
    period,
    businessConfirmationNote: BUSINESS_CONFIRMATION_NOTE,
    kpiSummary,
    timeSeries,
    funnel,
    brandPerformance,
    peakDayComparison,
    activationPlanning,
    operationalNarratives: {
      what_went_well: String(report.what_went_well || 'No narrative added.'),
      issues: String(report.issues || 'No issues recorded.'),
      next_action: String(report.next_action || 'No next action recorded.'),
    },
    sourceLineage: sources,
    completeness,
    slideReadiness,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
    },
  };
}
