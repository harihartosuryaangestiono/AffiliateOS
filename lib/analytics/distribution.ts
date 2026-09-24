import type { DistributionStats } from './types.ts';

export function computeDistributionStats(rawValues: number[]): DistributionStats {
  const values = rawValues
    .filter((v) => typeof v === 'number' && !isNaN(v) && isFinite(v))
    .sort((a, b) => a - b);

  const count = values.length;
  if (count === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p25: 0,
      p75: 0,
      p90: 0,
      total: 0,
      count: 0,
    };
  }

  const total = values.reduce((acc, v) => acc + v, 0);
  const mean = total / count;

  const quantile = (q: number): number => {
    const pos = (count - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (values[base + 1] !== undefined) {
      return values[base] + rest * (values[base + 1] - values[base]);
    }
    return values[base];
  };

  return {
    min: values[0],
    max: values[count - 1],
    mean: Math.round(mean * 100) / 100,
    median: Math.round(quantile(0.5) * 100) / 100,
    p25: Math.round(quantile(0.25) * 100) / 100,
    p75: Math.round(quantile(0.75) * 100) / 100,
    p90: Math.round(quantile(0.9) * 100) / 100,
    total: Math.round(total * 100) / 100,
    count,
  };
}
