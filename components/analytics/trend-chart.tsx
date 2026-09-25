'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { TimeSeriesDualPoint } from '@/lib/analytics/types';
import type { TimeSeriesMetric } from '@/lib/analytics/timeseries';
import { money, number } from '@/lib/data/metrics';
import { TrendingUp, Info, Calendar } from 'lucide-react';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';

interface Props {
  timeSeries: TimeSeriesDualPoint[];
  hasComparison: boolean;
  currentLabel: string;
  comparisonLabel?: string;
  onMetricChange?: (metric: TimeSeriesMetric) => void;
}

export function TrendChart({
  timeSeries,
  hasComparison,
  currentLabel,
  comparisonLabel = 'Comparison',
}: Props) {
  const [metric, setMetric] = useState<TimeSeriesMetric>('gmv');
  const [isCumulative, setIsCumulative] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const formatValue = (v: number) => {
    if (metric === 'gmv' || metric === 'commission' || metric === 'asp') {
      return money(v, false);
    }
    return number(v);
  };

  const chartData = useMemo(() => {
    return timeSeries.map((pt) => {
      return {
        index: pt.index,
        currentDate: pt.currentDate,
        comparisonDate: pt.comparisonDate,
        currentVal: isCumulative ? pt.cumulativeCurrent : pt.currentValue,
        comparisonVal:
          hasComparison && pt.comparisonValue !== undefined
            ? isCumulative
              ? pt.cumulativeComparison
              : pt.comparisonValue
            : undefined,
        rawDelta: pt.absoluteDelta,
        rawPctDelta: pt.percentageDelta,
      };
    });
  }, [timeSeries, isCumulative, hasComparison]);

  // Evaluate data density
  const nonZeroPoints = chartData.filter((d) => d.currentVal > 0);
  const isSparse = nonZeroPoints.length <= 2 && chartData.length > 2;

  const metricOptions: { key: TimeSeriesMetric; label: string }[] = [
    { key: 'gmv', label: 'Affiliate GMV' },
    { key: 'orders', label: 'Orders' },
    { key: 'units_sold', label: 'Units Sold' },
    { key: 'commission', label: 'Commission' },
    { key: 'asp', label: 'ASP' },
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header: Title, Metric Switcher, Cumulative Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
            <TrendingUp size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#0F172A]">
                Performance Trajectory
              </h3>
              {isSparse && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                  Sparse Window
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              Normalized dual-period progression across selected time horizon
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Daily vs Cumulative Toggle */}
          <div className="flex items-center p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsCumulative(false)}
              className={`px-3 py-1 rounded-lg transition-all active:scale-95 cursor-pointer ${
                !isCumulative
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setIsCumulative(true)}
              className={`px-3 py-1 rounded-lg transition-all active:scale-95 cursor-pointer ${
                isCumulative
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Cumulative
            </button>
          </div>

          {/* Metric Selector Dropdown / Pills */}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as TimeSeriesMetric)}
            className="h-8 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] hover:border-[#94A3B8] transition-colors focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden cursor-pointer"
          >
            {metricOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sparse data information callout if needed */}
      {isSparse && (
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] flex items-center gap-2">
          <Info size={14} className="text-[#2563EB] shrink-0" />
          <span>
            Only {nonZeroPoints.length} day(s) have recorded transactions in this timeframe. Full curves and moving averages will populate as additional daily verified files are imported.
          </span>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 15, right: 15, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="currentAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="compAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.16} />
                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#F1F5F9"
            />

            <XAxis
              dataKey="currentDate"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickFormatter={(d) => (typeof d === 'string' ? d.slice(5) : d)}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickFormatter={(v) => formatValue(Number(v))}
              width={80}
            />

            <Tooltip
              cursor={{ stroke: '#2563EB', strokeWidth: 1.5, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                const delta =
                  d.comparisonVal !== undefined ? d.currentVal - d.comparisonVal : null;
                const pctDelta =
                  d.comparisonVal !== undefined && d.comparisonVal > 0
                    ? ((delta! / d.comparisonVal) * 100).toFixed(1)
                    : null;

                return (
                  <div className="bg-white border border-[#CBD5E1] rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-[220px]">
                    <div className="font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-[#2563EB]" />
                        {d.currentDate}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-semibold">
                        Day {d.index}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#2563EB] font-bold">
                      <span>{currentLabel}:</span>
                      <span className="text-sm font-extrabold">{formatValue(d.currentVal)}</span>
                    </div>

                    {hasComparison && d.comparisonVal !== undefined && (
                      <>
                        <div className="flex items-center justify-between text-[#64748B]">
                          <span>{comparisonLabel} ({d.comparisonDate}):</span>
                          <span className="font-medium text-[#0F172A]">{formatValue(d.comparisonVal)}</span>
                        </div>

                        <div className="pt-1.5 border-t border-[#F1F5F9] flex items-center justify-between font-bold">
                          <span className="text-[#475569]">Variance:</span>
                          <span
                            className={
                              delta! >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }
                          >
                            {delta! > 0 ? '+' : ''}
                            {formatValue(delta!)}
                            {pctDelta !== null && ` (${delta! > 0 ? '+' : ''}${pctDelta}%)`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
            />

            {hasComparison && (
              <Area
                type="monotone"
                dataKey="comparisonVal"
                name={comparisonLabel}
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="url(#compAreaGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#94A3B8', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                isAnimationActive={!prefersReducedMotion}
              />
            )}

            <Area
              type="monotone"
              dataKey="currentVal"
              name={currentLabel}
              stroke="#2563EB"
              strokeWidth={2.5}
              fill="url(#currentAreaGrad)"
              dot={{ r: 3, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2.5 }}
              isAnimationActive={!prefersReducedMotion}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
