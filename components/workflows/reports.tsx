'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { Heading, MetricCards, OperationsTable, OpForm, NewReportButton } from './primitives';
import { records, canOperate } from '@/lib/operations/config';
import { formatDateID, metrics } from '@/lib/operations/engine';
import { money } from '@/lib/data/metrics';
import { toast } from 'sonner';
import { metricConfirmationStatus, snapshotMetricStatus } from '@/lib/reporting/business-rules';
import { templateFor } from '@/lib/reporting/templates';
import { buildReportDataset, type ReportDataset } from '@/lib/reporting/datamart';
import { getWorkspaceDataCoverage } from '@/lib/imports/automation';
import { PlatformIcon } from '@/components/dashboard/dashboard';
import { CheckCircle2, AlertTriangle, FileSpreadsheet, Download, Sparkles, Eye } from 'lucide-react';

type SourceLineage = {
  id: string;
  marketplace: string;
  filename?: string;
  source_type?: string;
  sales_metric?: string;
  period_start?: string;
  period_end?: string;
  status: string;
};

export function Reports({ id, monthly = false }: { id?: string; monthly?: boolean }) {
  const { data, role, finalize, mutate } = useWorkspace();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiNarrativeModal, setAiNarrativeModal] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiNarrativeDraft, setAiNarrativeDraft] = useState<{
    key_highlights: string[];
    what_went_well: string[];
    issues: string[];
    next_actions: string[];
    limitations: string[];
  } | null>(null);
  const activeStep = 3;

  const report = id ? records(data, 'reports').find((r) => r.id === id) : undefined;

  if (id && !report)
    return (
      <div className="panel ops-empty">
        <h2>Report not found</h2>
        <Link href="/reports">Back to reports</Link>
      </div>
    );

  if (!report)
    return (
      <>
        <Heading
          title={monthly ? 'Monthly reports' : 'Reporting workspace'}
          description="Build weekly narratives from processed metrics. Finalize to preserve a stable snapshot."
        >
          {canOperate(role, 'reports') && <NewReportButton monthly={monthly} />}
        </Heading>
        <OperationsTable
          table="reports"
          hideCreate
          rows={records(data, 'reports').filter((r) => !monthly || r.report_type === 'Monthly Recap')}
          render={(key, r) => (key === 'name' ? <Link href={'/reports/' + r.id}>{r.name}</Link> : undefined)}
          actions={(r) => (
            <Link href={'/reports/' + r.id} className="ops-text-link">
              Open report →
            </Link>
          )}
        />
      </>
    );

  const snapshot = records(data, 'report_snapshots').find((s) => s.report_id === id);
  const frozen = snapshot ? JSON.parse(String(snapshot.snapshot_json)) : null;

  const dataset: ReportDataset = frozen?.reportDataset || buildReportDataset({ report, data });

  const period = {
    start: String(report.period_start),
    end: String(report.period_end) < String(report.cutoff_date) ? String(report.period_end) : String(report.cutoff_date),
    cutoff: String(report.cutoff_date),
  };
  const filter = {
    campaign_id: report.campaign_id ? String(report.campaign_id) : undefined,
    client_id: report.client_id ? String(report.client_id) : undefined,
  };

  const m = frozen?.metrics || metrics(data, period, String(report.marketplace), filter);
  const sources: SourceLineage[] = frozen?.sources || data.imports.filter((job) => m.sourceImportIds.includes(job.id));
  const template = templateFor(String(report.report_type), String(report.marketplace));
  const rules = records(data, 'business_rules');

  async function handleGenerateNarrative() {
    setAiDraftLoading(true);
    try {
      const res = await fetch('/api/ai/report-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id, language: 'id' }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        data?: {
          key_highlights: string[];
          what_went_well: string[];
          issues: string[];
          next_actions: string[];
          limitations: string[];
        };
      };
      if (!res.ok) throw new Error(json.error || 'Failed to draft narratives');
      if (json.data) {
        setAiNarrativeDraft(json.data);
        setAiNarrativeModal(true);
        toast.success('Generated AI report narrative draft');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAiDraftLoading(false);
    }
  }

  async function handleApplyNarrativeDraft() {
    if (!aiNarrativeDraft || !report) return;
    setBusy(true);
    try {
      await mutate([
        {
          table: 'reports',
          record: {
            ...report,
            what_went_well: aiNarrativeDraft.what_went_well.join('\n'),
            issues: aiNarrativeDraft.issues.join('\n'),
            next_action: aiNarrativeDraft.next_actions.join('\n'),
          },
        },
      ]);
      toast.success('Applied AI draft to report narratives');
      setAiNarrativeModal(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shopeeCoverage = getWorkspaceDataCoverage(data, 'Shopee', period.cutoff);
  const tiktokCoverage = getWorkspaceDataCoverage(data, 'TikTok', period.cutoff);

  const isMarketplaceH2Ready =
    report.marketplace === 'Shopee'
      ? shopeeCoverage.isH2Ready
      : report.marketplace === 'TikTok'
        ? tiktokCoverage.isH2Ready
        : shopeeCoverage.isH2Ready && tiktokCoverage.isH2Ready;

  const ruleStatus = (metricId: string) =>
    frozen
      ? snapshotMetricStatus(frozen, metricId)
      : metricConfirmationStatus(rules, {
          canonicalMetricId: metricId,
          marketplace: String(report.marketplace),
          clientId: report.client_id ? String(report.client_id) : undefined,
          templateId: template.id,
          asOf: period.end,
        });

  const gmvMetric =
    report.marketplace === 'Shopee'
      ? 'shopee.affiliate_gmv'
      : report.marketplace === 'TikTok'
        ? 'tiktok.affiliate_gmv'
        : 'common.affiliate_gmv';

  const isFinal = Boolean(snapshot);
  const canFinalize = canOperate(role, 'reports') && !isFinal;

  const previewSlides = [
    { slideIndex: 16, title: 'Affiliate KPI Summary', classification: 'SUPPORTED' },
    { slideIndex: 17, title: 'Funnel Split', classification: 'PARTIALLY_SUPPORTED' },
    { slideIndex: 18, title: 'Brand Performance', classification: 'SUPPORTED' },
    { slideIndex: 19, title: 'Rank-Up Program', classification: 'SOURCE_UNAVAILABLE' },
    { slideIndex: 20, title: 'Peak Day Comparison', classification: 'SUPPORTED' },
    { slideIndex: 21, title: 'Snapshot & Narratives', classification: 'SUPPORTED' },
    { slideIndex: 31, title: 'Q4 Activation Plan', classification: 'PARTIALLY_SUPPORTED' },
  ];

  const supportedSlidesCount = previewSlides.filter((s) => s.classification === 'SUPPORTED').length;
  const totalSlidesCount = previewSlides.length;

  return (
    <>
      <Heading title={report.name} description={`${report.report_type} · ${report.marketplace} · ${formatDateID(period.start)} to ${formatDateID(period.end)}`}>
        <div className="flex items-center gap-2">
          {canOperate(role, 'reports') && (
            <Button variant="outline" onClick={() => setEdit(true)}>
              Edit details
            </Button>
          )}
          {!isFinal && (
            <a href={`/api/reports/${id}/export?format=xlsx`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-700 hover:bg-slate-800 transition-colors">
              <FileSpreadsheet size={14} /> Download Excel
            </a>
          )}
          {!isFinal && (
            <a href={`/api/reports/${id}/export?format=pptx`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-700 hover:bg-slate-800 transition-colors">
              <Download size={14} /> Download PPTX
            </a>
          )}
          {canFinalize && (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await finalize(String(id));
                  toast.success('Report finalized · frozen snapshot created');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Finalization failed');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Finalize report
            </Button>
          )}
        </div>
      </Heading>

      {/* Streamlined Report Preparation Flow Indicator */}
      <div className="panel p-3 mb-6 bg-slate-900/40 border border-slate-800">
        <div className="flex items-center justify-between text-xs overflow-x-auto gap-2">
          {[
            '1. Select Profile',
            '2. Define Period',
            '3. Coverage Check',
            '4. Draft Dataset',
            '5. Review Metrics',
            '6. Add Narratives',
            '7. PPT Preview',
            '8. Finalize',
            '9. Export',
          ].map((stepName, i) => (
            <div
              key={stepName}
              className={`flex items-center gap-1 font-semibold px-2 py-1 rounded transition-colors ${
                i + 1 === activeStep
                  ? 'bg-blue-500 text-white'
                  : i + 1 < activeStep || isFinal
                    ? 'text-emerald-400'
                    : 'text-slate-400'
              }`}
            >
              <span>{stepName}</span>
              {i < 8 && <span className="text-slate-600 font-normal">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Report Readiness Summary Widget */}
      <section className="panel ops-panel mb-6">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-blue-400" />
            <h2 className="text-base font-semibold">Report Readiness Summary</h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isFinal
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : isMarketplaceH2Ready
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {isFinal
              ? 'FINALIZED SNAPSHOT'
              : isMarketplaceH2Ready
                ? 'READY FOR REVIEW'
                : 'DATA INCOMPLETE (H-2 Missing)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="panel p-3 bg-muted/20">
            <div className="text-muted-foreground mb-1">Shopee Data Status</div>
            <div className="font-semibold flex items-center gap-1.5">
              <PlatformIcon market="Shopee" />
              {shopeeCoverage.isH2Ready ? (
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> H-2 Ready ({shopeeCoverage.coverageEnd})</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={12} /> Incomplete ({shopeeCoverage.coverageEnd || 'No data'})</span>
              )}
            </div>
          </div>

          <div className="panel p-3 bg-muted/20">
            <div className="text-muted-foreground mb-1">TikTok Data Status</div>
            <div className="font-semibold flex items-center gap-1.5">
              <PlatformIcon market="TikTok" />
              {tiktokCoverage.isH2Ready ? (
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> H-2 Ready ({tiktokCoverage.coverageEnd})</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={12} /> Incomplete ({tiktokCoverage.coverageEnd || 'No data'})</span>
              )}
            </div>
          </div>

          <div className="panel p-3 bg-muted/20">
            <div className="text-muted-foreground mb-1">Report Dataset Schema</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 size={12} /> Schema {dataset.schemaVersion}
            </div>
          </div>

          <div className="panel p-3 bg-muted/20">
            <div className="text-muted-foreground mb-1">PPT Slide Readiness</div>
            <div className="font-semibold text-slate-200">
              {supportedSlidesCount} / {totalSlidesCount} Supported Slides
            </div>
          </div>
        </div>
      </section>

      {/* Snapshot / Metrics Overview */}
      <MetricCards
        items={[
          {
            label: 'Affiliate GMV',
            value: money(m.gmv),
            detail: `Metric status: ${ruleStatus(gmvMetric)}`,
          },
          {
            label: 'Orders',
            value: m.orders.toLocaleString(),
            detail: `Units: ${m.units.toLocaleString()}`,
          },
          {
            label: 'Active Affiliates',
            value: m.affiliates.toLocaleString(),
            detail: `Coverage: ${formatDateID(period.start)} to ${formatDateID(period.end)}`,
          },
          {
            label: 'Commission',
            value: money(m.commission),
            detail: `Cutoff: ${formatDateID(period.cutoff)}`,
          },
        ]}
      />

      {/* Slide Preview & PowerPoint Template Specification */}
      <section className="panel ops-panel mb-6">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Eye size={17} className="text-blue-400" />
              PPT Slide Preview & Template Integration
            </h2>
            <p className="text-xs text-muted-foreground">
              {template.name} ({template.id}) · 16:9 widescreen · Slide 19 is SOURCE_UNAVAILABLE
            </p>
          </div>
          {!isFinal && (
            <a href={`/api/reports/${id}/export?format=pptx`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-700 hover:bg-slate-800 transition-colors">
              <Download size={13} /> Export PowerPoint
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {previewSlides.map((s) => (
            <div key={s.slideIndex} className="panel p-4 flex flex-col justify-between border-slate-800 bg-slate-900/50">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-blue-400">Slide {s.slideIndex}</span>
                  <span
                    className="demo-badge"
                    style={{
                      backgroundColor:
                        s.classification === 'SUPPORTED'
                          ? '#E6F4EA'
                          : s.classification === 'PARTIALLY_SUPPORTED'
                            ? '#FEF7E0'
                            : '#FCE8E6',
                      color:
                        s.classification === 'SUPPORTED'
                          ? '#137333'
                          : s.classification === 'PARTIALLY_SUPPORTED'
                            ? '#B06000'
                            : '#C5221F',
                    }}
                  >
                    {s.classification}
                  </span>
                </div>
                <h3 className="text-sm font-semibold mb-1 text-slate-200">{s.title}</h3>
                {s.slideIndex === 19 && (
                  <p className="text-xs text-red-400 mt-2">
                    Rank-Up Program data is not imported in AffiliateOS. Marked SOURCE_UNAVAILABLE and omitted from export.
                  </p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-muted-foreground">
                <span>Frozen values ready</span>
                <span className="text-blue-400">Preview →</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Lineage & Source Imports */}
      <section className="panel ops-table-panel mb-6">
        <div className="ops-panel-heading">
          <div>
            <h2>Data Lineage & Source Evidence</h2>
            <p>{sources.length} source import{sources.length === 1 ? '' : 's'} contribute to this frozen report period.</p>
          </div>
          <Link href="/imports" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            Open Import Center →
          </Link>
        </div>
        <div className="ops-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Marketplace</th>
                <th>Source File</th>
                <th>Sales Metric</th>
                <th>Covered Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td>{source.marketplace}</td>
                  <td>
                    <Link href="/imports" className="font-semibold hover:underline flex items-center gap-1.5">
                      <FileSpreadsheet size={14} />
                      {source.filename || source.source_type || 'Payment Order'}
                    </Link>
                  </td>
                  <td>{source.sales_metric || 'Processed affiliate sales'}</td>
                  <td>
                    {source.period_start && source.period_end
                      ? `${formatDateID(source.period_start)} — ${formatDateID(source.period_end)}`
                      : 'All dates in file'}
                  </td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      {source.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sources.length && <div className="ops-empty">No imported rows contribute to this period.</div>}
        </div>
      </section>

      {/* Executive Narratives */}
      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="text-sm font-semibold">Executive Narratives</h2>
        {!isFinal && canOperate(role, 'reports') && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateNarrative}
            disabled={aiDraftLoading}
            className="text-xs h-7 gap-1 border-blue-800 text-blue-300 hover:bg-blue-950/40"
          >
            <span>✨</span> {aiDraftLoading ? 'Drafting...' : 'Draft with Gemini'}
          </Button>
        )}
      </div>

      <div className="ops-narratives">
        {[
          ['what_went_well', 'What went well'],
          ['issues', 'Issues'],
          ['next_action', 'Next action'],
        ].map(([key, label]) => (
          <section className="panel ops-panel" key={key}>
            <h2>{label}</h2>
            <p className="ops-narrative">
              {String((frozen?.narrative || report)[key] || 'No narrative added yet.')}
            </p>
          </section>
        ))}
      </div>

      {aiNarrativeModal && aiNarrativeDraft && (
        <Sheet open onOpenChange={setAiNarrativeModal}>
          <SheetContent className="entity-sheet sm:max-w-[560px] overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>AI Report Narrative Draft</SheetTitle>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/60 text-blue-300 border border-blue-800">
                  AI Draft
                </span>
              </div>
              <SheetDescription>
                Generated from official structured report metrics. Review and approve before updating report fields.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 text-xs mt-4">
              <div>
                <span className="font-semibold text-slate-300 block mb-1">Key Highlights</span>
                <ul className="list-disc list-inside space-y-1 text-slate-200 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {aiNarrativeDraft.key_highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1">What Went Well</span>
                <ul className="list-disc list-inside space-y-1 text-slate-200 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {aiNarrativeDraft.what_went_well.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1">Issues & Bottlenecks</span>
                <ul className="list-disc list-inside space-y-1 text-slate-200 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {aiNarrativeDraft.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1">Next Actions</span>
                <ul className="list-disc list-inside space-y-1 text-slate-200 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {aiNarrativeDraft.next_actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>

              {aiNarrativeDraft.limitations.length > 0 && (
                <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                  Limitations: {aiNarrativeDraft.limitations.join(' · ')}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" onClick={() => setAiNarrativeModal(false)}>
                  Discard
                </Button>
                <Button variant="outline" onClick={handleGenerateNarrative} disabled={aiDraftLoading}>
                  Regenerate
                </Button>
                <Button onClick={handleApplyNarrativeDraft} disabled={busy}>
                  Use Draft
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {edit && <OpForm table="reports" record={report} onClose={() => setEdit(false)} />}
    </>
  );
}
