import type { PeriodMode, AnalyticsPeriod, CalendarGranularity } from './types.ts';

/**
 * Returns today's ISO date string in Asia/Jakarta timezone (YYYY-MM-DD).
 */
export function getJakartaToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Adds or subtracts days from an ISO date string in UTC math without timezone drift.
 */
export function shiftDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculates inclusive day count between two ISO dates.
 */
export function getDayCount(start: string, end: string): number {
  if (start > end) return 0;
  const startMs = Date.parse(start + 'T00:00:00Z');
  const endMs = Date.parse(end + 'T00:00:00Z');
  return Math.round((endMs - startMs) / 86400000) + 1;
}

/**
 * Formats an ISO date into human-readable Indonesian/English short format.
 */
export function formatDateHuman(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00+07:00');
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  } catch {
    return isoDate;
  }
}

/**
 * Resolves period boundaries based on period mode and optional custom dates.
 */
export function resolveAnalyticsPeriod(
  mode: PeriodMode,
  options: {
    now?: Date;
    cutoffDays?: number;
    customStart?: string;
    customEnd?: string;
  } = {},
): AnalyticsPeriod {
  const { now = new Date(), cutoffDays = 2, customStart, customEnd } = options;
  const today = getJakartaToday(now);
  const cutoffDate = shiftDate(today, -cutoffDays);

  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  switch (mode) {
    case 'TODAY': {
      return {
        mode,
        start: today,
        end: today,
        label: `Today (${formatDateHuman(today)})`,
        dayCount: 1,
        cutoffDate,
      };
    }

    case 'YESTERDAY': {
      const yesterday = shiftDate(today, -1);
      return {
        mode,
        start: yesterday,
        end: yesterday,
        label: `Yesterday (${formatDateHuman(yesterday)})`,
        dayCount: 1,
        cutoffDate,
      };
    }

    case 'LAST_7_DAYS': {
      const start = shiftDate(today, -6);
      return {
        mode,
        start,
        end: today,
        label: `Last 7 Days (${formatDateHuman(start)} – ${formatDateHuman(today)})`,
        dayCount: 7,
        cutoffDate,
      };
    }

    case 'LAST_30_DAYS': {
      const start = shiftDate(today, -29);
      return {
        mode,
        start,
        end: today,
        label: `Last 30 Days (${formatDateHuman(start)} – ${formatDateHuman(today)})`,
        dayCount: 30,
        cutoffDate,
      };
    }

    case 'THIS_WEEK': {
      // Monday of current week (ISO Monday = 1)
      const d = new Date(today + 'T12:00:00Z');
      const dayOfWeek = d.getUTCDay() || 7; // 1 = Mon, 7 = Sun
      const monday = shiftDate(today, -(dayOfWeek - 1));
      return {
        mode,
        start: monday,
        end: today,
        label: `This Week (${formatDateHuman(monday)} – ${formatDateHuman(today)})`,
        dayCount: getDayCount(monday, today),
        cutoffDate,
      };
    }

    case 'LAST_WEEK': {
      // Previous Monday through previous Sunday
      const d = new Date(today + 'T12:00:00Z');
      const dayOfWeek = d.getUTCDay() || 7;
      const thisMonday = shiftDate(today, -(dayOfWeek - 1));
      const lastMonday = shiftDate(thisMonday, -7);
      const lastSunday = shiftDate(thisMonday, -1);
      return {
        mode,
        start: lastMonday,
        end: lastSunday,
        label: `Last Week (${formatDateHuman(lastMonday)} – ${formatDateHuman(lastSunday)})`,
        dayCount: 7,
        cutoffDate,
      };
    }

    case 'THIS_MONTH': {
      const start = `${today.slice(0, 7)}-01`;
      return {
        mode,
        start,
        end: today,
        label: `This Month (${formatDateHuman(start)} – ${formatDateHuman(today)})`,
        dayCount: getDayCount(start, today),
        cutoffDate,
      };
    }

    case 'LAST_MONTH': {
      // Month calculation with UTC
      const prevMonthEndObj = new Date(Date.UTC(year, month - 1, 0));
      const prevEnd = prevMonthEndObj.toISOString().slice(0, 10);
      const prevStart = `${prevEnd.slice(0, 7)}-01`;
      return {
        mode,
        start: prevStart,
        end: prevEnd,
        label: `Last Month (${formatDateHuman(prevStart)} – ${formatDateHuman(prevEnd)})`,
        dayCount: getDayCount(prevStart, prevEnd),
        cutoffDate,
      };
    }

    case 'CUSTOM_DATE_RANGE':
    default: {
      const start = customStart || shiftDate(today, -29);
      const end = customEnd || today;
      return {
        mode: 'CUSTOM_DATE_RANGE',
        start,
        end,
        label: `${formatDateHuman(start)} – ${formatDateHuman(end)}`,
        dayCount: getDayCount(start, end),
        cutoffDate,
      };
    }
  }
}

/**
 * Resolves calendar-based period (DAY, WEEK, MONTH, CUSTOM).
 */
export function resolveCalendarPeriod(
  granularity: CalendarGranularity,
  selectedDate: string, // YYYY-MM-DD
  now = new Date(),
): AnalyticsPeriod {
  const today = getJakartaToday(now);
  const cutoffDate = shiftDate(today, -2);

  switch (granularity) {
    case 'DAY': {
      return {
        mode: 'TODAY',
        start: selectedDate,
        end: selectedDate,
        label: formatDateHuman(selectedDate),
        dayCount: 1,
        cutoffDate,
      };
    }

    case 'WEEK': {
      // Monday of the week containing selectedDate
      const d = new Date(selectedDate + 'T12:00:00Z');
      const dayOfWeek = d.getUTCDay() || 7;
      const monday = shiftDate(selectedDate, -(dayOfWeek - 1));
      const sunday = shiftDate(monday, 6);
      return {
        mode: 'THIS_WEEK',
        start: monday,
        end: sunday,
        label: `Week of ${formatDateHuman(monday)} (${formatDateHuman(monday)} – ${formatDateHuman(sunday)})`,
        dayCount: 7,
        cutoffDate,
      };
    }

    case 'MONTH': {
      const year = Number(selectedDate.slice(0, 4));
      const month = Number(selectedDate.slice(5, 7));
      const start = `${selectedDate.slice(0, 7)}-01`;
      const monthEndObj = new Date(Date.UTC(year, month, 0));
      const end = monthEndObj.toISOString().slice(0, 10);
      const monthName = new Intl.DateTimeFormat('en-GB', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(start + 'T12:00:00+07:00'));

      return {
        mode: 'THIS_MONTH',
        start,
        end,
        label: monthName,
        dayCount: getDayCount(start, end),
        cutoffDate,
      };
    }

    case 'CUSTOM':
    default: {
      return resolveAnalyticsPeriod('LAST_30_DAYS', { now });
    }
  }
}
