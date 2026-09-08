import type { WorkspaceData, Performance } from '@/types/domain';
export const money = (n: number, compact = true) =>
  'Rp' +
  (compact
    ? new Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n)
    : new Intl.NumberFormat('id-ID').format(n));
export const number = (n: number) => new Intl.NumberFormat('en').format(n);
export const sum = (
  rows: Performance[],
  key: 'gmv' | 'orders' | 'units_sold' | 'commission' = 'gmv',
) => rows.reduce((s, r) => s + r[key], 0);
export const initials = (s: string) =>
  s
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('');
export function trend(data: WorkspaceData, days = 30) {
  const dates = [
    ...new Set(
      [...data.tiktok_performance, ...data.shopee_performance].map(
        (r) => r.date,
      ),
    ),
  ]
    .sort()
    .slice(-days);
  return dates.map((date) => ({
    date,
    label: new Date(date + 'T00:00:00').toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
    }),
    TikTok: sum(data.tiktok_performance.filter((r) => r.date === date)),
    Shopee: sum(data.shopee_performance.filter((r) => r.date === date)),
  }));
}
