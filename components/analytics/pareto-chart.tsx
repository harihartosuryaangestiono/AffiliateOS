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
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';

interface Props {
  pareto: ParetoAnalysis;
  title: string;
  subtitle: string;
}

export function ParetoChart({ pareto, title, subtitle }: Props) {
  const [sliceCount, setSliceCount] = useState<number>(10);
  const prefersReducedMotion = usePrefersReducedMotion();

  const displayedItems =
    sliceCount === -1 ? pareto.items : pareto.items.slice(0, sliceCount);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">{title}</h3>
            <p className="text-xs text-[#64748B]">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-medium">Rank depth:</span>
          <select
            value={sliceCount}
            onChange={(e) => setSliceCount(Number(e.target.value))}
            className="h-8 px-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] hover:border-[#94A3B8] transition-colors focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden cursor-pointer"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={-1}>All ({pareto.totalEntitiesCount})</option>
          </select>
        </div>
      </div>

      {/* 80/20 Insight Callout Banner */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-[#EFF6FF] to-[#F8FAFC] border border-[#BFDBFE] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#1E40AF]">
          <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider">
            80/20 Pareto
          </span>
          <span className="font-semibold text-xs text-[#0F172A]">{pareto.summaryText}</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-white text-[#2563EB] font-bold text-xs shadow-2xs border border-blue-200">
          Total Analyzed: {money(pareto.totalValue)}
        </span>
      </div>

      {/* Composed Chart */}
      <div className="h-64 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayedItems}
            margin={{ top: 10, right: 20, left: 5, bottom: 25 }}
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
                    <div className="font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-1 truncate">
                      {d.name}
                    </div>
                    <div className="flex items-center justify-between text-[#2563EB] font-bold">
                      <span>Attributed Volume:</span>
                      <span>{money(d.value)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>Share of Total:</span>
                      <span className="font-semibold text-[#0F172A]">{d.contributionPct}%</span>
                    </div>
                    <div className="flex items-center justify-between text-indigo-600 font-medium pt-1 border-t border-[#F8FAFC]">
                      <span>Cumulative Total:</span>
                      <span className="font-bold">{d.cumulativePct}%</span>
                    </div>
                  </div>
                );
              }}
            />

            <ReferenceLine
              yAxisId="right"
              y={80}
              stroke="#F43F5E"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '80% Revenue Cutoff',
                position: 'top',
                fill: '#F43F5E',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            <Bar
              yAxisId="left"
              dataKey="value"
              name="Volume (GMV)"
              fill="#3B82F6"
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={400}
              animationEasing="ease-out"
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePct"
              name="Cumulative %"
              stroke="#6366F1"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#6366F1', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#6366F1', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive={!prefersReducedMotion}
              animationBegin={200}
              animationDuration={500}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
