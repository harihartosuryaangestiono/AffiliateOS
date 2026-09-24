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
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles,
  Layers,
  Users,
  Package,
  Target,
  BarChart3,
  ShieldAlert
} from 'lucide-react';
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
import { TrendChart } from './trend-chart';
import { ParetoChart } from './pareto-chart';
import { CreatorLeaderboards } from './creator-leaderboards';
import { ProductAnalyticsTable } from './product-analytics-table';
import { ContributionBreakdown } from './contribution-breakdown';
import { BrandCampaignSection } from './brand-campaign-section';
import { StockCorrelationSection } from './stock-correlation-section';
import { AIInsightsCard } from './ai-insights-card';
import { money, number } from '@/lib/data/metrics';

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
    { id: 'overview', label: 'Overview & Trends', icon: BarChart3 },
    { id: 'creators', label: isShopee ? 'Affiliates & Creators' : 'Creators', icon: Users },
    { id: 'products', label: 'Products & SKUs', icon: Package },
    { id: 'contribution', label: 'Contribution to Change', icon: Layers },
    { id: 'campaigns', label: 'Campaigns & Brands', icon: Target },
    { id: 'stock', label: 'Stock Supply Risks', icon: ShieldAlert },
    { id: 'ai', label: 'AI Operational Briefing', icon: Sparkles },
  ];

  const hasData = analytics.kpiSummary.gmv.current > 0 || analytics.timeSeries.some(p => p.currentValue > 0);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. MARKETPLACE ANALYTICS HEADER */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isShopee 
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                : 'bg-slate-900 text-white border-slate-800'
            }`}>
              {isShopee ? <ShoppingBag size={24} /> : <Music2 size={24} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                  {market} Analytics Workspace
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${
                  isShopee 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}>
                  {market} Verified
                </span>
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
              <p className="text-xs sm:text-sm text-[#64748B] mt-1 flex flex-wrap items-center gap-2 font-normal">
                <span>Deterministic period performance, attribution drivers &amp; risk telemetry.</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#475569] bg-[#F8FAFC] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                  Timezone: Asia/Jakarta (WIB)
                </span>
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-all"
            >
              <Download size={14} className="text-[#64748B]" />
              Export Analysis
            </button>
            <Link
              href={`/imports/${market.toLowerCase()}`}
              className="h-9 px-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-all"
            >
              <Upload size={14} />
              Import {market} Data
            </Link>
          </div>
        </div>

        {/* Status & Freshness Ribbon */}
        <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-[#2563EB]" />
              <span className="font-medium text-[#0F172A]">{analytics.currentPeriod.label}</span>
            </div>
            {analytics.comparisonPeriod && (
              <div className="flex items-center gap-1.5">
                <span className="text-[#94A3B8]">vs</span>
                <span className="font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                  {analytics.comparisonPeriod.label}
                </span>
                <span className="text-[11px] text-[#64748B]">
                  ({analytics.comparisonPeriod.dayCount} days vs {analytics.currentPeriod.dayCount} days)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div>
              <span className="text-[#94A3B8]">Data coverage: </span>
              <span className="font-semibold text-[#0F172A]">
                {analytics.coverage.latestDate 
                  ? `Complete through ${formatDateHuman(analytics.coverage.latestDate)}` 
                  : 'No imports available'}
              </span>
            </div>
            <div className="border-l border-[#E2E8F0] pl-4">
              <span className="text-[#94A3B8]">Last import: </span>
              <span className="font-semibold text-[#0F172A]">
                {analytics.coverage.lastImportedAt 
                  ? `${analytics.coverage.lastImportedAt.slice(0, 10)} (${analytics.coverage.lastImportedFile || 'Verified'})` 
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Fair Comparison Warning if unequal duration */}
        {analytics.coverage.hasFairComparisonWarning && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <span>
              <strong>Fair Comparison Warning:</strong> {analytics.coverage.warningMessage || `The current period (${analytics.currentPeriod.dayCount} days) has a different duration than the comparison period (${analytics.comparisonPeriod?.dayCount} days).`}
            </span>
          </div>
        )}
      </div>

      {/* 2. GLOBAL ANALYTICS PERIOD SELECTOR */}
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
          <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] mx-auto flex items-center justify-center">
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
              className="h-10 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition-all"
            >
              <Upload size={14} />
              Import {market} Data
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 3. DETERMINISTIC "WHAT CHANGED?" SUMMARY STRIP */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <TrendingUp size={15} />
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Executive Movement: What Changed?
                </h3>
              </div>
              <span className="text-[11px] font-medium text-[#64748B]">
                {analytics.currentPeriod.label} vs {analytics.comparisonPeriod?.label || 'Previous'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
              {/* GMV Change */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-[#64748B]">Affiliate GMV</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-[#0F172A]">
                    {money(analytics.kpiSummary.gmv.current)}
                  </span>
                </div>
                {analytics.kpiSummary.gmv.percentageDelta !== null && (
                  <span className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${
                    analytics.kpiSummary.gmv.percentageDelta > 0 
                      ? 'text-emerald-600' 
                      : analytics.kpiSummary.gmv.percentageDelta < 0 ? 'text-rose-600' : 'text-[#64748B]'
                  }`}>
                    {analytics.kpiSummary.gmv.percentageDelta > 0 ? '+' : ''}
                    {analytics.kpiSummary.gmv.percentageDelta.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Orders Change */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-[#64748B]">Total Orders</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-[#0F172A]">
                    {number(analytics.kpiSummary.orders.current)}
                  </span>
                </div>
                {analytics.kpiSummary.orders.percentageDelta !== null && (
                  <span className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${
                    analytics.kpiSummary.orders.percentageDelta > 0 
                      ? 'text-emerald-600' 
                      : analytics.kpiSummary.orders.percentageDelta < 0 ? 'text-rose-600' : 'text-[#64748B]'
                  }`}>
                    {analytics.kpiSummary.orders.percentageDelta > 0 ? '+' : ''}
                    {analytics.kpiSummary.orders.percentageDelta.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Selling Creators */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-[#64748B]">Selling Creators</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-[#0F172A]">
                    {number(analytics.kpiSummary.affiliatesWithSales.current)}
                  </span>
                </div>
                {analytics.kpiSummary.affiliatesWithSales.absoluteDelta !== null && (
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    {analytics.kpiSummary.affiliatesWithSales.absoluteDelta > 0 ? '+' : ''}
                    {analytics.kpiSummary.affiliatesWithSales.absoluteDelta} net creators
                  </span>
                )}
              </div>

              {/* Largest Product Driver */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-[#64748B]">Top Product Driver</p>
                {analytics.whatChanged.largestProductDriver ? (
                  <>
                    <p className="text-xs font-bold text-[#0F172A] truncate" title={analytics.whatChanged.largestProductDriver.name}>
                      {analytics.whatChanged.largestProductDriver.name}
                    </p>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      +{money(analytics.whatChanged.largestProductDriver.delta)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-[#94A3B8]">No expansion</span>
                )}
              </div>

              {/* Largest Creator Driver */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-[#64748B]">Top Creator Driver</p>
                {analytics.whatChanged.largestCreatorDriver ? (
                  <>
                    <p className="text-xs font-bold text-[#0F172A] truncate" title={analytics.whatChanged.largestCreatorDriver.name}>
                      {analytics.whatChanged.largestCreatorDriver.name}
                    </p>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      +{money(analytics.whatChanged.largestCreatorDriver.delta)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-[#94A3B8]">No expansion</span>
                )}
              </div>

              {/* Largest Decline */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-[#64748B]">Largest Decline</p>
                {analytics.whatChanged.largestDecline ? (
                  <>
                    <p className="text-xs font-bold text-[#0F172A] truncate" title={analytics.whatChanged.largestDecline.name}>
                      {analytics.whatChanged.largestDecline.name}
                    </p>
                    <span className="text-[11px] font-semibold text-rose-600">
                      {money(analytics.whatChanged.largestDecline.delta)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-[#94A3B8]">No declines</span>
                )}
              </div>
            </div>
          </div>

          {/* 4. EXECUTIVE OVERVIEW - KPI COMPARISON STRIP */}
          <KPIComparisonStrip 
            kpis={analytics.kpiSummary}
            marketplace={market}
          />

          {/* 5. STICKY SUB-NAVIGATION TABS */}
          <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 backdrop-blur-md pt-2 pb-1 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#0F172A] text-white shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white border border-transparent hover:border-[#E2E8F0]'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-white' : 'text-[#64748B]'} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. TAB VIEW CONTENTS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Dual-period Trend Chart */}
              <TrendChart
                timeSeries={analytics.timeSeries}
                hasComparison={Boolean(analytics.comparisonPeriod)}
                currentLabel={analytics.currentPeriod.label}
                comparisonLabel={analytics.comparisonPeriod?.label}
              />

              {/* Side-by-Side Pareto Charts: Creators & Products */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ParetoChart
                  pareto={analytics.creatorAnalytics.pareto}
                  title="Creator GMV Concentration (Pareto)"
                  subtitle="Deterministic 80/20 against total relevant population GMV"
                />
                <ParetoChart
                  pareto={analytics.productAnalytics.pareto}
                  title="Product GMV Concentration (Pareto)"
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
        </>
      )}
    </div>
  );
}
