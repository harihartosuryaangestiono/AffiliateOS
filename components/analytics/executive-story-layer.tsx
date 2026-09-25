'use client';

import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Package,
  Users,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import type { MarketplaceAnalyticsResult } from '@/lib/analytics/engine';
import { money } from '@/lib/data/metrics';

interface Props {
  analytics: MarketplaceAnalyticsResult;
}

export function ExecutiveStoryLayer({ analytics }: Props) {
  const gmv = analytics.kpiSummary.gmv;
  const isPositive = gmv.percentageDelta !== null && gmv.percentageDelta >= 0;
  const hasComp = gmv.comparison !== null;

  const topProduct = analytics.whatChanged.largestProductDriver;
  const topCreator = analytics.whatChanged.largestCreatorDriver;
  const decline = analytics.whatChanged.largestDecline;
  const concentration = analytics.creatorAnalytics.concentrationRisk;
  const criticalStockCount = analytics.stockCorrelation.filter(
    (s) => s.stockStatus === 'Critical' || s.stockStatus === 'OOS' || s.riskType === 'HIGH_GMV_CRITICAL_STOCK'
  ).length;

  // Determine intelligent recommended next step based on deterministic data
  let nextActionText = 'Audit campaign ROI and creator performance roster';
  let nextActionLink = `/campaigns`;
  let nextActionLabel = 'View Campaigns';

  if (criticalStockCount > 0) {
    nextActionText = `Resolve ${criticalStockCount} critical SKU stock exposure alerts before next promotion`;
    nextActionLink = `/stock`;
    nextActionLabel = 'Audit Stock';
  } else if (decline && Math.abs(decline.delta) > 500000) {
    nextActionText = `Re-engage top declining creator ${decline.name} with tailored promotion`;
    nextActionLink = `/communication`;
    nextActionLabel = 'Open Outreach';
  } else if (concentration.riskLevel === 'HIGH') {
    nextActionText = `Diversify affiliate roster to reduce ${concentration.top1Share}% top-creator concentration`;
    nextActionLink = `/creators`;
    nextActionLabel = 'Acquire Creators';
  }

  return (
    <div className="bg-gradient-to-r from-white via-[#F8FAFC] to-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
      {/* Narrative Section Header */}
      <div className="px-5 py-3.5 border-b border-[#F1F5F9] bg-[#F8FAFC]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <Compass size={14} />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            Executive Intelligence: Performance → Drivers → Risk → Action
          </h3>
        </div>

        <span className="text-[11px] text-[#64748B] font-medium">
          {analytics.currentPeriod.label} vs {analytics.comparisonPeriod?.label || 'Baseline'}
        </span>
      </div>

      {/* 4-Stage Connected Workflow Strip */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {/* STAGE 1: WHAT CHANGED */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              1. What Changed
            </span>
            <span
              className={`p-1 rounded-md ${
                isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            </span>
          </div>

          <div>
            <div className="text-base font-extrabold text-[#0F172A]">
              {hasComp && gmv.percentageDelta !== null ? (
                <span>
                  {isPositive ? '+' : ''}
                  {gmv.percentageDelta}% GMV Shift
                </span>
              ) : (
                <span>{money(gmv.current)} Total GMV</span>
              )}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {hasComp && gmv.absoluteDelta !== null ? (
                <span>
                  Net movement of{' '}
                  <strong className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                    {gmv.absoluteDelta > 0 ? '+' : ''}
                    {money(gmv.absoluteDelta)}
                  </strong>
                </span>
              ) : (
                <span>Recorded across {analytics.currentPeriod.dayCount} days</span>
              )}
            </p>
          </div>

          <div className="text-[11px] text-[#94A3B8] font-medium pt-2 border-t border-[#F8FAFC]">
            {analytics.kpiSummary.orders.current} orders · {analytics.kpiSummary.affiliatesWithSales.current} selling affiliates
          </div>
        </div>

        {/* STAGE 2: WHY (DRIVERS) */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              2. Key Drivers
            </span>
            <span className="p-1 rounded-md bg-blue-50 text-[#2563EB]">
              <Sparkles size={13} />
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {topProduct ? (
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-[#64748B] truncate flex items-center gap-1">
                  <Package size={12} className="text-[#94A3B8] shrink-0" />
                  <strong className="text-[#0F172A] truncate" title={topProduct.name}>
                    {topProduct.name}
                  </strong>
                </span>
                <span className="font-bold text-emerald-600 shrink-0">
                  +{money(topProduct.delta)}
                </span>
              </div>
            ) : (
              <span className="text-[#94A3B8]">No primary product driver</span>
            )}

            {topCreator ? (
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-[#64748B] truncate flex items-center gap-1">
                  <Users size={12} className="text-[#94A3B8] shrink-0" />
                  <strong className="text-[#0F172A] truncate" title={topCreator.name}>
                    {topCreator.name}
                  </strong>
                </span>
                <span className="font-bold text-emerald-600 shrink-0">
                  +{money(topCreator.delta)}
                </span>
              </div>
            ) : (
              <span className="text-[#94A3B8]">No primary creator driver</span>
            )}
          </div>

          <div className="text-[11px] text-[#94A3B8] font-medium pt-2 border-t border-[#F8FAFC]">
            Identified via deterministic attribution
          </div>
        </div>

        {/* STAGE 3: RISK */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              3. Operational Risk
            </span>
            <span
              className={`p-1 rounded-md ${
                concentration.riskLevel === 'HIGH' || criticalStockCount > 0
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <AlertTriangle size={13} />
            </span>
          </div>

          <div className="space-y-1 text-xs">
            {decline ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#64748B] truncate">Largest decline:</span>
                <span className="font-bold text-rose-600 truncate">{money(decline.delta)}</span>
              </div>
            ) : (
              <div className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} /> No significant declines
              </div>
            )}

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#64748B]">Top 1 creator share:</span>
              <span className="font-bold text-[#0F172A]">{concentration.top1Share}%</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#64748B]">Stock risk SKUs:</span>
              <span
                className={`font-bold ${
                  criticalStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {criticalStockCount} critical
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#94A3B8] font-medium pt-2 border-t border-[#F8FAFC]">
            Telemetry from live inventory &amp; creator logs
          </div>
        </div>

        {/* STAGE 4: ACTION */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-200/80 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
              4. Next Action
            </span>
            <span className="p-1 rounded-md bg-blue-600 text-white shadow-2xs">
              <ArrowRight size={13} />
            </span>
          </div>

          <div>
            <div className="text-xs font-bold text-[#0F172A] leading-snug">
              {nextActionText}
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">
              Deterministic priority recommendation
            </p>
          </div>

          <div className="pt-2 border-t border-blue-200/60">
            <Link
              href={nextActionLink}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
            >
              <span>{nextActionLabel}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
