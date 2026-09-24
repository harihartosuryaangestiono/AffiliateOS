'use client';
import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  Percent,
  Video,
  Radio,
  MousePointerClick,
  Award,
} from 'lucide-react';
import type { MetricDelta } from '@/lib/analytics/types';
import { METRIC_DEFINITIONS } from '@/lib/analytics/metrics';
import { money, number } from '@/lib/data/metrics';

interface Props {
  kpis: {
    gmv: MetricDelta;
    orders: MetricDelta;
    units: MetricDelta;
    affiliatesWithSales: MetricDelta;
    activeAffiliates: MetricDelta;
    commission: MetricDelta;
    asp: MetricDelta;
    aov: MetricDelta;
    roi: MetricDelta;
    costRatio: MetricDelta;
    clicks?: MetricDelta;
    conversionRate?: MetricDelta;
    videoCount?: MetricDelta;
    liveCount?: MetricDelta;
  };
  marketplace: 'Shopee' | 'TikTok';
}

export function KPIComparisonStrip({ kpis, marketplace }: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const cards = [
    {
      key: 'gmv',
      delta: kpis.gmv,
      icon: DollarSign,
      format: (v: number) => money(v),
      color: 'text-[#2563EB] bg-blue-50',
    },
    {
      key: 'orders',
      delta: kpis.orders,
      icon: ShoppingBag,
      format: (v: number) => number(v),
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      key: 'units',
      delta: kpis.units,
      icon: Package,
      format: (v: number) => `${number(v)} units`,
      color: 'text-cyan-600 bg-cyan-50',
    },
    {
      key: 'affiliatesWithSales',
      delta: kpis.affiliatesWithSales,
      icon: Users,
      format: (v: number) => `${v} creators`,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      key: 'commission',
      delta: kpis.commission,
      icon: Award,
      format: (v: number) => money(v),
      color: 'text-amber-600 bg-amber-50',
    },
    {
      key: 'asp',
      delta: kpis.asp,
      icon: Percent,
      format: (v: number) => money(v),
      color: 'text-violet-600 bg-violet-50',
    },
    {
      key: 'aov',
      delta: kpis.aov,
      icon: ShoppingBag,
      format: (v: number) => money(v),
      color: 'text-teal-600 bg-teal-50',
    },
    {
      key: 'costRatio',
      delta: kpis.costRatio,
      icon: Percent,
      format: (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)}%`,
      color: 'text-slate-600 bg-slate-100',
    },
    ...(marketplace === 'Shopee' && kpis.clicks
      ? [
          {
            key: 'clicks',
            delta: kpis.clicks,
            icon: MousePointerClick,
            format: (v: number) => number(v),
            color: 'text-orange-600 bg-orange-50',
          },
          ...(kpis.conversionRate
            ? [
                {
                  key: 'conversionRate',
                  delta: kpis.conversionRate,
                  icon: Percent,
                  format: (v: number) => `${(Math.round(v * 100) / 100).toFixed(2)}%`,
                  color: 'text-emerald-600 bg-emerald-50',
                },
              ]
            : []),
        ]
      : []),
    ...(marketplace === 'TikTok' && kpis.videoCount
      ? [
          {
            key: 'videoCount',
            delta: kpis.videoCount,
            icon: Video,
            format: (v: number) => `${number(v)} videos`,
            color: 'text-pink-600 bg-pink-50',
          },
          ...(kpis.liveCount
            ? [
                {
                  key: 'liveCount',
                  delta: kpis.liveCount,
                  icon: Radio,
                  format: (v: number) => `${number(v)} sessions`,
                  color: 'text-red-600 bg-red-50',
                },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const def = METRIC_DEFINITIONS[c.key];
          const hasComparison = c.delta.comparison !== null;
          const isFavorable = c.delta.isFavorable;

          let badgeBg = 'bg-slate-100 text-slate-600 border-slate-200';
          if (hasComparison && isFavorable !== null) {
            if (isFavorable) {
              badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            } else {
              badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
            }
          }

          return (
            <div
              key={c.key}
              className="relative bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between"
            >
              {/* Header: Icon, Label, Tooltip Trigger */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}
                  >
                    <c.icon size={15} />
                  </span>
                  <span className="text-xs font-bold text-[#64748B] truncate">
                    {def?.label || c.key}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTooltip(activeTooltip === c.key ? null : c.key)
                  }
                  className="text-[#94A3B8] hover:text-[#2563EB] p-1 rounded-md transition-colors"
                  aria-label={`Definition for ${def?.label || c.key}`}
                >
                  <Info size={13} />
                </button>
              </div>

              {/* Metric Value & Delta Badge */}
              <div className="pt-3 pb-1 flex items-baseline justify-between gap-2">
                <div className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                  {c.format(c.delta.current)}
                </div>

                {hasComparison && c.delta.percentageDelta !== null ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeBg}`}
                  >
                    {c.delta.direction === 'UP' && <TrendingUp size={12} />}
                    {c.delta.direction === 'DOWN' && <TrendingDown size={12} />}
                    {c.delta.direction === 'FLAT' && <Minus size={12} />}
                    <span>
                      {c.delta.percentageDelta > 0 ? '+' : ''}
                      {c.delta.percentageDelta}%
                    </span>
                  </span>
                ) : (
                  <span className="text-[10px] text-[#94A3B8] font-medium">
                    No comparison
                  </span>
                )}
              </div>

              {/* Subtext: Comparison absolute value and delta */}
              <div className="pt-1 text-[11px] text-[#64748B] flex items-center justify-between">
                {hasComparison ? (
                  <>
                    <span>vs {c.format(c.delta.comparison!)}</span>
                    <span className="font-semibold text-[#0F172A]">
                      {c.delta.absoluteDelta! > 0 ? '+' : ''}
                      {c.format(c.delta.absoluteDelta!)}
                    </span>
                  </>
                ) : (
                  <span className="text-[#94A3B8]">Baseline period</span>
                )}
              </div>

              {/* Definition Tooltip Drawer / Popover */}
              {activeTooltip === c.key && def && (
                <div className="absolute top-12 left-4 right-4 z-20 bg-white border border-[#CBD5E1] rounded-xl p-3 shadow-lg text-xs space-y-2 text-[#0F172A]">
                  <div className="font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-1">
                    {def.label}
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    {def.description}
                  </p>
                  <div className="text-[10px] space-y-1 bg-[#F8FAFC] p-2 rounded-lg text-[#64748B]">
                    <div>
                      <span className="font-semibold text-[#0F172A]">Formula:</span>{' '}
                      {def.formula}
                    </div>
                    <div>
                      <span className="font-semibold text-[#0F172A]">Source:</span>{' '}
                      {def.source}
                    </div>
                    <div>
                      <span className="font-semibold text-[#0F172A]">Status:</span>{' '}
                      <span className="font-bold text-[#2563EB]">
                        {def.availability}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(null)}
                    className="w-full text-center py-1 text-[11px] font-semibold text-[#2563EB] hover:underline"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
