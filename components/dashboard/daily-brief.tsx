'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, RefreshCw, AlertCircle, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DailyBriefData {
  headline: string;
  summary: string;
  priorities: Array<{
    title: string;
    reason: string;
    related_entity_type: string;
    related_entity_id: string;
  }>;
  watchlist: string[];
  data_limitations: string[];
}

export function AIDailyBriefCard() {
  const [brief, setBrief] = useState<DailyBriefData | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<'HELPFUL' | 'NOT_HELPFUL' | null>(null);

  async function loadBrief() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/ai/daily-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'id' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; data?: DailyBriefData };
      if (!res.ok) throw new Error(json.error || 'Failed to generate daily brief');
      if (json.data) setBrief(json.data);
    } catch {
      // Graceful fallback: do not crash dashboard
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch('/api/ai/daily-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'id' }),
    })
      .then((res) => res.json())
      .then((raw) => {
        const json = raw as { ok?: boolean; data?: DailyBriefData };
        if (active && json.data) setBrief(json.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleFeedback(rating: 'HELPFUL' | 'NOT_HELPFUL') {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'DAILY_BRIEF', rating }),
      });
      setFeedback(rating);
      toast.success(rating === 'HELPFUL' ? 'Terima kasih atas feedback Anda!' : 'Feedback tercatat.');
    } catch {
      // ignore
    }
  }

  if (!brief && !loading) {
    return null;
  }

  return (
    <div className="my-5 border border-blue-200/80 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 p-5 rounded-2xl shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center">
            <Sparkles size={13} />
          </span>
          <span className="text-xs font-bold text-[#0F172A]">
            Operational Daily Brief
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-[#2563EB] border border-blue-200 shadow-2xs">
            AI Operational Brief
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={loadBrief}
            disabled={loading}
            className="h-7 px-2.5 text-xs text-[#64748B] hover:text-[#0F172A] hover:bg-white/80 rounded-lg"
          >
            <RefreshCw size={12} className={`mr-1.5 ${loading ? 'animate-spin text-[#2563EB]' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading && !brief ? (
        <div className="text-xs text-[#64748B] py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
          <span>Analyzing Action Center, outreach schedules, and H-2 data coverage...</span>
        </div>
      ) : brief ? (
        <div className="space-y-3.5 text-xs">
          <div>
            <h4 className="font-bold text-[#0F172A] text-sm">{brief.headline}</h4>
            <p className="text-[#475569] text-xs mt-1 leading-relaxed">{brief.summary}</p>
          </div>

          {brief.priorities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {brief.priorities.slice(0, 2).map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-start justify-between gap-3 shadow-2xs hover:border-[#CBD5E1] transition-all"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-[#0F172A] text-xs block">{p.title}</span>
                    <span className="text-[#64748B] text-xs block leading-relaxed">{p.reason}</span>
                  </div>
                  <Link
                    href={
                      p.related_entity_type === 'creator'
                        ? `/creators/communication?creator_id=${p.related_entity_id}`
                        : '/actions'
                    }
                    className="text-[#2563EB] hover:text-[#1D4ED8] text-xs shrink-0 font-semibold inline-flex items-center gap-1 bg-[#EFF6FF] px-2 py-1 rounded-lg transition-colors"
                  >
                    Action <ArrowRight size={11} />
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-blue-200/60">
            <span className="italic flex items-center gap-1.5 text-[11px]">
              <AlertCircle size={12} className="text-amber-500" />
              {brief.data_limitations[0] || 'Cakupan data Shopee & TikTok siap hingga H-2'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px]">Helpful?</span>
              <button
                type="button"
                onClick={() => handleFeedback('HELPFUL')}
                disabled={feedback !== null}
                className={`p-1 rounded transition-colors ${
                  feedback === 'HELPFUL' ? 'text-emerald-600 bg-emerald-50' : 'text-[#94A3B8] hover:text-[#0F172A]'
                }`}
                title="Helpful"
              >
                <ThumbsUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback('NOT_HELPFUL')}
                disabled={feedback !== null}
                className={`p-1 rounded transition-colors ${
                  feedback === 'NOT_HELPFUL' ? 'text-rose-600 bg-rose-50' : 'text-[#94A3B8] hover:text-[#0F172A]'
                }`}
                title="Not Helpful"
              >
                <ThumbsDown size={12} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
