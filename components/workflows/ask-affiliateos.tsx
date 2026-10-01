'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Send, ArrowRight, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { AISparkleIcon, AIGenerationState, ProgressiveChunkReveal } from '@/components/motion/ai-signature';

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
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100/80 hover:border-blue-300 transition-all shadow-2xs group shrink-0"
      >
        <Sparkles size={13} className="text-blue-600 group-hover:rotate-12 transition-transform shrink-0" />
        <span className="hidden sm:inline">Ask AffiliateOS</span>
        <span className="sm:hidden">Ask AI</span>
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
      <SheetContent className="entity-sheet sm:max-w-[500px] flex flex-col h-full bg-white border-l border-[#E2E8F0] p-6 shadow-xl">
        <SheetHeader className="pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <SheetTitle className="flex items-center gap-1.5 text-base font-bold text-[#0F172A]">
              <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center">
                <Sparkles size={14} />
              </span>
              Ask AffiliateOS
            </SheetTitle>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              AI Copilot
            </span>
          </div>
          <SheetDescription className="text-xs text-[#64748B] mt-1.5">
            Tanyakan operasional harian, creator follow-up, kampanye, atau Action Center. Data diambil dari konteks deterministik workspace.
          </SheetDescription>
        </SheetHeader>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 text-xs">
          {!response && !loading && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-[#64748B]">Pertanyaan umum yang bisa Anda tanyakan:</p>
              <div className="space-y-2">
                {starters.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAsk(s)}
                    className="w-full text-left p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1] text-[#334155] text-xs font-medium transition-all active:scale-[0.99] flex items-center justify-between shadow-2xs group"
                  >
                    <span>{s}</span>
                    <ArrowRight size={13} className="text-[#94A3B8] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <AIGenerationState
              label="Synthesizing grounded workspace intelligence..."
              className="my-2"
            />
          )}

          {response && (
            <div className="space-y-3.5 transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-2">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5"
              >
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Pertanyaan Anda:</span>
                <p className="text-sm font-semibold text-[#0F172A]">{query}</p>
              </motion.div>

              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5">
                    <AISparkleIcon size={14} className="text-[#2563EB]" /> Jawaban AffiliateOS:
                  </span>
                  {response.domain_routed && (
                    <span className="text-[10px] text-[#64748B] font-mono bg-white px-2 py-0.5 rounded-md border border-blue-200/60">
                      Domain: {response.domain_routed}
                    </span>
                  )}
                </div>
                <ProgressiveChunkReveal
                  text={response.answer}
                  className="text-[#334155] leading-relaxed text-xs"
                />

                {response.references.length > 0 && (
                  <div className="pt-2.5 border-t border-blue-200/70 space-y-1.5">
                    <span className="text-[11px] font-semibold text-[#64748B] block">Referensi Terkait:</span>
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
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-[#2563EB] border border-blue-200 hover:bg-blue-50 transition-colors inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>{ref.label}</span>
                          <ArrowRight size={11} />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {response.limitations.length > 0 && (
                  <div className="pt-1.5 text-[10px] text-[#64748B] italic flex items-center gap-1">
                    <AlertCircle size={11} className="text-amber-500 shrink-0" />
                    <span>{response.limitations.join(' · ')}</span>
                  </div>
                )}
              </div>

              {/* Feedback */}
              <div className="flex items-center justify-end gap-2 text-xs text-[#64748B] pt-1">
                <span>Jawaban ini membantu?</span>
                <button
                  type="button"
                  onClick={() => handleFeedback('HELPFUL')}
                  disabled={feedback !== null}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    feedback === 'HELPFUL' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'border-transparent hover:bg-slate-100 text-[#64748B]'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback('NOT_HELPFUL')}
                  disabled={feedback !== null}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    feedback === 'NOT_HELPFUL' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-transparent hover:bg-slate-100 text-[#64748B]'
                  }`}
                  title="Not Helpful"
                >
                  <ThumbsDown size={13} />
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
          className="pt-4 border-t border-[#E2E8F0] flex items-center gap-2"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tanyakan tentang creator, outreach, atau kampanye..."
            className="text-xs h-10 rounded-xl border-[#E2E8F0] focus-visible:ring-[#2563EB]"
          />
          <Button type="submit" size="sm" disabled={loading || !query.trim()} className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
            <Send size={14} />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
