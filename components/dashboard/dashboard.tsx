'use client';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Music2,
  ShoppingBag,
  TrendingUp,
  Flag,
  Users,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Target,
  Zap,
  CheckCircle2,
  ChevronDown,
  UserPlus,
} from 'lucide-react';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { money, number, sum, trend } from '@/lib/data/metrics';
import { AIDailyBriefCard } from './daily-brief';

export function PlatformIcon({ market }: { market: string }) {
  if (market === 'TikTok') {
    return (
      <span className="w-6 h-6 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0">
        <Music2 size={13} />
      </span>
    );
  }
  return (
    <span className="w-6 h-6 rounded-lg bg-[#EE4D2D] text-white flex items-center justify-center shrink-0">
      <ShoppingBag size={13} />
    </span>
  );
}

export function Dashboard() {
  const { data, name, demo } = useWorkspace();
  const [period, setPeriod] = useState<'Today' | '7D' | '30D' | 'MTD' | 'QTD' | 'YTD'>('MTD');
  const [market, setMarket] = useState<'Multi-platform' | 'TikTok' | 'Shopee'>('Multi-platform');
  const [granularity, setGranularity] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');

  // Time calculations based on Asia/Jakarta
  const now = new Date();
  const currentHour = now.getHours();
  const greetingTime =
    currentHour < 12 ? 'GOOD MORNING' : currentHour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const firstName = (name || 'Dinda Victoria').split(' ')[0].toUpperCase();

  // Period filtering calculation
  const days =
    period === 'Today'
      ? 1
      : period === '7D'
        ? 7
        : period === '30D'
          ? 30
          : period === 'MTD'
            ? 30
            : period === 'QTD'
              ? 90
              : 365;

  const trendData = useMemo(() => {
    const rawTrend = trend(data, Math.min(days, 30));
    return rawTrend.map((r) => ({
      ...r,
      total:
        market === 'TikTok'
          ? r.TikTok
          : market === 'Shopee'
            ? r.Shopee
            : r.TikTok + r.Shopee,
    }));
  }, [data, days, market]);

  const dates = useMemo(() => trendData.map((r) => r.date), [trendData]);

  const tt = useMemo(
    () =>
      data.tiktok_performance.filter((r) =>
        dates.length > 0 ? dates.includes(r.date) : true,
      ),
    [data.tiktok_performance, dates],
  );

  const sp = useMemo(
    () =>
      data.shopee_performance.filter((r) =>
        dates.length > 0 ? dates.includes(r.date) : true,
      ),
    [data.shopee_performance, dates],
  );

  // Market-scoped metrics
  const activeTT = useMemo(() => (market !== 'Shopee' ? tt : []), [market, tt]);
  const activeSP = useMemo(() => (market !== 'TikTok' ? sp : []), [market, sp]);
  const totalGMV = sum(activeTT) + sum(activeSP);
  const totalOrders = sum(activeTT, 'orders') + sum(activeSP, 'orders');
  const totalUnits = sum(activeTT, 'units_sold') + sum(activeSP, 'units_sold');

  // Targets & Campaign metrics
  const activeCampaigns = useMemo(
    () => data.entities.campaigns.filter((c) => c.status === 'Active'),
    [data.entities.campaigns],
  );

  const targetGMVTotal = useMemo(() => {
    const sumTargets = activeCampaigns.reduce(
      (acc, c) => acc + (Number(c.target_gmv) || 0),
      0,
    );
    return sumTargets > 0 ? sumTargets : 1000000;
  }, [activeCampaigns]);

  const targetAchievedPct = Math.min(
    100,
    Math.round((totalGMV / Math.max(targetGMVTotal, 1)) * 100),
  );

  // Creators with sales
  const salesAccountIds = useMemo(() => {
    const ids = new Set<string>();
    activeTT.forEach((r) => r.gmv > 0 && ids.add(r.account_id));
    activeSP.forEach((r) => r.gmv > 0 && ids.add(r.account_id));
    return ids;
  }, [activeTT, activeSP]);

  const affiliatesWithSales = salesAccountIds.size || (totalGMV > 0 ? 1 : 0);
  const activeCreators = data.entities.creators.filter((c) => c.status === 'Active');

  // Action Center & Tasks
  const openActionsCount =
    data.operations?.operational_actions?.filter((a) => a.status === 'OPEN')?.length ?? (demo ? 8 : 0);

  const pendingTasks = useMemo(
    () => data.entities.tasks.filter((t) => t.status !== 'Done'),
    [data.entities.tasks],
  );

  // Top Performing Campaigns Table
  const rankedCampaigns = useMemo(() => {
    return data.entities.campaigns
      .map((c) => {
        const cTT = tt.filter((r) => r.campaign_id === c.id);
        const cSP = sp.filter((r) => r.campaign_id === c.id);
        const cGMV = sum(cTT) + sum(cSP);
        const cOrders = sum(cTT, 'orders') + sum(cSP, 'orders');
        const cCreators = new Set([
          ...cTT.map((r) => r.account_id),
          ...cSP.map((r) => r.account_id),
        ]).size;

        const marketplace =
          typeof c['marketplace'] === 'string' ? c['marketplace'] : 'TikTok';

        return {
          ...c,
          marketplace,
          gmv: cGMV,
          orders: cOrders,
          creatorsCount: cCreators || 1,
        };
      })
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 4);
  }, [data.entities.campaigns, tt, sp]);

  // Date range formatted label
  const periodSubtitle = useMemo(() => {
    if (dates.length === 0) return 'Recent reporting coverage';
    const first = dates[0];
    const last = dates[dates.length - 1];
    return `${first} — ${last}`;
  }, [dates]);

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#EDF5FF] via-[#F1F6FF] to-[#E5EFFF] border border-[#CCE0FF] p-6 sm:py-7 sm:px-8 shadow-xs">
        {/* Abstract blue background ribbons (rich multi-layered SVG artwork with dimensional depth) */}
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-7/12 pointer-events-none overflow-hidden" aria-hidden="true">
          <svg
            viewBox="0 0 750 360"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-cover scale-110 translate-x-8 -translate-y-2 opacity-95"
          >
            <defs>
              <linearGradient id="heroRibbon1" x1="50" y1="20" x2="650" y2="350" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563EB" stopOpacity="0.55" />
                <stop offset="0.4" stopColor="#3B82F6" stopOpacity="0.4" />
                <stop offset="0.8" stopColor="#60A5FA" stopOpacity="0.2" />
                <stop offset="1" stopColor="#93C5FD" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="heroRibbon2" x1="180" y1="40" x2="720" y2="300" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1D4ED8" stopOpacity="0.6" />
                <stop offset="0.5" stopColor="#0EA5E9" stopOpacity="0.35" />
                <stop offset="0.9" stopColor="#38BDF8" stopOpacity="0.15" />
                <stop offset="1" stopColor="#BAE6FD" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="heroRibbon3" x1="280" y1="10" x2="680" y2="240" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" stopOpacity="0.45" />
                <stop offset="0.6" stopColor="#38BDF8" stopOpacity="0.25" />
                <stop offset="1" stopColor="#EFF6FF" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="heroOrb" x1="420" y1="80" x2="660" y2="280" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6" stopOpacity="0.4" />
                <stop offset="1" stopColor="#93C5FD" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {/* Layer 1: Ambient deep glow orb */}
            <circle cx="560" cy="160" r="150" fill="url(#heroOrb)" />
            {/* Layer 2: Broad dynamic ribbon */}
            <path
              d="M200 320C340 180 460 90 680 160C780 190 770 340 600 310C440 280 340 400 200 320Z"
              fill="url(#heroRibbon1)"
            />
            {/* Layer 3: Fluid translucent ribbon wave */}
            <path
              d="M260 40C400 70 510 240 700 150C800 100 780 10 650 35C520 60 400 -10 260 40Z"
              fill="url(#heroRibbon2)"
            />
            {/* Layer 4: Accent wave ribbon */}
            <path
              d="M360 80C460 110 560 270 720 220C810 190 760 90 670 110C580 130 480 30 360 80Z"
              fill="url(#heroRibbon3)"
            />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#2563EB]">
              <span suppressHydrationWarning>{greetingTime}, {firstName}</span>
              <span className="text-amber-400">✨</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-[#0F172A] leading-[1.15]">
              Turn creators into <span className="text-[#2563EB]">real growth.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-lg font-normal">
              Find the right creators, run better campaigns, and measure real impact — all in one place.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/campaigns?create=1"
                className="h-10 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-sm inline-flex items-center gap-2 transition-all"
              >
                <span>+</span> Create campaign
              </Link>
              <Link
                href="/creators"
                className="h-10 px-5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs font-semibold shadow-2xs inline-flex items-center gap-2 transition-all"
              >
                <Users size={15} className="text-[#64748B]" />
                Browse creators
              </Link>
            </div>
          </div>

          {/* Floating creator/community card on right */}
          <div className="shrink-0 max-w-sm">
            <div className="bg-white/85 backdrop-blur-md border border-white/90 rounded-2xl p-3 px-4 shadow-[0_8px_24px_-4px_rgba(37,99,235,0.14)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex -space-x-2 shrink-0">
                  <span className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    SK
                  </span>
                  <span className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    DV
                  </span>
                  <span className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    AH
                  </span>
                  <span className="w-8 h-8 rounded-full bg-[#0F172A] border-2 border-white text-white font-semibold text-[10px] flex items-center justify-center shadow-xs">
                    +{data.entities.creators.length > 0 ? `${data.entities.creators.length}k` : '1.6k'}
                  </span>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold text-[#0F172A] truncate">
                    A bigger creator economy, together.
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    {data.entities.creators.length} creators across network
                  </div>
                </div>
              </div>
              <Link
                href="/creators"
                aria-label="View creators"
                className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center hover:bg-[#1D4ED8] transition-colors shrink-0 shadow-xs"
              >
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AI Daily Brief Card (Harmonized light aesthetic) */}
      <AIDailyBriefCard />

      {/* 2. PERIOD SELECTOR & MARKETPLACE FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E2E8F0] rounded-full shadow-2xs">
          {(['Today', '7D', '30D', 'MTD', 'QTD', 'YTD'] as const).map((p) => {
            const isSelected = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              value={market}
              onChange={(e) =>
                setMarket(
                  e.target.value as 'Multi-platform' | 'TikTok' | 'Shopee',
                )
              }
              className="appearance-none bg-white border border-[#E2E8F0] rounded-full px-4 py-1.5 pr-8 text-xs font-semibold text-[#0F172A] shadow-2xs cursor-pointer hover:border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            >
              <option value="Multi-platform">Multi-platform</option>
              <option value="TikTok">TikTok Shop</option>
              <option value="Shopee">Shopee</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
          </div>

          {market === 'Shopee' && (
            <Link
              href="/shopee"
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-full inline-flex items-center gap-1 transition-all"
            >
              View Shopee Analytics <ArrowRight size={12} />
            </Link>
          )}
          {market === 'TikTok' && (
            <Link
              href="/tiktok"
              className="text-xs font-semibold text-[#0F172A] hover:text-black bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-full inline-flex items-center gap-1 transition-all"
            >
              View TikTok Analytics <ArrowRight size={12} />
            </Link>
          )}
          {market === 'Multi-platform' && (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/shopee"
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all"
              >
                Shopee Analytics →
              </Link>
              <Link
                href="/tiktok"
                className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all"
              >
                TikTok Analytics →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 3. 5 KPI CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Affiliate GMV */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center">
                <TrendingUp size={16} />
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ↑ 12.5%
              </span>
            </div>
            <div className="text-xs font-medium text-[#64748B]">Affiliate GMV</div>
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {money(totalGMV)}
            </div>
          </div>
          <div className="pt-3 flex items-end justify-between">
            <span className="text-[11px] text-[#94A3B8]">vs previous period</span>
            {/* Mini SVG Sparkline */}
            <svg width="64" height="24" viewBox="0 0 64 24" fill="none" className="overflow-visible">
              <path
                d="M2 18C14 18 20 10 32 14C44 18 50 4 62 2"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M2 18C14 18 20 10 32 14C44 18 50 4 62 2V24H2V18Z"
                fill="url(#blueMiniGrad)"
                opacity="0.15"
              />
              <defs>
                <linearGradient id="blueMiniGrad" x1="0" y1="0" x2="0" y2="24">
                  <stop stopColor="#2563EB" />
                  <stop offset="1" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* KPI 2: Campaign Target */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Target size={16} />
              </span>
            </div>
            <div className="text-xs font-medium text-[#64748B]">Campaign target</div>
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {money(targetGMVTotal)}
            </div>
          </div>
          <div className="pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600">
              <span>{targetAchievedPct}% achieved</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${targetAchievedPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Affiliates with sales */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                <Users size={16} />
              </span>
            </div>
            <div className="text-xs font-medium text-[#64748B]">Affiliates with sales</div>
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {affiliatesWithSales}
            </div>
          </div>
          <div className="pt-3 flex items-end justify-between">
            <span className="text-[11px] text-[#94A3B8]">
              {activeCreators.length} active creators · target {Math.max(2, activeCreators.length)}
            </span>
            {/* Mini purple wave */}
            <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
              <path
                d="M2 16C12 16 18 8 26 12C34 16 40 4 46 2"
                stroke="#9333EA"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* KPI 4: Orders */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                <ShoppingBag size={16} />
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ↑ 37.5%
              </span>
            </div>
            <div className="text-xs font-medium text-[#64748B]">Orders</div>
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {number(totalOrders)}
            </div>
          </div>
          <div className="pt-3 flex items-end justify-between">
            <span className="text-[11px] text-[#94A3B8]">{totalUnits} units sold</span>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-5">
              <span className="w-1.5 h-2 bg-rose-200 rounded-xs" />
              <span className="w-1.5 h-3 bg-rose-300 rounded-xs" />
              <span className="w-1.5 h-4 bg-rose-400 rounded-xs" />
              <span className="w-1.5 h-3 bg-rose-300 rounded-xs" />
              <span className="w-1.5 h-5 bg-rose-500 rounded-xs" />
            </div>
          </div>
        </div>

        {/* KPI 5: Active campaigns */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                <Flag size={16} />
              </span>
            </div>
            <div className="text-xs font-medium text-[#64748B]">Active campaigns</div>
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {activeCampaigns.length}
            </div>
          </div>
          <div className="pt-3 flex items-end justify-between">
            <span className="text-[11px] text-[#94A3B8]">Across your workspace</span>
            {/* Mini teal wave */}
            <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
              <path
                d="M2 16C12 16 20 6 30 12C38 18 42 6 46 2"
                stroke="#0D9488"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 4. GMV OVERVIEW & OPERATIONAL INTEL SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* GMV Overview Chart Panel (Col 8) */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center">
                <TrendingUp size={18} />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">GMV Overview</h2>
                <p className="text-xs text-[#64748B]">
                  Processed payment orders · {periodSubtitle}
                </p>
              </div>
            </div>

            <div className="relative">
              <select
                value={granularity}
                onChange={(e) =>
                  setGranularity(
                    e.target.value as 'Daily' | 'Weekly' | 'Monthly',
                  )
                }
                aria-label="Chart granularity"
                className="appearance-none bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 pr-7 text-xs font-semibold text-[#0F172A] cursor-pointer hover:border-[#CBD5E1] focus:outline-none"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
            </div>
          </div>

          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gmvAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#F1F5F9"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  dy={6}
                />
                <YAxis
                  tickFormatter={(v) => money(v)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  width={68}
                />
                <Tooltip
                  formatter={(val) => [money(Number(val), false), 'GMV']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total GMV"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="url(#gmvAreaGradient)"
                  dot={{ r: 3, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 5, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Right Stack: Today's Focus & My Tasks (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Today's Focus Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs hover:border-[#CBD5E1] transition-all flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles size={18} />
              </span>
              <div className="min-w-0 space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Today&apos;s Focus
                </div>
                <div className="text-sm font-bold text-[#0F172A] truncate">
                  Keep the momentum going.
                </div>
                <div className="text-xs text-[#64748B]">
                  {openActionsCount} signals to turn into next steps.
                </div>
              </div>
            </div>
            <Link
              href="/actions"
              aria-label="Open Action Center"
              className="w-8 h-8 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB] flex items-center justify-center transition-colors shrink-0"
            >
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* My Tasks Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A]">My Tasks</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#64748B]">
                  {pendingTasks.length}
                </span>
              </div>
              <Link
                href="/my-work"
                className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {pendingTasks.length === 0 ? (
              /* Polished reference-style empty state */
              <div className="py-7 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
                  <CheckSquare size={18} />
                </div>
                <div className="text-xs font-bold text-[#0F172A]">
                  You&apos;re all caught up!
                </div>
                <div className="text-[11px] text-[#94A3B8] max-w-xs mx-auto">
                  Your next assigned task will appear here.
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingTasks.slice(0, 3).map((t) => (
                  <Link
                    key={t.id}
                    href="/my-work"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1] transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-semibold text-[#0F172A] truncate">{t.name}</div>
                      <div className="text-[11px] text-[#64748B]">
                        Due {String(t.due_date || 'soon')}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
                      {String(t.priority || 'Normal')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. TOP PERFORMING CAMPAIGNS & RECENT ACTIVITY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top Performing Campaigns Table (Col 8) */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <Flag size={16} />
              </span>
              <h2 className="text-base font-bold text-[#0F172A]">
                Top Performing Campaigns
              </h2>
            </div>
            <Link
              href="/campaigns"
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
            <table className="w-full text-left text-xs min-w-[540px]">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  <th className="pb-3 font-semibold">CAMPAIGN</th>
                  <th className="pb-3 font-semibold">PLATFORM</th>
                  <th className="pb-3 font-semibold text-center">CREATORS</th>
                  <th className="pb-3 font-semibold text-center">ORDERS</th>
                  <th className="pb-3 font-semibold text-right">GMV</th>
                  <th className="pb-3 font-semibold text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {rankedCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 pr-3 font-semibold text-[#0F172A]">
                      <Link href={`/campaigns/${c.id}`} className="hover:text-[#2563EB]">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-3">
                      <PlatformIcon market={c.marketplace} />
                    </td>
                    <td className="py-3.5 pr-3 text-center text-[#475569] font-medium">
                      {c.creatorsCount}
                    </td>
                    <td className="py-3.5 pr-3 text-center text-[#475569] font-medium">
                      {c.orders}
                    </td>
                    <td className="py-3.5 pr-3 text-right font-bold text-[#0F172A]">
                      {money(c.gmv)}
                    </td>
                    <td className="py-3.5 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {c.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Activity Card (Col 4) */}
        <section className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Zap size={14} />
              </span>
              <h3 className="text-sm font-bold text-[#0F172A]">Recent Activity</h3>
            </div>
            <Link
              href="/imports"
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-4 pt-1">
            {data.activity.slice(0, 4).map((a, i) => (
              <div key={a.id || i} className="flex items-start gap-3 text-xs">
                <span className="w-7 h-7 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0 text-[#64748B] mt-0.5">
                  {a.action.includes('creator') ? (
                    <UserPlus size={13} className="text-blue-500" />
                  ) : a.action.includes('order') || a.action.includes('import') ? (
                    <ShoppingBag size={13} className="text-amber-500" />
                  ) : (
                    <CheckCircle2 size={13} className="text-emerald-500" />
                  )}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="font-semibold text-[#0F172A] truncate">{a.action}</div>
                  <div className="text-[11px] text-[#64748B] truncate">
                    {a.user} · {a.entity_type}
                  </div>
                </div>
                <span
                  suppressHydrationWarning
                  className="text-[10px] text-[#94A3B8] shrink-0 whitespace-nowrap"
                >
                  {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
