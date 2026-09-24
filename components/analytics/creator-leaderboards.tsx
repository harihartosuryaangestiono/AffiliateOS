'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import type { LeaderboardItem, ConcentrationRisk } from '@/lib/analytics/types';
import { money, number } from '@/lib/data/metrics';

interface Props {
  topByGmv: LeaderboardItem[];
  topByOrders: LeaderboardItem[];
  topGrowth: LeaderboardItem[];
  largestDeclining: LeaderboardItem[];
  newlyActive: LeaderboardItem[];
  losingMomentum: LeaderboardItem[];
  concentrationRisk: ConcentrationRisk;
}

export function CreatorLeaderboards({
  topByGmv,
  topByOrders,
  topGrowth,
  largestDeclining,
  newlyActive,
  losingMomentum,
  concentrationRisk,
}: Props) {
  const [tab, setTab] = useState<
    'gmv' | 'orders' | 'growth' | 'declining' | 'new' | 'momentum'
  >('gmv');

  const tabs = [
    { key: 'gmv', label: 'Top GMV' },
    { key: 'orders', label: 'Top Orders' },
    { key: 'growth', label: 'Top Growth' },
    { key: 'declining', label: 'Declining' },
    { key: 'new', label: 'Newly Active' },
    { key: 'momentum', label: 'Losing Momentum' },
  ] as const;

  const currentList =
    tab === 'gmv'
      ? topByGmv
      : tab === 'orders'
        ? topByOrders
        : tab === 'growth'
          ? topGrowth
          : tab === 'declining'
            ? largestDeclining
            : tab === 'new'
              ? newlyActive
              : losingMomentum;

  const riskBadge =
    concentrationRisk.riskLevel === 'HIGH'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : concentrationRisk.riskLevel === 'MODERATE'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="space-y-6">
      {/* Creator Concentration Risk Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={16} />
            </span>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">
                Creator Concentration Risk
              </h4>
              <p className="text-xs text-[#64748B]">
                Distribution of GMV across top affiliates
              </p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${riskBadge}`}>
            {concentrationRisk.riskLevel === 'HIGH' && (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle size={12} /> High Concentration
              </span>
            )}
            {concentrationRisk.riskLevel === 'MODERATE' && (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle size={12} /> Moderate Concentration
              </span>
            )}
            {concentrationRisk.riskLevel === 'LOW' && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> Healthy Diversification
              </span>
            )}
          </span>
        </div>

        {/* Share Distribution Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Top 1 Creator
            </div>
            <div className="text-base font-extrabold text-[#0F172A] mt-0.5">
              {concentrationRisk.top1Share}%
            </div>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Top 5 Creators
            </div>
            <div className="text-base font-extrabold text-[#0F172A] mt-0.5">
              {concentrationRisk.top5Share}%
            </div>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Top 10 Creators
            </div>
            <div className="text-base font-extrabold text-[#0F172A] mt-0.5">
              {concentrationRisk.top10Share}%
            </div>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Remaining Network
            </div>
            <div className="text-base font-extrabold text-[#0F172A] mt-0.5">
              {concentrationRisk.remainingShare}%
            </div>
          </div>
        </div>

        <p className="text-xs text-[#475569] leading-relaxed">
          {concentrationRisk.explanation}
        </p>
      </div>

      {/* Leaderboard Table Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#0F172A]">
              Creator Performance Leaderboard
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {currentList.length}
            </span>
          </div>

          {/* Sub tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  tab === t.key
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                <th className="pb-3 font-semibold">CREATOR</th>
                <th className="pb-3 font-semibold text-right">GMV</th>
                <th className="pb-3 font-semibold text-right">COMPARE</th>
                <th className="pb-3 font-semibold text-right">DELTA</th>
                <th className="pb-3 font-semibold text-center">ORDERS</th>
                <th className="pb-3 font-semibold text-right">CONTRIBUTION</th>
                <th className="pb-3 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                    No creators match this category in the selected period.
                  </td>
                </tr>
              ) : (
                currentList.slice(0, 15).map((c, idx) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 pr-3" aria-label="Creator">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#2563EB] font-bold text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/creators/${c.id}`}
                            className="font-bold text-[#0F172A] hover:text-[#2563EB] truncate block"
                          >
                            {c.name}
                          </Link>
                          {c.username && (
                            <span className="text-[10px] text-[#64748B]">
                              {c.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 text-right font-bold text-[#0F172A]">
                      {money(c.currentGmv)}
                    </td>

                    <td className="py-3 text-right text-[#64748B]">
                      {money(c.comparisonGmv)}
                    </td>

                    <td className="py-3 text-right font-semibold">
                      {c.absoluteDelta > 0 ? (
                        <span className="text-emerald-600 inline-flex items-center gap-0.5 justify-end">
                          <TrendingUp size={12} />
                          +{money(c.absoluteDelta)}
                        </span>
                      ) : c.absoluteDelta < 0 ? (
                        <span className="text-rose-600 inline-flex items-center gap-0.5 justify-end">
                          <TrendingDown size={12} />
                          {money(c.absoluteDelta)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Rp 0</span>
                      )}
                    </td>

                    <td className="py-3 text-center text-[#475569]">
                      {number(c.orders)}
                    </td>

                    <td className="py-3 text-right font-bold text-[#0F172A]">
                      {c.contributionPct}%
                    </td>

                    <td className="py-3 text-right">
                      <Link
                        href={`/communication?creator_id=${c.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                      >
                        Contact <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
