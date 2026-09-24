'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Heading } from './primitives';
import { records, canOperate } from '@/lib/operations/config';
import { money } from '@/lib/data/metrics';
import { todayISO } from '@/lib/operations/engine';
import { generateTodayQueue, generateWhatsAppLink } from '@/lib/communication/queue';
import { interpolateTemplate } from '@/lib/communication/templates';
import { prepareBulkCommunication, type BulkPreparationResult } from '@/lib/communication/bulk';
import { PlatformIcon } from '@/components/dashboard/dashboard';
import type { OutreachQueueItem, CommunicationTemplate } from '@/types/domain';
import { toast } from 'sonner';
import {
  MessageCircle,
  Copy,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Users,
  ShieldAlert,
} from 'lucide-react';

export function CommunicationWorkspace() {
  const { data, role } = useWorkspace();
  const [tab, setTab] = useState<'Today' | 'Follow-Up' | 'New Outreach' | 'Re-Approach' | 'Waiting Response' | 'Interested' | 'History'>('Today');
  const [search, setSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState<'All' | 'Shopee' | 'TikTok'>('All');
  const [activeQueueItem, setActiveQueueItem] = useState<OutreachQueueItem | null>(null);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [bulkModal, setBulkModal] = useState(false);

  const canEdit = canOperate(role, 'creator_outreach');
  const today = todayISO();

  // Generate Prioritized Today Queue
  const fullQueue = generateTodayQueue(data, today);

  // Filtered Queue per Tab & Controls
  const filteredQueue = fullQueue.filter((item) => {
    if (marketFilter !== 'All' && item.marketplace !== marketFilter) return false;
    if (search && !item.creator_name.toLowerCase().includes(search.toLowerCase())) return false;

    if (tab === 'Today') return !item.is_blacklisted;
    if (tab === 'Follow-Up') return ['FOLLOW_UP_1', 'FOLLOW_UP_2', 'SAMPLE_FOLLOW_UP'].includes(item.recommended_category);
    if (tab === 'New Outreach') return item.recommended_category === 'FIRST_OUTREACH';
    if (tab === 'Re-Approach') return item.recommended_category === 'REAPPROACH' || item.recommended_category === 'NO_RESPONSE';
    if (tab === 'Waiting Response') return ['No Response', 'Follow Up'].includes(item.current_outreach_state);
    if (tab === 'Interested') return ['Replied', 'Interested'].includes(item.current_outreach_state);
    return true;
  });

  // Daily Progress Counter
  const contactedTodayCount = records(data, 'creator_outreach').filter(
    (r) => r.contacted_at && String(r.contacted_at).slice(0, 10) === today,
  ).length;
  const followUpsRemainingCount = fullQueue.filter((i) =>
    ['FOLLOW_UP_1', 'FOLLOW_UP_2', 'SAMPLE_FOLLOW_UP'].includes(i.recommended_category),
  ).length;

  // Operational Funnel
  const totalCreators = data.entities.creators.length;
  const contactedTotal = records(data, 'creator_outreach').filter((r) => r.contacted_at).length;
  const respondedTotal = records(data, 'creator_outreach').filter((r) => ['Replied', 'Interested', 'Converted'].includes(String(r.status))).length;
  const interestedTotal = records(data, 'creator_outreach').filter((r) => ['Interested', 'Converted'].includes(String(r.status))).length;

  return (
    <>
      <Heading title="Creator Communication" description="Fast daily communication workspace. Prepare messages, contact intentionally, and record next actions.">
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              disabled={selectedCreators.length === 0}
              onClick={() => {
                setBulkModal(true);
              }}
            >
              <Users size={14} /> Bulk Prepare ({selectedCreators.length})
            </Button>
          )}
        </div>
      </Heading>

      {/* Daily Progress & Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="panel p-4 bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-muted-foreground mb-1">Today&apos;s Outreach Progress</div>
          <div className="text-lg font-bold text-blue-400 flex items-center gap-2">
            <CheckCircle2 size={18} />
            {contactedTodayCount} Contacted Today
          </div>
          <div className="text-xs text-slate-400 mt-1">{followUpsRemainingCount} follow-ups remaining in queue</div>
        </div>

        <div className="panel p-4 bg-slate-900/60 border border-slate-800 md:col-span-3">
          <div className="text-xs text-muted-foreground mb-2">Operational Acquisition & Outreach Funnel</div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-slate-800/40">
              <span className="block text-slate-400">Targeted</span>
              <strong className="text-base text-slate-200">{totalCreators}</strong>
            </div>
            <div className="p-2 rounded bg-slate-800/40">
              <span className="block text-slate-400">Contacted</span>
              <strong className="text-base text-blue-400">{contactedTotal}</strong>
              <span className="text-[10px] text-slate-500 block">{totalCreators ? ((contactedTotal / totalCreators) * 100).toFixed(0) : 0}%</span>
            </div>
            <div className="p-2 rounded bg-slate-800/40">
              <span className="block text-slate-400">Responded</span>
              <strong className="text-base text-amber-400">{respondedTotal}</strong>
              <span className="text-[10px] text-slate-500 block">{contactedTotal ? ((respondedTotal / contactedTotal) * 100).toFixed(0) : 0}%</span>
            </div>
            <div className="p-2 rounded bg-slate-800/40">
              <span className="block text-slate-400">Interested</span>
              <strong className="text-base text-emerald-400">{interestedTotal}</strong>
              <span className="text-[10px] text-slate-500 block">{respondedTotal ? ((interestedTotal / respondedTotal) * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
        <div className="ops-tabs overflow-x-auto flex-1">
          {(['Today', 'Follow-Up', 'New Outreach', 'Re-Approach', 'Waiting Response', 'Interested', 'History'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? 'active' : ''}>
              {t}
              {t === 'Today' && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400">{fullQueue.filter((i) => !i.is_blacklisted).length}</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search creator name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 text-xs"
          />
          <select
            aria-label="Marketplace Filter"
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value as 'All' | 'Shopee' | 'TikTok')}
            className="text-xs p-2 rounded border border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="All">All Marketplaces</option>
            <option value="Shopee">Shopee</option>
            <option value="TikTok">TikTok</option>
          </select>
        </div>
      </div>

      {/* Queue Item Cards List */}
      <section className="space-y-3">
        {filteredQueue.map((item) => (
          <div
            key={item.id}
            className={`panel p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border transition-colors ${
              item.priority === 'P0'
                ? 'border-red-500/40 bg-red-950/10'
                : item.priority === 'P1'
                  ? 'border-amber-500/30 bg-amber-950/10'
                  : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                aria-label={`Select ${item.creator_name}`}
                type="checkbox"
                checked={selectedCreators.includes(item.creator_id)}
                onChange={(e) =>
                  setSelectedCreators(e.target.checked ? [...selectedCreators, item.creator_id] : selectedCreators.filter((id) => id !== item.creator_id))
                }
                className="mt-1"
              />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/creators/${item.creator_id}`} className="font-semibold text-sm text-slate-100 hover:text-blue-400">
                    {item.creator_name}
                  </Link>
                  <PlatformIcon market={item.marketplace} />
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.priority === 'P0'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : item.priority === 'P1'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {item.priority}
                  </span>
                  {item.contacted_recently && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-amber-400 border border-amber-500/30">
                      Contacted {item.days_since_recent_contact}d ago
                    </span>
                  )}
                  {item.is_blacklisted && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-red-900/40 text-red-300 border border-red-500/40 flex items-center gap-1">
                      <ShieldAlert size={10} /> Blacklisted
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mb-1.5">{item.reason}</p>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>State: <b className="text-slate-200">{item.current_outreach_state}</b></span>
                  {item.campaign_name && <span>· Campaign: <b className="text-slate-200">{item.campaign_name}</b></span>}
                  {item.last_contact_at && <span>· Last Contact: <b>{item.last_contact_at}</b> ({item.days_since_contact}d ago)</span>}
                  {item.recent_gmv > 0 && <span className="text-emerald-400 font-semibold">· MTD Sales: {money(item.recent_gmv, true)}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button size="sm" variant="outline" onClick={() => setActiveQueueItem(item)}>
                <MessageCircle size={14} /> Prepare Message
              </Button>
            </div>
          </div>
        ))}

        {filteredQueue.length === 0 && (
          <div className="panel p-8 text-center text-slate-400">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-semibold text-slate-200">You&apos;re caught up — no communication items in this queue.</p>
            <p className="text-xs mt-1 text-slate-500">All prioritized follow-ups and outreach targets for today have been addressed.</p>
          </div>
        )}
      </section>

      {/* Individual Message Preparation Drawer */}
      {activeQueueItem && (
        <IndividualPreparationDrawer
          item={activeQueueItem}
          onClose={() => setActiveQueueItem(null)}
        />
      )}

      {/* Bulk Preparation Modal */}
      {bulkModal && (
        <BulkPreparationModal
          selectedIds={selectedCreators}
          onClose={() => setBulkModal(false)}
          onClear={() => setSelectedCreators([])}
        />
      )}
    </>
  );
}

/**
 * Individual Message Preparation & Contact Action Drawer
 */
function IndividualPreparationDrawer({
  item,
  onClose,
}: {
  item: OutreachQueueItem;
  onClose: () => void;
}) {
  const { data, mutate, role } = useWorkspace();
  const canEdit = canOperate(role, 'creator_outreach');
  const templates = records(data, 'communication_templates').filter((t) => t.is_active !== false);

  const defaultTpl =
    templates.find((t) => t.category === item.recommended_category && [item.marketplace, 'Multi-platform'].includes(String(t.marketplace))) ||
    templates[0];

  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTpl?.id || '');
  const [productName, setProductName] = useState(data.entities.products[0]?.name || '');
  const [deadline, setDeadline] = useState(todayISO());
  const [customBody, setCustomBody] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [responseState, setResponseState] = useState('Replied');
  const [busy, setBusy] = useState(false);
  const [aiDraftMode, setAiDraftMode] = useState(false);
  const [aiTone, setAiTone] = useState<'FRIENDLY' | 'PROFESSIONAL' | 'CASUAL' | 'CONCISE' | 'FOLLOW_UP'>('FRIENDLY');
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function handleGenerateAIDraft() {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: item.creator_id,
          tone: aiTone,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; data?: { message: string; reasoning_summary: string } };
      if (!res.ok) throw new Error(json.error || 'Failed to generate AI draft');
      if (json.data) {
        setCustomBody(json.data.message);
        setAiReasoning(json.data.reasoning_summary);
      }
      toast.success('Generated AI draft with Gemini');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || defaultTpl;
  const campaign = item.campaign_id ? data.entities.campaigns.find((c) => c.id === item.campaign_id) : undefined;
  const brand = campaign ? data.entities.brands.find((b) => b.id === campaign.brand_id) : undefined;

  const variables = {
    creator_name: item.creator_name,
    campaign_name: campaign?.name || item.campaign_name || 'Affiliate Campaign',
    brand_name: brand?.name || 'AffiliateOS Partner',
    marketplace: item.marketplace,
    product_name: productName,
    deadline,
  };

  const templateBody = currentTemplate?.body ? String(currentTemplate.body) : '';
  const interpolation = interpolateTemplate(templateBody, variables);
  const finalMessageText = customBody ?? interpolation.text;

  const waLink = item.phone ? generateWhatsAppLink(item.phone, finalMessageText) : null;

  async function handleLogContact() {
    setBusy(true);
    try {
      await mutate([
        {
          table: 'creator_outreach',
          record: {
            id: crypto.randomUUID(),
            name: `Outreach to ${item.creator_name}`,
            creator_id: item.creator_id,
            campaign_id: item.campaign_id || undefined,
            channel: item.recommended_channel,
            template_id: currentTemplate?.id || undefined,
            contacted_at: todayISO(),
            status: 'No Response',
            reason: item.reason,
            created_at: new Date().toISOString(),
            notes: note || undefined,
          },
        },
      ]);
      toast.success(`Logged contact for ${item.creator_name}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log contact');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogResponse() {
    setBusy(true);
    try {
      const latestOutreach = records(data, 'creator_outreach').find((r) => r.creator_id === item.creator_id);
      await mutate([
        {
          table: 'creator_outreach',
          record: {
            ...latestOutreach,
            id: latestOutreach?.id || crypto.randomUUID(),
            name: `Outreach to ${item.creator_name}`,
            creator_id: item.creator_id,
            status: responseState,
            created_at: latestOutreach?.created_at ? String(latestOutreach.created_at) : new Date().toISOString(),
            notes: note ? `${latestOutreach?.notes ? latestOutreach.notes + ' · ' : ''}${note}` : latestOutreach?.notes,
          },
        },
      ]);
      toast.success(`Recorded response (${responseState}) for ${item.creator_name}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log response');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="entity-sheet sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <PlatformIcon market={item.marketplace} />
            <SheetTitle>{item.creator_name}</SheetTitle>
          </div>
          <SheetDescription>{item.reason}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 text-xs mt-4">
          {/* Creator Context Badges */}
          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span>Phone: <b>{item.phone || 'Not recorded'}</b></span>
              <span>Email: <b>{item.email || 'Not recorded'}</b></span>
            </div>
            {item.contacted_recently && (
              <p className="text-amber-400 font-semibold mt-1">
                ⚠️ Warning: Creator was contacted {item.days_since_recent_contact} day(s) ago. Ensure communication is intentional.
              </p>
            )}
            {item.is_blacklisted && (
              <p className="text-red-400 font-semibold mt-1">
                ⛔ Warning: Creator is marked Blacklisted/Watchlist. Check operator policy before contacting.
              </p>
            )}
          </div>

          {/* Mode Switch: Standard Template vs Draft with Gemini */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-300 font-medium">Message Composition</span>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setAiDraftMode(false)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  !aiDraftMode ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Template
              </button>
              <button
                type="button"
                onClick={() => setAiDraftMode(true)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                  aiDraftMode ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                <span>✨</span> Draft with Gemini
              </button>
            </div>
          </div>

          {!aiDraftMode ? (
            /* Template Selection */
            <div>
              <label htmlFor="select-template-id" className="block text-slate-400 mb-1">Select Message Template</label>
              <select
                id="select-template-id"
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  setCustomBody(null);
                  setAiReasoning(null);
                }}
                className="w-full p-2 rounded border border-slate-700 bg-slate-900 text-slate-200 text-xs"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* AI Draft Controls */
            <div className="p-3 rounded bg-blue-950/20 border border-blue-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-blue-300 font-semibold text-[11px] flex items-center gap-1">
                  <span>✨</span> Gemini AI Outreach Assistant
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/60 text-blue-300 border border-blue-800">
                  AI Draft
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label htmlFor="select-ai-tone" className="block text-slate-400 mb-1">Outreach Tone</label>
                  <select
                    id="select-ai-tone"
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as 'FRIENDLY' | 'PROFESSIONAL' | 'CASUAL' | 'CONCISE' | 'FOLLOW_UP')}
                    className="w-full p-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 text-xs"
                  >
                    <option value="FRIENDLY">Friendly (Warm & Collaborative)</option>
                    <option value="PROFESSIONAL">Professional (Formal & Clear)</option>
                    <option value="CASUAL">Casual (Conversational)</option>
                    <option value="CONCISE">Concise (High-Density)</option>
                    <option value="FOLLOW_UP">Follow-Up (Respectful Reminder)</option>
                  </select>
                </div>
                <div className="pt-5">
                  <Button
                    type="button"
                    onClick={handleGenerateAIDraft}
                    disabled={aiLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
                  >
                    {aiLoading ? 'Drafting...' : 'Generate Draft'}
                  </Button>
                </div>
              </div>
              {aiReasoning && (
                <p className="text-[11px] text-blue-300/80 italic mt-1">
                  💡 {aiReasoning}
                </p>
              )}
            </div>
          )}

          {/* Variable Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="input-product-name" className="block text-slate-400 mb-1">Product Name</label>
              <Input id="input-product-name" value={productName} onChange={(e) => { setProductName(e.target.value); setCustomBody(null); }} className="text-xs" />
            </div>
            <div>
              <label htmlFor="input-deadline-date" className="block text-slate-400 mb-1">Deadline Date</label>
              <Input id="input-deadline-date" type="date" value={deadline} onChange={(e) => { setDeadline(e.target.value); setCustomBody(null); }} className="text-xs" />
            </div>
          </div>

          {/* Prepared Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-custom-body" className="text-slate-400">Message Preview & Customization</label>
              {interpolation.missingVariables.length > 0 && (
                <span className="text-amber-400 font-semibold text-[11px]">
                  Unresolved: {interpolation.missingVariables.join(', ')}
                </span>
              )}
            </div>
            <Textarea
              id="input-custom-body"
              rows={7}
              value={finalMessageText}
              onChange={(e) => setCustomBody(e.target.value)}
              className="font-mono text-xs text-slate-100 bg-slate-950 border-slate-800"
            />
          </div>

          {/* User Actions Bar: Copy Message & Open WhatsApp */}
          <div className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  void navigator.clipboard.writeText(finalMessageText);
                  toast.success('Copied prepared message to clipboard');
                }}
              >
                <Copy size={13} /> Copy Message
              </Button>

              {item.phone ? (
                <a
                  href={waLink!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  <ExternalLink size={13} /> Open WhatsApp
                </a>
              ) : (
                <Button variant="outline" disabled className="flex-1">
                  No WhatsApp Phone
                </Button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              AFFILIATEOS PREPARES → DINDA SENDS MANUALLY. Opening WhatsApp does not automatically mark as contacted.
            </p>
          </div>

          {/* Log Contact & Log Response Form */}
          {canEdit && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div>
                <label htmlFor="input-operational-note" className="block text-slate-400 mb-1">Operational Notes</label>
                <Input id="input-operational-note" placeholder="Short note e.g. Requested brief first..." value={note} onChange={(e) => setNote(e.target.value)} className="text-xs" />
              </div>

              <div className="flex items-center gap-2">
                <Button disabled={busy} onClick={handleLogContact} className="flex-1">
                  <CheckCircle2 size={14} /> Mark as Contacted
                </Button>

                <div className="flex-1 flex gap-1">
                  <select
                    aria-label="Response State"
                    value={responseState}
                    onChange={(e) => setResponseState(e.target.value)}
                    className="p-2 text-xs rounded border border-slate-700 bg-slate-900 text-slate-200 flex-1"
                  >
                    <option value="Replied">Replied</option>
                    <option value="Interested">Interested</option>
                    <option value="Declined">Declined</option>
                    <option value="Converted">Converted</option>
                  </select>
                  <Button disabled={busy} variant="outline" onClick={handleLogResponse}>
                    Log Response
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Bulk Preparation Modal Component
 */
function BulkPreparationModal({
  selectedIds,
  onClose,
  onClear,
}: {
  selectedIds: string[];
  onClose: () => void;
  onClear: () => void;
}) {
  const { data } = useWorkspace();
  const templates = (records(data, 'communication_templates') as unknown as CommunicationTemplate[]).filter((t) => t.is_active !== false);
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [result, setResult] = useState<BulkPreparationResult | null>(null);

  const selectedTemplate = templates.find((t) => t.id === templateId) || templates[0];

  function handlePrepare() {
    if (!selectedTemplate) return;
    const res = prepareBulkCommunication(selectedIds, selectedTemplate, data);
    setResult(res);
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="entity-sheet sm:max-w-[620px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Bulk Preparation Queue ({selectedIds.length} creators)</SheetTitle>
          <SheetDescription>
            Prepare personalized messages for review. AffiliateOS does not support automated mass sending.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 text-xs mt-4">
          <div>
            <label htmlFor="select-batch-template" className="block text-slate-400 mb-1">Choose Template for Batch</label>
            <select
              id="select-batch-template"
              value={templateId}
              onChange={(e) => { setTemplateId(e.target.value); setResult(null); }}
              className="w-full p-2 rounded border border-slate-700 bg-slate-900 text-slate-200 text-xs"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          {!result && (
            <Button onClick={handlePrepare} className="w-full">
              <Sparkles size={14} /> Analyze & Prepare Batch ({selectedIds.length})
            </Button>
          )}

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <strong className="block text-base">{result.readyCount}</strong>
                  <span>Ready for Send</span>
                </div>
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <strong className="block text-base">{result.needsReviewCount}</strong>
                  <span>Needs Review</span>
                </div>
                <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-400">
                  <strong className="block text-base">{result.skippedCount}</strong>
                  <span>Skipped</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200">Prepared Items List</h4>
                {result.items.map((item) => (
                  <div
                    key={item.creatorId}
                    className={`p-3 rounded border flex flex-col gap-1 ${
                      item.status === 'READY'
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : 'border-amber-500/30 bg-amber-950/10'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span>{item.creatorName} ({item.marketplace})</span>
                      <span className={item.status === 'READY' ? 'text-emerald-400' : 'text-amber-400'}>
                        {item.status}
                      </span>
                    </div>

                    {item.reviewReason && (
                      <p className="text-amber-400 text-[11px]">⚠️ {item.reviewReason}</p>
                    )}

                    <div className="font-mono text-[11px] text-slate-300 p-2 rounded bg-slate-950 border border-slate-800 line-clamp-2">
                      {item.preparedBody}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onClear}>Clear Selection</Button>
                <Button onClick={onClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
