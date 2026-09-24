'use client';
import { ArrowUpRight, ArrowDownRight, Sparkles, UserPlus, UserMinus } from 'lucide-react';
import type { ContributionToChange } from '@/lib/analytics/types';
import { money } from '@/lib/data/metrics';

interface Props {
  contribution: ContributionToChange;
}

export function ContributionBreakdown({ contribution }: Props) {
  const isNetPositive = contribution.totalDeltaGmv >= 0;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isNetPositive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            }`}
          >
            <Sparkles size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Contribution to Change
            </h3>
            <p className="text-xs text-[#64748B]">
              Deterministic decomposition of net performance movement
            </p>
          </div>
        </div>

        {/* Net Delta Pill */}
        <div
          className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
            isNetPositive
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>Net Movement:</span>
          <span>
            {isNetPositive ? '+' : ''}
            {money(contribution.totalDeltaGmv)}
          </span>
          {contribution.totalGrowthPct !== null && (
            <span>
              ({isNetPositive ? '+' : ''}
              {contribution.totalGrowthPct}%)
            </span>
          )}
        </div>
      </div>

      {/* Grid of Drivers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Positive Drivers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
            <ArrowUpRight size={14} />
            <span>Top Growth Drivers (Positive Delta)</span>
          </div>

          <div className="space-y-2">
            {contribution.topPositiveDrivers.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#94A3B8] text-center">
                No positive growth drivers in this comparison.
              </div>
            ) : (
              contribution.topPositiveDrivers.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0F172A] truncate">
                      {d.name}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {money(d.currentValue)} (was {money(d.comparisonValue)})
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-emerald-600">
                      +{money(d.absoluteDelta)}
                    </div>
                    {d.growthPct !== null && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        +{d.growthPct}%
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Negative Drivers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider">
            <ArrowDownRight size={14} />
            <span>Top Decline Drivers (Negative Delta)</span>
          </div>

          <div className="space-y-2">
            {contribution.topNegativeDrivers.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#94A3B8] text-center">
                No significant decline drivers in this comparison.
              </div>
            ) : (
              contribution.topNegativeDrivers.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0F172A] truncate">
                      {d.name}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {money(d.currentValue)} (was {money(d.comparisonValue)})
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-rose-600">
                      {money(d.absoluteDelta)}
                    </div>
                    {d.growthPct !== null && (
                      <div className="text-[10px] text-rose-700 font-medium">
                        {d.growthPct}%
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New vs Lost Contributors Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F1F5F9]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <UserPlus size={16} />
          </span>
          <div className="text-xs">
            <div className="font-bold text-emerald-900">
              {contribution.newContributors.length} New Selling Contributors
            </div>
            <div className="text-[11px] text-emerald-700">
              Generated {money(contribution.newContributors.reduce((a, b) => a + b.currentValue, 0))} this period
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3]">
          <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <UserMinus size={16} />
          </span>
          <div className="text-xs">
            <div className="font-bold text-rose-900">
              {contribution.lostContributors.length} Inactive This Period
            </div>
            <div className="text-[11px] text-rose-700">
              Represented {money(contribution.lostContributors.reduce((a, b) => a + b.comparisonValue, 0))} in comparison
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
