'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { Heading } from './primitives';
import { getAllProviders } from '@/lib/integrations/registry';
import { getFreshnessStatus } from '@/lib/integrations/health';
import { ArrowRight, FileSpreadsheet, CheckCircle2, Plus, MessageCircle, Edit, Layers, Tag } from 'lucide-react';
import { PlatformIcon } from '@/components/dashboard/dashboard';
import { records } from '@/lib/operations/config';
import type { CommunicationTemplate, CommunicationTemplateVersion, TemplateCategory, CommunicationChannel } from '@/types/domain';
import { SUPPORTED_PLACEHOLDERS, validateTemplateBody, prepareTemplateUpdate } from '@/lib/communication/templates';
import { toast } from 'sonner';

export function IntegrationsSettings() {
  const [tab, setTab] = useState('sources');

  return (
    <>
      <Heading
        title="Settings & Integrations"
        description="Configure marketplace data sources, communication templates, and workflow parameters."
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList variant="line" className="tabs-nav w-full justify-start mb-6">
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="templates">Communication Templates</TabsTrigger>
          <TabsTrigger value="ai">Gemini AI Copilot</TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <DataSourcesTab />
        </TabsContent>

        <TabsContent value="templates">
          <CommunicationTemplatesTab />
        </TabsContent>

        <TabsContent value="ai">
          <GeminiAISettingsTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

function DataSourcesTab() {
  const { data } = useWorkspace();
  const providers = getAllProviders().filter((p) => p.id !== 'mock-test');

  return (
    <>
      <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>
          File-Based Data Architecture
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
          Direct API integration is not used for this workspace. Import raw Shopee or TikTok export files through the <strong>Import Center</strong>. All files pass through automatic detection, schema validation, and unified normalization.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {providers.map((provider) => {
          const freshness = getFreshnessStatus(data, provider.marketplace);

          return (
            <div key={provider.id} className="panel ops-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <PlatformIcon market={provider.marketplace} />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{provider.marketplace} Data Source</h3>
                </div>
                <span
                  className="demo-badge"
                  style={{
                    backgroundColor: '#E6F4EA',
                    color: '#137333',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <CheckCircle2 size={12} /> File Export Workflow
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>
                API Access: <strong>Not Used</strong> · Workflow: <strong>Manual Marketplace Export</strong>
              </p>

              <div>
                <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>Supported File Exports:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {provider.capabilities.map((cap) => (
                    <span key={cap} className="demo-badge" style={{ fontSize: '0.75rem', backgroundColor: '#F8FAFC', color: '#334155' }}>
                      {cap} Reports
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 0.25rem 0' }}>
                  Data Freshness: <strong>{freshness.label}</strong>
                </p>
                <p style={{ margin: 0, color: '#64748B' }}>
                  Coverage: {freshness.lastUpdated ? freshness.lastUpdated.slice(0, 10) : 'No files imported yet'}
                </p>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                <Link href="/imports" style={{ textDecoration: 'none' }}>
                  <Button variant="outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={15} />
                    Go to Import Center <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CommunicationTemplatesTab() {
  const { data, mutate, name } = useWorkspace();
  const templates = (records(data, 'communication_templates') as unknown as CommunicationTemplate[]);

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [activeTemplate, setActiveTemplate] = useState<CommunicationTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [nameInput, setNameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<TemplateCategory>('FIRST_OUTREACH');
  const [channelInput, setChannelInput] = useState<CommunicationChannel>('WHATSAPP');
  const [bodyInput, setBodyInput] = useState('');
  const [isDefaultInput, setIsDefaultInput] = useState(false);
  const [error, setError] = useState('');

  const filtered = templates.filter((t) => categoryFilter === 'All' || t.category === categoryFilter);

  const categories: TemplateCategory[] = [
    'FIRST_OUTREACH',
    'FOLLOW_UP_1',
    'FOLLOW_UP_2',
    'NO_RESPONSE',
    'REAPPROACH',
    'INTERESTED',
    'SAMPLE_FOLLOW_UP',
    'HSL',
    'CAMPAIGN_INVITE',
    'CUSTOM',
  ];

  function openEdit(t: CommunicationTemplate) {
    setActiveTemplate(t);
    setNameInput(t.name);
    setCategoryInput(t.category);
    setChannelInput(t.channel);
    setBodyInput(t.body);
    setIsDefaultInput(Boolean(t.is_default));
    setError('');
    setIsEditing(true);
  }

  function openCreate() {
    setActiveTemplate(null);
    setNameInput('');
    setCategoryInput('FIRST_OUTREACH');
    setChannelInput('WHATSAPP');
    setBodyInput('Hi {{creator_name}}, would you be open to an activation on {{marketplace}}?');
    setIsDefaultInput(false);
    setError('');
    setIsCreating(true);
  }

  function insertTag(tag: string) {
    setBodyInput((prev) => prev + ' ' + tag);
  }

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const validation = validateTemplateBody(bodyInput);
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      return;
    }

    try {
      if (isEditing && activeTemplate) {
        const { updatedTemplate, versionRecord } = prepareTemplateUpdate(
          activeTemplate,
          bodyInput,
          name || 'System'
        );

        const finalRecord: CommunicationTemplate = {
          ...updatedTemplate,
          name: nameInput.trim(),
          category: categoryInput,
          channel: channelInput,
          marketplace: activeTemplate.marketplace || 'Multi-platform',
          status: activeTemplate.status || 'Active',
          is_default: isDefaultInput,
        };

        await mutate([
          { table: 'communication_templates', record: finalRecord },
          { table: 'communication_template_versions', record: versionRecord },
        ]);

        toast.success(`Template updated to v${finalRecord.current_version}`);
        setIsEditing(false);
      } else if (isCreating) {
        const templateId = crypto.randomUUID();
        const nowIso = new Date().toISOString();

        const newTemplate: CommunicationTemplate = {
          id: templateId,
          name: nameInput.trim(),
          status: 'Active',
          category: categoryInput,
          channel: channelInput,
          marketplace: 'Multi-platform',
          body: bodyInput,
          current_version: 1,
          is_default: isDefaultInput,
          created_by: name || 'System',
          created_at: nowIso,
          updated_at: nowIso,
        };

        const firstVersion: CommunicationTemplateVersion = {
          id: crypto.randomUUID(),
          name: `${newTemplate.name} v1`,
          status: 'Active',
          template_id: templateId,
          version: 1,
          body: bodyInput,
          created_by: name || 'System',
          created_at: nowIso,
        };

        await mutate([
          { table: 'communication_templates', record: newTemplate },
          { table: 'communication_template_versions', record: firstVersion },
        ]);

        toast.success('New communication template created');
        setIsCreating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold">Communication Templates & Versioning</h3>
          <p className="text-xs text-muted-foreground">
            Standardized message templates with dynamic placeholders and full version audit trail.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={15} /> Create New Template
        </Button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            categoryFilter === 'All'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted text-muted-foreground'
          }`}
          onClick={() => setCategoryFilter('All')}
        >
          All Categories ({templates.length})
        </button>
        {categories.map((cat) => {
          const count = templates.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                categoryFilter === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              }`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="panel detail-panel flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    {t.name}
                    {t.is_default && (
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                        Default
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">{t.category}</span>
                    <span>·</span>
                    <span>{t.channel}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Layers size={11} /> v{t.current_version}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                  <Edit size={14} className="mr-1" /> Edit
                </Button>
              </div>
              <div className="bg-muted/40 p-3 rounded-md text-xs font-mono whitespace-pre-wrap leading-relaxed border my-3 text-muted-foreground">
                {t.body}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-2 mt-2">
              <span>Updated: {t.updated_at ? t.updated_at.slice(0, 10) : t.created_at.slice(0, 10)}</span>
              <span>Author: {t.updated_by || t.created_by || 'System'}</span>
            </div>
          </div>
        ))}

        {!filtered.length && (
          <div className="col-span-full panel detail-panel text-center py-8 text-muted-foreground">
            <MessageCircle size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No templates found in category &quot;{categoryFilter}&quot;.</p>
          </div>
        )}
      </div>

      {/* Sheet for Create / Edit */}
      {(isEditing || isCreating) && (
        <Sheet open onOpenChange={() => { setIsEditing(false); setIsCreating(false); }}>
          <SheetContent className="entity-sheet sm:max-w-[540px]">
            <SheetHeader>
              <SheetTitle>{isEditing ? `Edit Template (v${activeTemplate?.current_version})` : 'Create New Template'}</SheetTitle>
              <SheetDescription>
                Editing an existing template auto-increments the version counter and stores historical version audit.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSave} className="entity-form mt-4">
              <label htmlFor="tpl-name">
                Template Name
                <Input
                  id="tpl-name"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Standard First Outreach"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  Category
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value as TemplateCategory)}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Channel
                  <select
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value as CommunicationChannel)}
                  >
                    {['WhatsApp', 'Email', 'Shopee Chat', 'TikTok Chat'].map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="tpl-body" className="m-0">Template Body</label>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Tag size={11} /> Click tag to insert
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SUPPORTED_PLACEHOLDERS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertTag(tag)}
                      className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-[11px] font-mono border"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
                <Textarea
                  id="tpl-body"
                  required
                  rows={6}
                  value={bodyInput}
                  onChange={(e) => setBodyInput(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  id="tpl-default"
                  type="checkbox"
                  checked={isDefaultInput}
                  onChange={(e) => setIsDefaultInput(e.target.checked)}
                />
                <label htmlFor="tpl-default" className="text-xs text-muted-foreground cursor-pointer m-0">
                  Set as default template for category &quot;{categoryInput}&quot;
                </label>
              </div>

              {error && <p role="alert" className="error-banner">{error}</p>}

              <div className="form-footer mt-6">
                <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setIsCreating(false); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? `Save & Increment to v${(activeTemplate?.current_version || 1) + 1}` : 'Create Template'}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

function GeminiAISettingsTab() {
  const { role } = useWorkspace();
  const [status, setStatus] = useState<{
    provider: string;
    isConfigured: boolean;
    model: string;
    features: {
      outreachDraft: boolean;
      creatorInsight: boolean;
      dailyBrief: boolean;
      reportNarrative: boolean;
      askAffiliateOS: boolean;
    };
    usage: {
      requestsToday: number;
      requestsThisMonth: number;
      estimatedTokens: number;
    };
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    model: string;
    latencyMs: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    void fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => setStatus(data as NonNullable<typeof status>))
      .catch(() => {});
  }, []);

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/status', { method: 'POST' });
      const json = (await res.json()) as { success: boolean; model: string; latencyMs: number; message: string };
      setTestResult(json);
      if (json.success) {
        toast.success(json.message);
      } else {
        toast.error(json.message);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="p-4 rounded-xl border border-blue-900/40 bg-blue-950/10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-100 text-sm">Google Gemini AI Copilot</h3>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium border ${
                status?.isConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {status?.isConfigured ? 'Configured' : 'Not Configured (Demo / Test Mode)'}
            </span>
          </div>
          {role === 'Admin' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing}
              className="text-xs h-7"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Gemini operates as an assistive intelligence layer for creator outreach drafts, performance insights, daily briefings, report narratives, and constrained workspace Q&A. All deterministic calculations, business rules, and metrics remain the sole ground truth.
        </p>
      </div>

      {testResult && (
        <div
          className={`p-3 rounded-lg border text-xs ${
            testResult.success
              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
              : 'bg-red-950/20 border-red-900/40 text-red-200'
          }`}
        >
          <div className="font-semibold mb-0.5">
            {testResult.success ? '✓ Connectivity Test Succeeded' : '✗ Connectivity Test Failed'}
          </div>
          <p>{testResult.message}</p>
          <div className="text-[11px] text-slate-400 mt-1">
            Model: {testResult.model} · Latency: {testResult.latencyMs}ms
          </div>
        </div>
      )}

      {/* Model & Security Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel p-4 space-y-3">
          <h4 className="font-semibold text-xs text-slate-200 uppercase tracking-wider">Model Configuration</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Provider</span>
              <span className="font-medium text-slate-200">{status?.provider || 'Google Gemini'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Active Model</span>
              <span className="font-mono text-slate-200">{status?.model || 'gemini-2.5-flash'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">API Key Secret</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {status?.isConfigured ? 'GEMINI_API_KEY (Protected Server-side)' : 'Not set in environment'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Structured Output</span>
              <span className="text-emerald-400 font-medium">Zod Server Schema Validation</span>
            </div>
          </div>
        </div>

        <div className="panel p-4 space-y-3">
          <h4 className="font-semibold text-xs text-slate-200 uppercase tracking-wider">Usage & Safety Controls</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Requests Today</span>
              <span className="font-medium text-slate-200">{status?.usage?.requestsToday ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Requests This Month</span>
              <span className="font-medium text-slate-200">{status?.usage?.requestsThisMonth ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Estimated Tokens</span>
              <span className="font-medium text-slate-200 font-mono">{status?.usage?.estimatedTokens ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Rate Limit</span>
              <span className="text-slate-300">30 requests / min (2s duplicate guard)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Capabilities Matrix */}
      <div className="panel p-4 space-y-3">
        <h4 className="font-semibold text-xs text-slate-200 uppercase tracking-wider">Active Copilot Features</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">Outreach Assistant</span>
              <span className="text-emerald-400 text-[11px] font-semibold">Enabled</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Drafts personalized messages in Communication Drawer with selectable tones. Strictly manual-send via WhatsApp.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">Performance Insights</span>
              <span className="text-emerald-400 text-[11px] font-semibold">Enabled</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Summarizes 7-day GMV trends, positive drivers, and risk signals on creator profile. Deterministic numbers first.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">Daily Operational Brief</span>
              <span className="text-emerald-400 text-[11px] font-semibold">Enabled</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Executive morning summary on Dashboard highlighting P0/P1 bottlenecks and H-2 data coverage status.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">Report Narrative Assistant</span>
              <span className="text-emerald-400 text-[11px] font-semibold">Enabled</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Generates What Went Well, Issues, and Next Actions from structured report datasets before finalization.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">Ask AffiliateOS</span>
              <span className="text-emerald-400 text-[11px] font-semibold">Enabled</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Constrained natural language Q&A assistant with validated entity references and data freshness limits.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">Safety & Privacy</span>
              <span className="text-emerald-400 text-[11px] font-semibold">Active</span>
            </div>
            <p className="text-[11px] text-slate-400">
              PII sanitization (no phone/emails sent to AI), prompt injection defense, and zero autonomous mutation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


