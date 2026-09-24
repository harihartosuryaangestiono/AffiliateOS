'use client';
import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { MarketplaceAnalyticsResult } from '@/lib/analytics/engine';
import { money } from '@/lib/data/metrics';

interface Props {
  analytics: MarketplaceAnalyticsResult;
}

type AIInsightData = {
  summary: string;
  growth_drivers: string[];
  decline_drivers: string[];
  risks: string[];
  opportunities: string[];
  recommended_checks: string[];
  limitations: string[];
};

export function AIInsightsCard({ analytics }: Props) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsightData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/analytics-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketplace: analytics.marketplace,
          currentPeriodLabel: analytics.currentPeriod.label,
          comparisonPeriodLabel: analytics.comparisonPeriod?.label,
          currentGmvFormatted: money(analytics.kpiSummary.gmv.current),
          deltaGmvFormatted:
            analytics.kpiSummary.gmv.absoluteDelta !== null
              ? money(analytics.kpiSummary.gmv.absoluteDelta)
              : undefined,
          growthPct: analytics.kpiSummary.gmv.percentageDelta,
          ordersCount: analytics.kpiSummary.orders.current,
          sellingCreatorsCount: analytics.kpiSummary.affiliatesWithSales.current,
          topDriverName: analytics.whatChanged.largestProductDriver?.name,
          topDriverDeltaFormatted: analytics.whatChanged.largestProductDriver
            ? money(analytics.whatChanged.largestProductDriver.delta)
            : undefined,
          largestDeclineName: analytics.whatChanged.largestDecline?.name,
          largestDeclineDeltaFormatted: analytics.whatChanged.largestDecline
            ? money(analytics.whatChanged.largestDecline.delta)
            : undefined,
          concentrationRiskExplanation:
            analytics.creatorAnalytics.concentrationRisk.explanation,
          stockRiskCount: analytics.stockCorrelation.length,
          language: 'id',
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || `Request failed with status ${res.status}`);
      }

      const json = (await res.json()) as { data: AIInsightData };
      setInsights(json.data);
    } catch (err) {
      setError((err as Error).message || 'Failed to generate AI insights.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#F0F7FF] via-[#F8FAFD] to-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
            <Sparkles size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#0F172A]">
                AI Performance Analysis
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] tracking-wide uppercase">
                Gemini Copilot
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              Assistive operational interpretation grounded in deterministic calculations
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchInsights}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Analyzing Trends...</span>
            </>
          ) : insights ? (
            <>
              <RefreshCw size={14} />
              <span>Re-analyze</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Explain with Gemini</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!insights && !loading && (
        <div className="p-5 rounded-xl bg-white/70 border border-[#DBEAFE] text-xs text-[#475569] leading-relaxed flex items-center justify-between">
          <span>
            Click <strong>&quot;Explain with Gemini&quot;</strong> to receive an executive briefing highlighting growth drivers, decline drivers, creator concentration risks, and recommended operator checks for this period.
          </span>
        </div>
      )}

      {insights && (
        <div className="space-y-4 pt-2">
          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-white border border-[#BFDBFE] shadow-2xs space-y-1.5">
            <div className="font-bold text-xs uppercase tracking-wider text-[#2563EB]">
              Executive Summary
            </div>
            <p className="text-sm font-medium text-[#0F172A] leading-relaxed">
              {insights.summary}
            </p>
          </div>

          {/* Drivers & Risks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Growth & Opportunities */}
            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
              <div className="font-bold text-xs text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                <span>Growth Drivers & Opportunities</span>
              </div>
              <ul className="text-xs text-[#475569] space-y-1.5 list-disc list-inside">
                {insights.growth_drivers.concat(insights.opportunities).map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Decline & Operational Risks */}
            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
              <div className="font-bold text-xs text-rose-700 flex items-center gap-1.5">
                <AlertCircle size={13} />
                <span>Decline Areas & Operational Risks</span>
              </div>
              <ul className="text-xs text-[#475569] space-y-1.5 list-disc list-inside">
                {insights.decline_drivers.concat(insights.risks).map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended Checks */}
          {insights.recommended_checks.length > 0 && (
            <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] text-xs space-y-1.5">
              <div className="font-bold text-[#0F172A]">Recommended Operator Actions Today:</div>
              <div className="flex flex-wrap gap-2 pt-1">
                {insights.recommended_checks.map((chk, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] font-medium"
                  >
                    ✓ {chk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer & Limitations */}
          <div className="text-[11px] text-[#94A3B8] flex flex-wrap items-center justify-between pt-1">
            <span>
              Generated by Gemini from pre-calculated AffiliateOS metrics. AI does not invent or calculate financial values.
            </span>
            <span>Deterministic Grounding Guaranteed</span>
          </div>
        </div>
      )}
    </div>
  );
}
