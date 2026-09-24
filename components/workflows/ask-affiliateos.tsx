'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Send, ArrowRight, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface AskResponse {
  answer: string;
  references: Array<{
    entity_type: string;
    entity_id: string;
    label: string;
  }>;
  limitations: string[];
  domain_routed?: string;
}

export function AskAffiliateOSButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-blue-900/60 bg-blue-950/20 text-blue-300 hover:bg-blue-900/30 transition-colors"
      >
        <Sparkles size={13} className="text-blue-400" />
        <span>Ask AffiliateOS</span>
      </button>

      {open && <AskAffiliateOSDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

export function AskAffiliateOSDrawer({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [feedback, setFeedback] = useState<'HELPFUL' | 'NOT_HELPFUL' | null>(null);

  const starters = [
    'Creator mana yang perlu di-follow up hari ini?',
    'Apa prioritas P0/P1 di Action Center?',
    'Data report minggu ini sudah lengkap belum?',
    'Bagaimana performa kampanye aktif saat ini?',
  ];

  async function handleAsk(promptText: string) {
    if (!promptText.trim()) return;
    setLoading(true);
    setFeedback(null);
    setQuery(promptText);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: promptText, language: 'id' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; data?: AskResponse };
      if (!res.ok) throw new Error(json.error || 'Failed to process question');
      if (json.data) setResponse(json.data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedback(rating: 'HELPFUL' | 'NOT_HELPFUL') {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'ASK_AFFILIATEOS', rating }),
      });
      setFeedback(rating);
      toast.success(rating === 'HELPFUL' ? 'Terima kasih atas feedback Anda!' : 'Feedback tercatat.');
    } catch {
      // ignore
    }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="entity-sheet sm:max-w-[500px] flex flex-col h-full">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="flex items-center gap-1.5 text-blue-200">
              <Sparkles size={15} className="text-blue-400" /> Ask AffiliateOS
            </SheetTitle>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/60 text-blue-300 border border-blue-800">
              AI Copilot
            </span>
          </div>
          <SheetDescription>
            Tanyakan operasional harian, creator follow-up, kampanye, atau Action Center. Data diambil dari konteks deterministik workspace.
          </SheetDescription>
        </SheetHeader>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 text-xs">
          {!response && !loading && (
            <div className="space-y-3">
              <p className="text-slate-400">Pertanyaan umum yang bisa Anda tanyakan:</p>
              <div className="space-y-1.5">
                {starters.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAsk(s)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800/80 text-slate-200 text-xs transition-colors flex items-center justify-between"
                  >
                    <span>{s}</span>
                    <ArrowRight size={12} className="text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-900/40 text-blue-200 flex items-center gap-2">
              <span className="animate-pulse">Menghubungkan ke data deterministik workspace...</span>
            </div>
          )}

          {response && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-blue-400 block">Pertanyaan Anda:</span>
                <p className="text-slate-200">{query}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-950/20 border border-blue-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-300 flex items-center gap-1">
                    <Sparkles size={12} /> Jawaban AffiliateOS:
                  </span>
                  {response.domain_routed && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Domain: {response.domain_routed}
                    </span>
                  )}
                </div>
                <p className="text-slate-100 leading-relaxed text-xs whitespace-pre-wrap">
                  {response.answer}
                </p>

                {response.references.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">Referensi Terkait:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {response.references.map((ref, idx) => (
                        <Link
                          key={idx}
                          href={
                            ref.entity_type === 'creator'
                              ? `/creators/${ref.entity_id}`
                              : ref.entity_type === 'action'
                              ? '/actions'
                              : `/campaigns/${ref.entity_id}`
                          }
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-blue-300 border border-slate-700 hover:bg-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <span>{ref.label}</span>
                          <ArrowRight size={10} />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {response.limitations.length > 0 && (
                  <div className="pt-1.5 text-[10px] text-slate-400 italic flex items-center gap-1">
                    <AlertCircle size={10} className="text-slate-500" />
                    <span>{response.limitations.join(' · ')}</span>
                  </div>
                )}
              </div>

              {/* Feedback */}
              <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400 pt-1">
                <span>Jawaban ini membantu?</span>
                <button
                  type="button"
                  onClick={() => handleFeedback('HELPFUL')}
                  disabled={feedback !== null}
                  className={`p-1 rounded transition-colors ${
                    feedback === 'HELPFUL' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
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
                    feedback === 'NOT_HELPFUL' ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Not Helpful"
                >
                  <ThumbsDown size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAsk(query);
          }}
          className="pt-3 border-t border-slate-800 flex items-center gap-2"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tanyakan tentang creator, outreach, atau kampanye..."
            className="text-xs h-9"
          />
          <Button type="submit" size="sm" disabled={loading || !query.trim()} className="h-9 px-3">
            <Send size={13} />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
