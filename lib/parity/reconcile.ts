import type { CanonicalMetrics, ReconciliationResult } from './types.ts';

export function reconcileMetrics(input: {
  marketplace: 'Shopee' | 'TikTok';
  period: { start: string; end: string };
  reference: Partial<CanonicalMetrics>;
  actual: CanonicalMetrics;
  percentageTolerance?: number;
}): ReconciliationResult[] {
  const percentage = new Set<keyof CanonicalMetrics>([
    'affiliateContribution',
    'targetAchievement',
    'costRatio',
  ]);
  return (Object.keys(input.reference) as (keyof CanonicalMetrics)[]).map(
    (metric) => {
      const reference = input.reference[metric] ?? null;
      const actual = input.actual[metric];
      if (reference === null || actual === null)
        return {
          marketplace: input.marketplace,
          period: input.period,
          metric,
          reference,
          actual,
          delta: null,
          status: 'SOURCE_UNAVAILABLE',
        };
      const delta = actual - reference;
      const tolerance = percentage.has(metric)
        ? (input.percentageTolerance ?? 0.000001)
        : metric === 'roi'
          ? 0.00001
          : 0.5;
      return {
        marketplace: input.marketplace,
        period: input.period,
        metric,
        reference,
        actual,
        delta,
        status: Math.abs(delta) <= tolerance ? 'PASS' : 'INVESTIGATE',
      };
    },
  );
}
