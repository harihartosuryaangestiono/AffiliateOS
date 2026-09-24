'use client';
import { Flag, Building2, TrendingUp, TrendingDown, Layers, CalendarDays } from 'lucide-react';
import type { BrandAnalyticsRow } from '@/lib/analytics/brands';
import type { CampaignAnalyticsRow } from '@/lib/analytics/campaigns';
import { money } from '@/lib/data/metrics';
import Link from 'next/link';

interface Props {
  brands: BrandAnalyticsRow[];
  campaigns: CampaignAnalyticsRow[];
}

export function BrandCampaignSection({ brands, campaigns }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Brand Performance Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Building2 size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Brand Performance
            </h3>
            <p className="text-xs text-[#64748B]">
              Aggregated across product-to-brand data mart mappings
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <table className="w-full text-left text-xs min-w-[380px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                <th className="pb-3 font-semibold">BRAND</th>
                <th className="pb-3 font-semibold text-right">GMV</th>
                <th className="pb-3 font-semibold text-right">CONTRIB %</th>
                <th className="pb-3 font-semibold text-right">DELTA</th>
                <th className="pb-3 font-semibold text-center">CREATORS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                    No brand performance data in this period.
                  </td>
                </tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.brandId} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 pr-2">
                      <span
                        className={`font-semibold ${
                          b.brandName === 'UNMAPPED'
                            ? 'text-amber-600 italic'
                            : 'text-[#0F172A]'
                        }`}
                      >
                        {b.brandName}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-[#0F172A]">
                      {money(b.currentGmv)}
                    </td>
                    <td className="py-3 text-right text-[#64748B] font-medium">
                      {b.contributionPct}%
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {b.absoluteDelta > 0 ? (
                        <span className="text-emerald-600 inline-flex items-center gap-0.5 justify-end">
                          <TrendingUp size={11} />
                          +{money(b.absoluteDelta)}
                        </span>
                      ) : b.absoluteDelta < 0 ? (
                        <span className="text-rose-600 inline-flex items-center gap-0.5 justify-end">
                          <TrendingDown size={11} />
                          {money(b.absoluteDelta)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Rp 0</span>
                      )}
                    </td>
                    <td className="py-3 text-center text-[#475569]">
                      {b.creatorsCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Performance Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <Flag size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Campaign Performance
            </h3>
            <p className="text-xs text-[#64748B]">
              Campaign targets, creator velocity, and operational linkages
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <table className="w-full text-left text-xs min-w-[420px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                <th className="pb-3 font-semibold">CAMPAIGN</th>
                <th className="pb-3 font-semibold text-right">GMV</th>
                <th className="pb-3 font-semibold text-center">TARGET %</th>
                <th className="pb-3 font-semibold text-right">GMV/CREATOR</th>
                <th className="pb-3 font-semibold text-center">TAGS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                    No campaign activity in this period.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 pr-2">
                      <Link
                        href={`/campaigns/${c.campaignId}`}
                        className="font-bold text-[#0F172A] hover:text-[#2563EB] block truncate max-w-[140px]"
                      >
                        {c.campaignName}
                      </Link>
                    </td>
                    <td className="py-3 text-right font-bold text-[#0F172A]">
                      {money(c.currentGmv)}
                    </td>
                    <td className="py-3 text-center">
                      {c.achievementPct !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.achievementPct >= 100
                              ? 'bg-emerald-50 text-emerald-700'
                              : c.achievementPct >= 70
                                ? 'bg-blue-50 text-[#2563EB]'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {c.achievementPct}%
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">No target</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-[#475569] font-medium">
                      {c.gmvPerCreator !== null ? money(c.gmvPerCreator) : '—'}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {c.hasHsl && (
                          <span
                            title="HSL Activation linked"
                            className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center"
                          >
                            <Layers size={11} />
                          </span>
                        )}
                        {c.hasPeakDay && (
                          <span
                            title="Peak Day linked"
                            className="w-5 h-5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center"
                          >
                            <CalendarDays size={11} />
                          </span>
                        )}
                        {!c.hasHsl && !c.hasPeakDay && (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </div>
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
