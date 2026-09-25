'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Music2, 
  Upload, 
  Download, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Sparkles,
  Layers,
  Users,
  Package,
  Target,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { computeMarketplaceAnalytics } from '@/lib/analytics/engine';
import type { 
  AnalyticsPeriod, 
  AnalyticsComparison, 
  PeriodMode, 
  ComparisonMode, 
  CalendarGranularity 
} from '@/lib/analytics/types';
import { 
  resolveAnalyticsPeriod, 
  resolveCalendarPeriod, 
  formatDateHuman 
} from '@/lib/analytics/periods';
import { resolveComparisonPeriod } from '@/lib/analytics/comparison';
import { AnalyticsPeriodSelector } from './period-selector';
import { KPIComparisonStrip } from './kpi-comparison-strip';
import { ExecutiveStoryLayer } from './executive-story-layer';
import { TrendChart } from './trend-chart';
import { ParetoChart } from './pareto-chart';
import { CreatorLeaderboards } from './creator-leaderboards';
import { ProductAnalyticsTable } from './product-analytics-table';
import { ContributionBreakdown } from './contribution-breakdown';
import { BrandCampaignSection } from './brand-campaign-section';
import { StockCorrelationSection } from './stock-correlation-section';
import { AIInsightsCard } from './ai-insights-card';

interface MarketplaceAnalyticsProps {
  market: 'Shopee' | 'TikTok';
}

export function MarketplaceAnalytics({ market }: MarketplaceAnalyticsProps) {
  const { data } = useWorkspace();

  // Active view section tab
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Period state: default to LAST_30_DAYS
  const [period, setPeriod] = useState<AnalyticsPeriod>(() =>
    resolveAnalyticsPeriod('LAST_30_DAYS', { now: new Date('2026-09-24T12:00:00+07:00') })
  );

  // Comparison state: default to PREVIOUS_PERIOD
  const [comparison, setComparison] = useState<AnalyticsComparison>(() =>
    resolveComparisonPeriod(
      resolveAnalyticsPeriod('LAST_30_DAYS', { now: new Date('2026-09-24T12:00:00+07:00') }),
      'PREVIOUS_PERIOD'
    )
  );

  // Compute master deterministic analytics
  const analytics = useMemo(() => {
    return computeMarketplaceAnalytics({
      data,
      marketplace: market,
      period,
      comparison,
    });
  }, [data, market, period, comparison]);

  // Handle period change from selector
  const handlePeriodChange = (mode: PeriodMode, customStart?: string, customEnd?: string) => {
    const nextPeriod = resolveAnalyticsPeriod(mode, {
      now: new Date('2026-09-24T12:00:00+07:00'),
      customStart,
      customEnd,
    });
    setPeriod(nextPeriod);
    if (comparison) {
      setComparison(resolveComparisonPeriod(nextPeriod, comparison.mode));
    }
  };

  // Handle comparison change from selector
  const handleComparisonChange = (mode: ComparisonMode, customStart?: string, customEnd?: string) => {
    setComparison(
      resolveComparisonPeriod(period, mode, {
        customStart,
        customEnd,
      })
    );
  };

  // Handle calendar change (Day/Week/Month)
  const handleCalendarChange = (granularity: CalendarGranularity, dateStr: string) => {
    const nextPeriod = resolveCalendarPeriod(granularity, dateStr);
    setPeriod(nextPeriod);
    if (comparison) {
      setComparison(resolveComparisonPeriod(nextPeriod, comparison.mode));
    }
  };

  // Handle CSV export of visible analysis
  const handleExportCSV = () => {
    const csvRows: string[] = [];
    csvRows.push(`${market} Analytics Export - ${analytics.currentPeriod.label}`);
    csvRows.push(`Comparison: ${analytics.comparisonPeriod?.label || 'None'}`);
    csvRows.push(`Exported At: ${new Date().toISOString()}`);
    csvRows.push('');
    csvRows.push('Metric,Current Value,Comparison Value,Absolute Delta,Percentage Delta,Status');

    for (const [key, m] of Object.entries(analytics.kpiSummary)) {
      if (m && m.current !== null) {
        csvRows.push(
          `"${key}","${m.current}","${m.comparison ?? ''}","${m.absoluteDelta ?? ''}","${m.percentageDelta !== null ? m.percentageDelta + '%' : ''}","${m.availability}"`
        );
      }
    }

    csvRows.push('');
    csvRows.push('Top Products by GMV:');
    csvRows.push('Rank,Product Name,Current GMV,Orders,Units,Contribution %');
    analytics.productAnalytics.items.slice(0, 50).forEach((p, idx) => {
      csvRows.push(`"${idx + 1}","${p.name.replace(/"/g, '""')}","${p.currentGmv}","${p.orders}","${p.units}","${p.contributionPct}%"`);
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${market.toLowerCase()}-analytics-${period.start}-to-${period.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isShopee = market === 'Shopee';

  const tabs = [
    { id: 'overview', label: 'Overview & Trends', icon: BarChart3, group: 'core' },
    { id: 'creators', label: isShopee ? 'Affiliates & Creators' : 'Creators', icon: Users, group: 'drivers' },
    { id: 'products', label: 'Products & SKUs', icon: Package, group: 'drivers' },
    { id: 'contribution', label: 'Contribution to Change', icon: Layers, group: 'drivers' },
    { id: 'campaigns', label: 'Campaigns & Brands', icon: Target, group: 'operations' },
    { id: 'stock', label: 'Stock Supply Risks', icon: ShieldAlert, group: 'operations' },
    { id: 'ai', label: 'AI Operational Briefing', icon: Sparkles, group: 'operations' },
  ];

  const hasData = analytics.kpiSummary.gmv.current > 0 || analytics.timeSeries.some(p => p.currentValue > 0);

  return (
    <div className="space-y-5 pb-16">
      {/* 1. PLATFORM INTELLIGENCE HEADER */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            {/* Distinctive Platform Identity Badge */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs ${
              isShopee 
                ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-600 border-amber-500/30' 
                : 'bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700'
            }`}>
              {isShopee ? <ShoppingBag size={24} /> : <Music2 size={24} />}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                  {market} Analytics Intelligence
                </h1>

                {/* Sibling Marketplace Quick Switcher (Section 12 Continuity) */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-semibold">
                  <Link
                    href="/shopee"
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      isShopee
                        ? 'bg-white text-amber-700 shadow-2xs font-bold'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Shopee
                  </Link>
                  <Link
                    href="/tiktok"
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      !isShopee
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    TikTok
                  </Link>
                </div>

                {analytics.coverage.isH2Ready ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    H-2 Ready
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                    <Clock size={12} />
                    H-2 Pending
                  </span>
                )}
              </div>

              <p className="text-xs text-[#64748B] mt-1 flex flex-wrap items-center gap-2 font-normal">
                <span>Deterministic period performance, attribution drivers &amp; risk telemetry.</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#475569] bg-[#F8FAFC] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                  Timezone: Asia/Jakarta (WIB)
                </span>
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Download size={14} className="text-[#64748B]" />
              Export Analysis
            </button>
            <Link
              href={`/imports/${market.toLowerCase()}`}
              className="h-9 px-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Upload size={14} />
              Import {market} Data
            </Link>
          </div>
        </div>

        {/* Data Freshness Ribbon */}
        <div className="mt-4 pt-3.5 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-[#2563EB]" />
              <span className="font-semibold text-[#0F172A]">{analytics.currentPeriod.label}</span>
            </div>
            {analytics.comparisonPeriod && (
              <div className="flex items-center gap-1.5">
                <span className="text-[#94A3B8]">vs</span>
                <span className="font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                  {analytics.comparisonPeriod.label}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div>
              <span className="text-[#94A3B8]">Coverage: </span>
              <span className="font-semibold text-[#0F172A]">
                {analytics.coverage.latestDate 
                  ? `Through ${formatDateHuman(analytics.coverage.latestDate)}` 
                  : 'No imports'}
              </span>
            </div>
            <div className="border-l border-[#E2E8F0] pl-3">
              <span className="text-[#94A3B8]">Last import: </span>
              <span className="font-semibold text-[#0F172A]">
                {analytics.coverage.lastImportedAt 
                  ? `${analytics.coverage.lastImportedAt.slice(0, 10)} (${analytics.coverage.lastImportedFile || 'Verified'})` 
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. UNIFIED ANALYTICS PERIOD SELECTOR */}
      <AnalyticsPeriodSelector
        currentPeriod={period}
        comparisonPeriod={comparison}
        onPeriodChange={handlePeriodChange}
        onComparisonChange={handleComparisonChange}
        onCalendarChange={handleCalendarChange}
      />

      {/* EMPTY STATE IF NO DATA IN WORKSPACE */}
      {!hasData ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center shadow-2xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] mx-auto flex items-center justify-center shadow-xs">
            {isShopee ? <ShoppingBag size={28} /> : <Music2 size={28} />}
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#0F172A]">
              No {market} performance data is available for this period
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Import a verified {market} affiliate export (CSV/XLSX) to populate deep creator analytics, 
              product Pareto distribution, and period-over-period attribution.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/imports/${market.toLowerCase()}`}
              className="h-10 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition-all active:scale-95"
            >
              <Upload size={14} />
              Import {market} Data
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 3. EXECUTIVE SNAPSHOT (ASYMMETRIC KPI HIERARCHY) */}
          <KPIComparisonStrip 
            kpis={analytics.kpiSummary}
            marketplace={market}
          />

          {/* 4. EXECUTIVE STORY LAYER (WHAT CHANGED → WHY → RISK → ACTION) */}
          <ExecutiveStoryLayer analytics={analytics} />

          {/* 5. REARCHITECTED STICKY SUB-NAVIGATION */}
          <div className="sticky top-16 z-20 bg-[#F8FAFC]/95 backdrop-blur-md pt-2 pb-1 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${
                      isActive
                        ? 'text-white'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white border border-transparent hover:border-[#E2E8F0]'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="analytics-subnav-indicator"
                        className="absolute inset-0 bg-[#0F172A] rounded-xl z-0 shadow-xs"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon size={14} className={isActive ? 'text-white' : 'text-[#64748B]'} />
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. TAB VIEW CONTENTS */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Hero Analytics Visual: Performance Trajectory */}
                <TrendChart
                  timeSeries={analytics.timeSeries}
                  hasComparison={Boolean(analytics.comparisonPeriod)}
                  currentLabel={analytics.currentPeriod.label}
                  comparisonLabel={analytics.comparisonPeriod?.label}
                />

                {/* Side-by-Side Pareto Charts: Creators & Products */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <ParetoChart
                    pareto={analytics.creatorAnalytics.pareto}
                    title="Creator Revenue Concentration"
                    subtitle="Deterministic 80/20 against total relevant population GMV"
                  />
                  <ParetoChart
                    pareto={analytics.productAnalytics.pareto}
                    title="Product Revenue Concentration"
                    subtitle="Deterministic 80/20 against total relevant population GMV"
                  />
                </div>

                {/* Quick AI Preview */}
                <AIInsightsCard analytics={analytics} />
              </div>
            )}

            {activeTab === 'creators' && (
              <div className="space-y-6">
                <CreatorLeaderboards
                  topByGmv={analytics.creatorAnalytics.topByGmv}
                  topByOrders={analytics.creatorAnalytics.topByOrders}
                  topGrowth={analytics.creatorAnalytics.topGrowth}
                  largestDeclining={analytics.creatorAnalytics.largestDeclining}
                  newlyActive={analytics.creatorAnalytics.newlyActive}
                  losingMomentum={analytics.creatorAnalytics.losingMomentum}
                  concentrationRisk={analytics.creatorAnalytics.concentrationRisk}
                />
                <ParetoChart
                  pareto={analytics.creatorAnalytics.pareto}
                  title="Creator 80/20 Concentration (Full Population GMV)"
                  subtitle="Cumulative contribution against total marketplace affiliate revenue"
                />
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <ProductAnalyticsTable items={analytics.productAnalytics.items} />
                <ParetoChart
                  pareto={analytics.productAnalytics.pareto}
                  title="Product 80/20 Concentration (Full Population GMV)"
                  subtitle="Cumulative contribution against total marketplace affiliate revenue"
                />
              </div>
            )}

            {activeTab === 'contribution' && (
              <div className="space-y-6">
                <ContributionBreakdown contribution={analytics.contributionToChange} />
              </div>
            )}

            {activeTab === 'campaigns' && (
              <div className="space-y-6">
                <BrandCampaignSection
                  brands={analytics.brandAnalytics}
                  campaigns={analytics.campaignAnalytics}
                />
              </div>
            )}

            {activeTab === 'stock' && (
              <div className="space-y-6">
                <StockCorrelationSection items={analytics.stockCorrelation} />
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <AIInsightsCard analytics={analytics} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
