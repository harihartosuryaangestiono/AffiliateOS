'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
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
import { motion, AnimatePresence } from 'motion/react';
import type { MetricDelta } from '@/lib/analytics/types';
import { METRIC_DEFINITIONS } from '@/lib/analytics/metrics';
import { money, number } from '@/lib/data/metrics';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';

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
  const prefersReducedMotion = usePrefersReducedMotion();

  const isShopee = marketplace === 'Shopee';

  // Hero Metric: GMV
  const gmvDelta = kpis.gmv;
  const gmvHasComp = gmvDelta.comparison !== null;
  const gmvIsPositive = gmvDelta.percentageDelta !== null && gmvDelta.percentageDelta >= 0;

  // Secondary Group 1: Volume & Network Reach
  const volumeMetrics = [
    {
      key: 'orders',
      delta: kpis.orders,
      icon: ShoppingBag,
      label: 'Total Orders',
      format: (v: number) => number(v),
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      key: 'units',
      delta: kpis.units,
      icon: Package,
      label: 'Units Sold',
      format: (v: number) => `${number(v)} units`,
      color: 'text-cyan-600 bg-cyan-50',
    },
    {
      key: 'affiliatesWithSales',
      delta: kpis.affiliatesWithSales,
      icon: Users,
      label: isShopee ? 'Selling Affiliates' : 'Selling Creators',
      format: (v: number) => `${number(v)} creators`,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      key: 'commission',
      delta: kpis.commission,
      icon: Award,
      label: 'Affiliate Commission',
      format: (v: number) => money(v),
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  // Secondary Group 2: Unit Economics & Marketplace Specific
  const economicsMetrics = [
    {
      key: 'asp',
      delta: kpis.asp,
      icon: Percent,
      label: 'ASP (Avg Price)',
      format: (v: number) => money(v),
    },
    {
      key: 'aov',
      delta: kpis.aov,
      icon: ShoppingBag,
      label: 'AOV (Avg Order)',
      format: (v: number) => money(v),
    },
    {
      key: 'costRatio',
      delta: kpis.costRatio,
      icon: Percent,
      label: 'Commission Rate',
      format: (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)}%`,
    },
    ...(isShopee && kpis.clicks
      ? [
          {
            key: 'clicks',
            delta: kpis.clicks,
            icon: MousePointerClick,
            label: 'Affiliate Clicks',
            format: (v: number) => number(v),
          },
          ...(kpis.conversionRate
            ? [
                {
                  key: 'conversionRate',
                  delta: kpis.conversionRate,
                  icon: Percent,
                  label: 'Conversion Rate',
                  format: (v: number) => `${(Math.round(v * 100) / 100).toFixed(2)}%`,
                },
              ]
            : []),
        ]
      : []),
    ...(!isShopee && kpis.videoCount
      ? [
          {
            key: 'videoCount',
            delta: kpis.videoCount,
            icon: Video,
            label: 'Affiliate Videos',
            format: (v: number) => `${number(v)} vids`,
          },
          ...(kpis.liveCount
            ? [
                {
                  key: 'liveCount',
                  delta: kpis.liveCount,
                  icon: Radio,
                  label: 'Live Sessions',
                  format: (v: number) => `${number(v)} live`,
                },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* ASYMMETRIC EXECUTIVE SNAPSHOT COMPOSITION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* DOMINANT HERO METRIC: AFFILIATE GMV (Spans 5 cols on lg) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-white via-white to-blue-50/40 rounded-2xl border border-[#BFDBFE] p-6 shadow-sm ring-1 ring-blue-500/10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <DollarSign size={18} />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Primary North Star
                </span>
                <h3 className="text-sm font-extrabold text-[#0F172A]">
                  Affiliate GMV
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTooltip(activeTooltip === 'gmv' ? null : 'gmv')}
              className="text-[#94A3B8] hover:text-[#2563EB] p-1 rounded-md transition-colors"
              aria-label="Definition for Affiliate GMV"
            >
              <Info size={14} />
            </button>
          </div>

          {/* Hero Value & Delta */}
          <div className="my-5 relative z-10">
            <div className="flex flex-wrap items-baseline gap-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`hero-gmv-${gmvDelta.current}`}
                  initial={prefersReducedMotion ? { opacity: 0 } : { y: 8, opacity: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { y: -8, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight"
                >
                  {money(gmvDelta.current)}
                </motion.div>
              </AnimatePresence>

              {gmvHasComp && gmvDelta.percentageDelta !== null ? (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    gmvIsPositive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {gmvIsPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  <span>
                    {gmvDelta.percentageDelta > 0 ? '+' : ''}
                    {gmvDelta.percentageDelta}%
                  </span>
                </span>
              ) : (
                <span className="text-xs text-[#94A3B8] font-medium bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                  Baseline period
                </span>
              )}
            </div>

            {/* Absolute Delta Callout */}
            <div className="mt-2 text-xs text-[#64748B] flex items-center gap-2">
              {gmvHasComp ? (
                <>
                  <span>vs comparison period:</span>
                  <span className="font-bold text-[#0F172A]">
                    {money(gmvDelta.comparison!)}
                  </span>
                  <span
                    className={`font-semibold ${
                      gmvDelta.absoluteDelta! >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    ({gmvDelta.absoluteDelta! > 0 ? '+' : ''}
                    {money(gmvDelta.absoluteDelta!)})
                  </span>
                </>
              ) : (
                <span>No comparison window active</span>
              )}
            </div>
          </div>

          {/* Mini Progress / Context Strip */}
          <div className="pt-3 border-t border-blue-100/80 flex items-center justify-between text-[11px] text-[#64748B] relative z-10">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified {marketplace} Net Paid Volume
            </span>
            <span className="font-medium text-[#2563EB]">100% Deterministic</span>
          </div>

          {/* Tooltip drawer for GMV */}
          {activeTooltip === 'gmv' && METRIC_DEFINITIONS['gmv'] && (
            <div className="absolute inset-4 z-20 bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-xl text-xs space-y-2 text-[#0F172A]">
              <div className="font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-1 flex justify-between">
                <span>{METRIC_DEFINITIONS['gmv'].label}</span>
                <button
                  type="button"
                  onClick={() => setActiveTooltip(null)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-[#475569] leading-relaxed">
                {METRIC_DEFINITIONS['gmv'].description}
              </p>
              <div className="text-[10px] space-y-1 bg-[#F8FAFC] p-2 rounded-lg text-[#64748B]">
                <div>
                  <strong>Formula:</strong> {METRIC_DEFINITIONS['gmv'].formula}
                </div>
                <div>
                  <strong>Source:</strong> {METRIC_DEFINITIONS['gmv'].source}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECONDARY CLUSTER: VOLUME & REACH (Spans 7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Core Volume &amp; Network Reach
            </span>
            <span className="text-[11px] text-[#94A3B8] font-medium">
              Orders · Units · Selling Creators · Commission
            </span>
          </div>

          {/* 4 Supporting Metrics with Tonal Separation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3">
            {volumeMetrics.map((m) => {
              const hasComp = m.delta.comparison !== null;
              const isFav = m.delta.isFavorable;
              return (
                <div key={m.key} className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
                      <m.icon size={11} />
                    </span>
                    <span className="text-[11px] font-semibold text-[#64748B] truncate">
                      {m.label}
                    </span>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`vol-${m.key}-${m.delta.current}`}
                      initial={prefersReducedMotion ? { opacity: 0 } : { y: 6, opacity: 0 }}
                      animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { y: -6, opacity: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="text-lg sm:text-xl font-black text-[#0F172A] tracking-tight truncate"
                    >
                      {m.format(m.delta.current)}
                    </motion.div>
                  </AnimatePresence>

                  <div className="text-[10px] font-medium">
                    {hasComp && m.delta.percentageDelta !== null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isFav === true
                            ? 'text-emerald-600 font-bold'
                            : isFav === false
                              ? 'text-rose-600 font-bold'
                              : 'text-[#64748B]'
                        }`}
                      >
                        {m.delta.percentageDelta > 0 ? '+' : ''}
                        {m.delta.percentageDelta}%
                      </span>
                    ) : (
                      <span className="text-[#94A3B8]">Baseline</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tertiary Row: Unit Economics & Channel Telemetry */}
          <div className="pt-3 border-t border-[#F1F5F9] bg-[#F8FAFC]/70 -mx-5 -mb-5 p-4 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            {economicsMetrics.map((em) => {
              const hasComp = em.delta.comparison !== null;
              return (
                <div key={em.key} className="flex items-center gap-2 min-w-[120px]">
                  <span className="text-[11px] text-[#64748B] font-medium">{em.label}:</span>
                  <span className="font-bold text-[#0F172A]">{em.format(em.delta.current)}</span>
                  {hasComp && em.delta.percentageDelta !== null && (
                    <span
                      className={`text-[10px] font-semibold ${
                        em.delta.isFavorable === true
                          ? 'text-emerald-600'
                          : em.delta.isFavorable === false
                            ? 'text-rose-600'
                            : 'text-[#64748B]'
                      }`}
                    >
                      {em.delta.percentageDelta > 0 ? '+' : ''}
                      {em.delta.percentageDelta}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
