'use client';
import { useState } from 'react';
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
import { TrendingUp } from 'lucide-react';

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

  const formatValue = (v: number) => {
    if (metric === 'gmv' || metric === 'commission' || metric === 'asp') {
      return money(v, false);
    }
    return number(v);
  };

  const chartData = timeSeries.map((pt) => {
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

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
      {/* Header: Title, Metric Picker, Cumulative Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <TrendingUp size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Performance Trend
            </h3>
            <p className="text-xs text-[#64748B]">
              Normalized dual-period progression and trajectory
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cumulative Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsCumulative(false)}
              className={`px-3 py-1 rounded-lg transition-all ${
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
              className={`px-3 py-1 rounded-lg transition-all ${
                isCumulative
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Cumulative
            </button>
          </div>

          {/* Metric Selector */}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as TimeSeriesMetric)}
            className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] hover:border-[#94A3B8] transition-colors focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden"
          >
            <option value="gmv">Affiliate GMV</option>
            <option value="orders">Orders</option>
            <option value="units_sold">Units Sold</option>
            <option value="commission">Commission</option>
            <option value="asp">ASP (Avg Selling Price)</option>
          </select>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="currentAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="compAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2} />
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
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-[#CBD5E1] rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[200px]">
                    <div className="font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-1">
                      Day {d.index}: {d.currentDate}
                    </div>

                    <div className="flex items-center justify-between text-[#2563EB] font-semibold">
                      <span>Current:</span>
                      <span>{formatValue(d.currentVal)}</span>
                    </div>

                    {hasComparison && d.comparisonVal !== undefined && (
                      <>
                        <div className="flex items-center justify-between text-[#64748B]">
                          <span>Compare ({d.comparisonDate}):</span>
                          <span>{formatValue(d.comparisonVal)}</span>
                        </div>

                        <div className="pt-1 border-t border-[#F1F5F9] flex items-center justify-between font-bold text-xs">
                          <span>Delta:</span>
                          <span
                            className={
                              d.currentVal >= d.comparisonVal
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }
                          >
                            {d.currentVal >= d.comparisonVal ? '+' : ''}
                            {formatValue(d.currentVal - d.comparisonVal)}
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
              wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
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
                activeDot={{ r: 4, fill: '#94A3B8' }}
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
              activeDot={{ r: 5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
