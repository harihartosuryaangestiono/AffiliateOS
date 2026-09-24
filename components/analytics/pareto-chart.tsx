'use client';
import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { ParetoAnalysis } from '@/lib/analytics/types';
import { money } from '@/lib/data/metrics';
import { Layers } from 'lucide-react';

interface Props {
  pareto: ParetoAnalysis;
  title: string;
  subtitle: string;
}

export function ParetoChart({ pareto, title, subtitle }: Props) {
  const [sliceCount, setSliceCount] = useState<number>(10);

  const displayedItems =
    sliceCount === -1 ? pareto.items : pareto.items.slice(0, sliceCount);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">{title}</h3>
            <p className="text-xs text-[#64748B]">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-medium">Show:</span>
          <select
            value={sliceCount}
            onChange={(e) => setSliceCount(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={-1}>All ({pareto.totalEntitiesCount})</option>
          </select>
        </div>
      </div>

      {/* 80/20 Insight Callout Banner */}
      <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#1E40AF]">
          <span className="font-extrabold text-sm text-[#2563EB]">80/20 Rule:</span>
          <span className="font-semibold">{pareto.summaryText}</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-white text-[#2563EB] font-bold text-[11px] shadow-2xs border border-blue-200">
          Total: {money(pareto.totalValue)}
        </span>
      </div>

      {/* Composed Chart */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayedItems}
            margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={({ x, y, payload }) => {
                const text = String(payload.value || '');
                const truncated = text.length > 12 ? text.slice(0, 10) + '…' : text;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={12}
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize={10}
                      fontWeight={500}
                    >
                      {truncated}
                    </text>
                  </g>
                );
              }}
            />

            {/* Left Axis: GMV */}
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickFormatter={(v) => money(Number(v), false)}
              width={75}
            />

            {/* Right Axis: Cumulative % */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              width={45}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-[#CBD5E1] rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[200px]">
                    <div className="font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-1">
                      {d.name}
                    </div>
                    <div className="flex items-center justify-between text-[#2563EB] font-semibold">
                      <span>GMV:</span>
                      <span>{money(d.value)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>Contribution to Total:</span>
                      <span className="font-medium text-[#0F172A]">{d.contributionPct}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[#6366F1]">
                      <span>Cumulative Contribution:</span>
                      <span className="font-bold">{d.cumulativePct}%</span>
                    </div>
                  </div>
                );
              }}
            />

            {/* 80% Benchmark Reference Line */}
            <ReferenceLine
              yAxisId="right"
              y={80}
              stroke="#E11D48"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '80% GMV Target',
                position: 'top',
                fill: '#E11D48',
                fontSize: 10,
                fontWeight: 700,
              }}
            />

            {/* Bar: GMV */}
            <Bar
              yAxisId="left"
              dataKey="value"
              name="GMV"
              fill="#3B82F6"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />

            {/* Line: Cumulative % */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePct"
              name="Cumulative %"
              stroke="#6366F1"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#6366F1', stroke: '#FFFFFF', strokeWidth: 1.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
