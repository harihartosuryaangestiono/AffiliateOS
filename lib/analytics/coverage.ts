import type { WorkspaceData } from '../../types/domain.ts';
import type { CoverageStatus, AnalyticsPeriod, AnalyticsComparison } from './types.ts';
import { getJakartaToday, shiftDate } from './periods.ts';

export function evaluateDataCoverage(
  data: WorkspaceData,
  marketplace: 'Shopee' | 'TikTok',
  currentPeriod: AnalyticsPeriod,
  comparisonPeriod: AnalyticsComparison,
): CoverageStatus {
  const rows =
    marketplace === 'TikTok'
      ? data.tiktok_performance
      : data.shopee_performance;

  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const earliestDate = dates[0] || null;
  const latestDate = dates[dates.length - 1] || null;

  const today = getJakartaToday();
  const h2Cutoff = shiftDate(today, -2);
  const isH2Ready = latestDate !== null && latestDate >= h2Cutoff;

  // Find latest successful import job for this marketplace
  const relevantJobs = data.imports
    .filter((j) => j.marketplace === marketplace && j.status === 'Completed')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latestJob = relevantJobs[0];

  // Count distinct dates present within current period
  const curPeriodDates = new Set(
    dates.filter((d) => d >= currentPeriod.start && d <= currentPeriod.end),
  );
  const currentCoverageDays = curPeriodDates.size;
  const currentTotalDays = currentPeriod.dayCount;

  // Count distinct dates present within comparison period
  let compCoverageDays = 0;
  let compTotalDays = 0;
  if (comparisonPeriod) {
    compTotalDays = comparisonPeriod.dayCount;
    const compDates = new Set(
      dates.filter(
        (d) => d >= comparisonPeriod.start && d <= comparisonPeriod.end,
      ),
    );
    compCoverageDays = compDates.size;
  }

  const hasMaterialDiscrepancy =
    comparisonPeriod !== null &&
    (currentCoverageDays !== compCoverageDays ||
      currentPeriod.isPartial ||
      (comparisonPeriod.isCustomUnequalDuration &&
        Math.abs(currentTotalDays - compTotalDays) > 1));

  let warningMessage: string | undefined = undefined;
  if (hasMaterialDiscrepancy && comparisonPeriod) {
    if (currentCoverageDays < currentTotalDays) {
      warningMessage = `Partial data coverage: Current period has ${currentCoverageDays} of ${currentTotalDays} days imported (coverage through ${latestDate || 'unknown'}). Comparison has ${compCoverageDays} days.`;
    } else if (Math.abs(currentCoverageDays - compCoverageDays) > 0) {
      warningMessage = `Fair comparison note: Current period has ${currentCoverageDays} days of data while comparison has ${compCoverageDays} days. Consider normalized daily measures.`;
    }
  }

  return {
    marketplace,
    earliestDate,
    latestDate,
    h2Cutoff,
    isH2Ready,
    lastImportedFile: latestJob?.filename,
    lastImportedAt: latestJob?.created_at,
    currentPeriodCoverageDays: currentCoverageDays,
    currentPeriodTotalDays: currentTotalDays,
    comparisonCoverageDays: compCoverageDays,
    comparisonTotalDays: compTotalDays,
    hasFairComparisonWarning: !!warningMessage,
    warningMessage,
  };
}
