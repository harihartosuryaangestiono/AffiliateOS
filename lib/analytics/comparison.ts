import type {
  ComparisonMode,
  AnalyticsPeriod,
  AnalyticsComparison,
} from './types.ts';
import { shiftDate, getDayCount, formatDateHuman } from './periods.ts';

/**
 * Resolves comparison period based on selected comparison mode and current period.
 */
export function resolveComparisonPeriod(
  currentPeriod: AnalyticsPeriod,
  mode: ComparisonMode,
  options: {
    customStart?: string;
    customEnd?: string;
  } = {},
): AnalyticsComparison {
  if (mode === 'NO_COMPARISON') {
    return null;
  }

  const { start: curStart, end: curEnd, dayCount: curDays } = currentPeriod;

  switch (mode) {
    case 'PREVIOUS_PERIOD': {
      // Exactly same duration immediately preceding curStart
      const compEnd = shiftDate(curStart, -1);
      const compStart = shiftDate(compEnd, -(curDays - 1));
      const compDays = getDayCount(compStart, compEnd);

      return {
        mode,
        start: compStart,
        end: compEnd,
        label: `Previous Period (${formatDateHuman(compStart)} – ${formatDateHuman(compEnd)})`,
        dayCount: compDays,
        isCustomUnequalDuration: false,
      };
    }

    case 'PREVIOUS_WEEK': {
      // Shift 7 days back
      const compStart = shiftDate(curStart, -7);
      const compEnd = shiftDate(curEnd, -7);
      const compDays = getDayCount(compStart, compEnd);

      return {
        mode,
        start: compStart,
        end: compEnd,
        label: `Previous Week (${formatDateHuman(compStart)} – ${formatDateHuman(compEnd)})`,
        dayCount: compDays,
        isCustomUnequalDuration: false,
      };
    }

    case 'PREVIOUS_MONTH': {
      // Full previous calendar month
      const curYear = Number(curStart.slice(0, 4));
      const curMonth = Number(curStart.slice(5, 7));
      const prevMonthEndObj = new Date(Date.UTC(curYear, curMonth - 1, 0));
      const compEnd = prevMonthEndObj.toISOString().slice(0, 10);
      const compStart = `${compEnd.slice(0, 7)}-01`;
      const compDays = getDayCount(compStart, compEnd);

      return {
        mode,
        start: compStart,
        end: compEnd,
        label: `Previous Month (${formatDateHuman(compStart)} – ${formatDateHuman(compEnd)})`,
        dayCount: compDays,
        isCustomUnequalDuration: compDays !== curDays,
        durationDifferenceDays: Math.abs(compDays - curDays),
      };
    }

    case 'SAME_DAY_PREVIOUS_MONTH': {
      // Same-day MTD: e.g. 01–24 Sep vs 01–24 Aug
      const curYear = Number(curStart.slice(0, 4));
      const curMonth = Number(curStart.slice(5, 7));
      const prevMonthEndObj = new Date(Date.UTC(curYear, curMonth - 1, 0));
      const maxPrevDay = prevMonthEndObj.getUTCDate();
      const prevYear = prevMonthEndObj.getUTCFullYear();
      const prevMonth = prevMonthEndObj.getUTCMonth() + 1;
      const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

      const curStartDay = Number(curStart.slice(8, 10));
      const curEndDay = Number(curEnd.slice(8, 10));

      const compStartDay = Math.min(curStartDay, maxPrevDay);
      const compEndDay = Math.min(curEndDay, maxPrevDay);

      const compStart = `${prevMonthPrefix}-${String(compStartDay).padStart(2, '0')}`;
      const compEnd = `${prevMonthPrefix}-${String(compEndDay).padStart(2, '0')}`;
      const compDays = getDayCount(compStart, compEnd);

      return {
        mode,
        start: compStart,
        end: compEnd,
        label: `Same-Day Previous Month (${formatDateHuman(compStart)} – ${formatDateHuman(compEnd)})`,
        dayCount: compDays,
        isCustomUnequalDuration: compDays !== curDays,
        durationDifferenceDays: Math.abs(compDays - curDays),
      };
    }

    case 'PREVIOUS_YEAR': {
      // Same dates 1 year ago (handling leap year Feb 29 -> Feb 28)
      const shiftYear = (dStr: string) => {
        const y = Number(dStr.slice(0, 4)) - 1;
        const m = dStr.slice(5, 7);
        let day = Number(dStr.slice(8, 10));
        if (m === '02' && day === 29) {
          // Check if leap year
          const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
          if (!isLeap) day = 28;
        }
        return `${y}-${m}-${String(day).padStart(2, '0')}`;
      };

      const compStart = shiftYear(curStart);
      const compEnd = shiftYear(curEnd);
      const compDays = getDayCount(compStart, compEnd);

      return {
        mode,
        start: compStart,
        end: compEnd,
        label: `Previous Year (${formatDateHuman(compStart)} – ${formatDateHuman(compEnd)})`,
        dayCount: compDays,
        isCustomUnequalDuration: compDays !== curDays,
        durationDifferenceDays: Math.abs(compDays - curDays),
      };
    }

    case 'CUSTOM_PERIOD': {
      const compStart = options.customStart || shiftDate(curStart, -curDays);
      const compEnd = options.customEnd || shiftDate(curStart, -1);
      const compDays = getDayCount(compStart, compEnd);
      const isUnequal = compDays !== curDays;

      return {
        mode,
        start: compStart,
        end: compEnd,
        label: `Custom (${formatDateHuman(compStart)} – ${formatDateHuman(compEnd)})`,
        dayCount: compDays,
        isCustomUnequalDuration: isUnequal,
        durationDifferenceDays: isUnequal ? Math.abs(compDays - curDays) : 0,
      };
    }
  }
}
