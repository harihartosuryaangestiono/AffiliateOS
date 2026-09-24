import type { Performance } from '../../types/domain.ts';
import type { TimeSeriesDualPoint, AnalyticsPeriod, AnalyticsComparison } from './types.ts';
import { shiftDate, getDayCount } from './periods.ts';

export type TimeSeriesMetric =
  | 'gmv'
  | 'orders'
  | 'units_sold'
  | 'commission'
  | 'asp';

export function buildDualTimeSeries(
  currentRows: Performance[],
  comparisonRows: Performance[],
  currentPeriod: AnalyticsPeriod,
  comparisonPeriod: AnalyticsComparison,
  metric: TimeSeriesMetric = 'gmv',
): TimeSeriesDualPoint[] {
  const curStart = currentPeriod.start;
  const curEnd = currentPeriod.end;
  const numDays = Math.max(1, getDayCount(curStart, curEnd));

  const compStart = comparisonPeriod?.start;
  const compEnd = comparisonPeriod?.end;
  const compNumDays = compStart && compEnd ? getDayCount(compStart, compEnd) : 0;

  // Build daily sums for current period
  const curDailyMap = new Map<string, number>();
  for (const r of currentRows) {
    if (r.date >= curStart && r.date <= curEnd) {
      const val =
        metric === 'asp'
          ? (r.gmv || 0)
          : Number((r as Record<string, unknown>)[metric] || 0);
      curDailyMap.set(r.date, (curDailyMap.get(r.date) || 0) + val);
    }
  }

  // If metric is ASP, we also need units for weighted average
  const curUnitsMap = new Map<string, number>();
  if (metric === 'asp') {
    for (const r of currentRows) {
      if (r.date >= curStart && r.date <= curEnd) {
        curUnitsMap.set(
          r.date,
          (curUnitsMap.get(r.date) || 0) + Number(r.units_sold || 0),
        );
      }
    }
  }

  // Build daily sums for comparison period
  const compDailyMap = new Map<string, number>();
  const compUnitsMap = new Map<string, number>();
  if (compStart && compEnd) {
    for (const r of comparisonRows) {
      if (r.date >= compStart && r.date <= compEnd) {
        const val =
          metric === 'asp'
            ? (r.gmv || 0)
            : Number((r as Record<string, unknown>)[metric] || 0);
        compDailyMap.set(r.date, (compDailyMap.get(r.date) || 0) + val);

        if (metric === 'asp') {
          compUnitsMap.set(
            r.date,
            (compUnitsMap.get(r.date) || 0) + Number(r.units_sold || 0),
          );
        }
      }
    }
  }

  const points: TimeSeriesDualPoint[] = [];
  let cumCur = 0;
  let cumComp = 0;
  let cumCurUnits = 0;
  let cumCompUnits = 0;

  for (let i = 0; i < numDays; i++) {
    const curDate = shiftDate(curStart, i);
    let curVal = curDailyMap.get(curDate) || 0;
    if (metric === 'asp') {
      const units = curUnitsMap.get(curDate) || 0;
      curVal = units > 0 ? curVal / units : 0;
      cumCur += curDailyMap.get(curDate) || 0;
      cumCurUnits += units;
    } else {
      cumCur += curVal;
    }

    let compDate: string | undefined = undefined;
    let compVal: number | undefined = undefined;
    if (compStart && i < compNumDays) {
      compDate = shiftDate(compStart, i);
      const rawCompVal = compDailyMap.get(compDate) || 0;
      if (metric === 'asp') {
        const units = compUnitsMap.get(compDate) || 0;
        compVal = units > 0 ? rawCompVal / units : 0;
        cumComp += rawCompVal;
        cumCompUnits += units;
      } else {
        compVal = rawCompVal;
        cumComp += rawCompVal;
      }
    }

    const absDelta = compVal !== undefined ? curVal - compVal : undefined;
    const pctDelta =
      compVal !== undefined && compVal > 0
        ? Math.round(((curVal - compVal) / compVal) * 1000) / 10
        : null;

    points.push({
      index: i + 1,
      currentDate: curDate,
      currentValue: Math.round(curVal * 100) / 100,
      cumulativeCurrent:
        metric === 'asp'
          ? cumCurUnits > 0
            ? Math.round((cumCur / cumCurUnits) * 100) / 100
            : 0
          : Math.round(cumCur * 100) / 100,
      comparisonDate: compDate,
      comparisonValue: compVal !== undefined ? Math.round(compVal * 100) / 100 : undefined,
      cumulativeComparison:
        compVal !== undefined
          ? metric === 'asp'
            ? cumCompUnits > 0
              ? Math.round((cumComp / cumCompUnits) * 100) / 100
              : 0
            : Math.round(cumComp * 100) / 100
          : undefined,
      absoluteDelta: absDelta !== undefined ? Math.round(absDelta * 100) / 100 : undefined,
      percentageDelta: pctDelta,
    });
  }

  return points;
}
