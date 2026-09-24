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
    <div className="panel my-4 border-blue-900/30 bg-blue-950/10 p-4 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-blue-200">
            <Sparkles size={13} className="text-blue-400" /> Operational Daily Brief
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/60 text-blue-300 border border-blue-800">
            AI Summary
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={loadBrief}
            disabled={loading}
            className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-200"
          >
            <RefreshCw size={11} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading && !brief ? (
        <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
          <span className="animate-pulse">Analyzing Action Center, outreach schedules, and H-2 data coverage...</span>
        </div>
      ) : brief ? (
        <div className="space-y-3 text-xs">
          <div>
            <h4 className="font-semibold text-slate-100 text-xs">{brief.headline}</h4>
            <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">{brief.summary}</p>
          </div>

          {brief.priorities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {brief.priorities.slice(0, 2).map((p, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-200 text-[11px] block">{p.title}</span>
                    <span className="text-slate-400 text-[11px] block">{p.reason}</span>
                  </div>
                  <Link
                    href={
                      p.related_entity_type === 'creator'
                        ? `/creators/communication?creator_id=${p.related_entity_id}`
                        : '/actions'
                    }
                    className="text-blue-400 hover:text-blue-300 text-[11px] shrink-0 font-medium inline-flex items-center gap-0.5"
                  >
                    Action <ArrowRight size={11} />
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="italic flex items-center gap-1">
              <AlertCircle size={11} className="text-slate-500" />
              {brief.data_limitations[0] || 'Cakupan data Shopee & TikTok siap hingga H-2'}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px]">Helpful?</span>
              <button
                type="button"
                onClick={() => handleFeedback('HELPFUL')}
                disabled={feedback !== null}
                className={`p-1 rounded transition-colors ${
                  feedback === 'HELPFUL' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Helpful"
              >
                <ThumbsUp size={11} />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback('NOT_HELPFUL')}
                disabled={feedback !== null}
                className={`p-1 rounded transition-colors ${
                  feedback === 'NOT_HELPFUL' ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Not Helpful"
              >
                <ThumbsDown size={11} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
