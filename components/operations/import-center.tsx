'use client';

import { fileFingerprint, normalizeReportDetailed, applyImportedRows } from '@/lib/imports/normalize';
import { todayISO, shiftDate } from '@/lib/operations/engine';
import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  LoaderCircle,
  Download,
  Settings,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { PlatformIcon } from '@/components/dashboard/dashboard';
import { Status, Choice, EmptyState } from './shared';
import { mappings, sourceSemantics, validateRows, type RawRow } from '@/lib/imports/validation';
import type { ImportJob } from '@/types/domain';
import { toast } from 'sonner';
import { preserveDemoFile, readDemoFile } from '@/lib/data/demo-files';
import { records } from '@/lib/operations/config';
import type { IntegrationSyncRun } from '@/lib/integrations/types';
import {
  analyzeBatch,
  analyzeFile,
  reconcileOverlappingRows,
  computeWhatChangedSummary,
  getWorkspaceDataCoverage,
  type FileAnalysis,
  type BatchSummary,
  type WhatChangedSummary,
  type ReconciliationResult,
} from '@/lib/imports/automation';

export function ImportCenter({ market }: { market?: 'TikTok' | 'Shopee' }) {
  const { data, setData, demo, role, name } = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyTab, setHistoryTab] = useState<'manual' | 'automated'>('manual');

  // Phase 2.1 File Automation States
  const [batch, setBatch] = useState<BatchSummary | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<FileAnalysis | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);
  const [whatChanged, setWhatChanged] = useState<WhatChangedSummary | null>(null);

  const input = useRef<HTMLInputElement>(null);
  const canImport = ['Admin', 'Affiliate Manager', 'Analyst'].includes(role);

  const activeMarketplace = market || (currentAnalysis?.marketplace !== 'Unknown' ? currentAnalysis?.marketplace as 'TikTok' | 'Shopee' : undefined);

  const validation = activeMarketplace
    ? validateRows(rows, mapping, activeMarketplace)
    : { errors: [], warnings: [], issues: [], valid: [], skipped: 0 };

  const jobs = data.imports.filter((j) => !market || j.marketplace === market);
  const syncRuns = records(data, 'integration_sync_runs') as unknown as IntegrationSyncRun[];

  const shopeeCoverage = getWorkspaceDataCoverage(data, 'Shopee');
  const tiktokCoverage = getWorkspaceDataCoverage(data, 'TikTok');

  /**
   * Handle single or multi-file selection/drop
   */
  async function handleFilesSelected(fileList: FileList | File[]) {
    setError('');
    setWhatChanged(null);
    const filesArray = Array.from(fileList).filter((f) => /\.(csv|xlsx)$/i.test(f.name));

    if (!filesArray.length) {
      setError('No supported CSV or XLSX files were selected.');
      return;
    }

    setBusy(true);
    try {
      if (filesArray.length === 1) {
        const analysis = await analyzeFile(filesArray[0], data);
        setCurrentAnalysis(analysis);
        setFile(analysis.file);
        setRows(analysis.rows);

        const m = market || (analysis.marketplace !== 'Unknown' ? (analysis.marketplace as 'TikTok' | 'Shopee') : 'Shopee');
        setMapping(analysis.mapping);

        if (analysis.rows.length && m) {
          const reconc = reconcileOverlappingRows(analysis.rows, analysis.mapping, m, data);
          setReconciliation(reconc);
        }

        setStep(1);
      } else {
        const batchRes = await analyzeBatch(filesArray, data);
        setBatch(batchRes);
        setStep(10); // Batch summary step
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process dropped files.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Stage and process a single file import
   */
  async function stageImport(targetFile: File, targetRows: RawRow[], targetMapping: Record<string, string>, targetMarket: 'TikTok' | 'Shopee') {
    if (!targetFile || !targetMarket) return;
    setBusy(true);
    setError('');
    const beforeData = data;

    try {
      const validRes = validateRows(targetRows, targetMapping, targetMarket);

      const job: ImportJob = {
        id: crypto.randomUUID(),
        marketplace: targetMarket,
        filename: targetFile.name,
        created_at: new Date().toISOString(),
        rows: targetRows.length,
        successful_rows: 0,
        failed_rows: targetRows.length - validRes.valid.length,
        status: validRes.issues.length ? 'Completed With Warnings' : 'Completed',
        file_hash: await fileFingerprint(targetFile),
        mapping: targetMapping,
        raw_rows: targetRows,
        errors: validRes.errors,
        warnings: validRes.warnings,
        source_type: targetMarket + ' Payment Order',
        sales_metric: sourceSemantics[targetMarket],
      };

      const detail = normalizeReportDetailed(data, targetMarket, targetRows, targetMapping, job);
      if (!detail.normalized.length) throw Error('No matched valid rows are ready to process. Resolve creator and campaign mappings first.');

      job.successful_rows = detail.validRows;
      job.failed_rows = detail.skippedRows;
      job.status = detail.issues.length ? 'Completed With Warnings' : 'Completed';
      job.errors = detail.issues.filter((i) => i.severity === 'ERROR').map((i) => `Row ${i.row}: ${i.message}`);
      job.warnings = detail.issues.filter((i) => i.severity === 'WARNING').map((i) => `Row ${i.row}: ${i.message}`);

      if (demo) await preserveDemoFile(job.id, targetFile);
      if (!demo) {
        const payload = new FormData();
        payload.append('file', targetFile);
        payload.append('marketplace', targetMarket);
        payload.append('mapping', JSON.stringify(targetMapping));
        payload.append('rows', JSON.stringify(targetRows));
        const result = await fetch('/api/imports', {
          method: 'POST',
          body: payload,
        });
        const value = (await result.json()) as { error?: string; job?: ImportJob };
        if (!result.ok) throw Error(value.error || 'Could not save import.');
        if (value.job) Object.assign(job, value.job);
      }

      const updatedData = applyImportedRows(data, job, detail.normalized);
      const afterData = {
        ...updatedData,
        activity: [
          {
            id: crypto.randomUUID(),
            action: targetMarket + ' import completed',
            entity_type: 'imports',
            entity_id: job.id,
            user: name,
            created_at: job.created_at,
          },
          ...data.activity,
        ],
      };

      setData(afterData);

      const whatChangedRes = computeWhatChangedSummary(beforeData, afterData, targetMarket);
      setWhatChanged(whatChangedRes);

      setStep(3);
      toast.success(`${targetMarket} import completed · performance data updated`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save import.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Process all READY files in a multi-file batch
   */
  async function processReadyBatchFiles() {
    if (!batch || !batch.files.length) return;
    setBusy(true);
    setError('');

    let processedCount = 0;
    try {
      for (const a of batch.files) {
        if (a.status === 'READY' && a.marketplace !== 'Unknown') {
          const m = a.marketplace as 'TikTok' | 'Shopee';
          await stageImport(a.file, a.rows, a.mapping, m);
          processedCount++;
        }
      }
      toast.success(`Batch import completed: ${processedCount} file(s) imported successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing batch files.');
    } finally {
      setBusy(false);
    }
  }

  function sample() {
    if (!market) return;
    const fields = mappings[market].filter((f) => f.key !== 'order_id').map((f) => f.key);
    const acc = (market === 'TikTok' ? data.tiktok_accounts : data.shopee_accounts)[0];
    const values: Record<string, string> = {
      date: shiftDate(todayISO(), -2),
      username: acc?.username || 'creatorname',
      campaign_id: data.entities.campaigns.find((c) => c.marketplace === market || c.marketplace === 'Multi-platform')?.id || '',
      product_id: '',
      gmv: '1250000',
      orders: '20',
      units_sold: '25',
      commission: '125000',
      video_count: '2',
      live_count: '0',
      clicks: '1000',
      conversion_rate: '0.02',
    };
    const blob = new Blob([fields.join(',') + '\n' + fields.map((k) => values[k]).join(',')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = market.toLowerCase() + '-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {market && (
        <Link className="back-link" href="/imports">
          <ArrowLeft size={14} />
          Import Center
        </Link>
      )}

      <div className="page-heading">
        <div>
          <div className="eyebrow">DATA OPERATIONS</div>
          <h1>{market ? market + ' imports' : 'Import Center'}</h1>
          <p>Drop raw Shopee or TikTok export files for auto-detection, validation, and canonical normalization.</p>
        </div>
        {market ? (
          <Button variant="outline" onClick={sample}>
            <Download size={14} />
            Download CSV template
          </Button>
        ) : (
          <Link href="/settings/integrations" className={buttonVariants({ variant: 'outline' })}>
            <Settings size={14} />
            Data Sources Settings
          </Link>
        )}
      </div>

      {/* Visual Data Coverage & H-2 Readiness Bar */}
      {!market && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="panel p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <PlatformIcon market="Shopee" />
                Shopee Data Coverage
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${shopeeCoverage.isH2Ready ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                {shopeeCoverage.isH2Ready ? 'H-2 READY' : 'DATA INCOMPLETE'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mb-3">{shopeeCoverage.statusLabel}</div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${shopeeCoverage.isH2Ready ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: shopeeCoverage.isH2Ready ? '100%' : '70%' }}
              />
            </div>
          </div>

          <div className="panel p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <PlatformIcon market="TikTok" />
                TikTok Data Coverage
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${tiktokCoverage.isH2Ready ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                {tiktokCoverage.isH2Ready ? 'H-2 READY' : 'DATA INCOMPLETE'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mb-3">{tiktokCoverage.statusLabel}</div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${tiktokCoverage.isH2Ready ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: tiktokCoverage.isH2Ready ? '100%' : '60%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Smart Drag and Drop Zone */}
      <section className="panel mb-6">
        <div className="import-body">
          {step === 0 ? (
            <>
              <input
                type="file"
                ref={input}
                accept=".csv,.xlsx"
                multiple
                className="sr-only"
                aria-label="Upload marketplace export files"
                onChange={(e) => e.target.files?.length && void handleFilesSelected(e.target.files)}
              />
              <button
                className="upload-zone"
                disabled={!canImport || busy}
                onClick={() => input.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (canImport && e.dataTransfer.files.length) {
                    void handleFilesSelected(e.dataTransfer.files);
                  }
                }}
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" size={28} />
                ) : (
                  <Upload size={28} />
                )}
                <strong>
                  {busy ? 'Analyzing marketplace files…' : 'Drop Shopee or TikTok export files here'}
                </strong>
                <span>or click to browse single or multiple CSV / XLSX files</span>
                <small>Auto-detects marketplace, schema, dates, and campaign context · Up to 50 MB per file</small>
              </button>
              {!canImport && (
                <div className="info-notice mt-3">
                  Your role has read-only access to imports.
                </div>
              )}
            </>
          ) : step === 10 && batch ? (
            /* Multi-File Batch Analysis Review */
            <div>
              <div className="flex items-center justify-between border-b pb-4 mb-5">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Layers size={18} />
                    Multi-File Batch Summary
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Analyzed {batch.totalFiles} file(s) independently. Review status before staging.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => { setStep(0); setBatch(null); }}>
                    Cancel
                  </Button>
                  <Button disabled={busy || batch.readyCount === 0} onClick={processReadyBatchFiles}>
                    {busy && <LoaderCircle className="animate-spin" size={14} />}
                    Import Ready Files ({batch.readyCount})
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="panel p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total Files</div>
                  <div className="text-xl font-bold">{batch.totalFiles}</div>
                </div>
                <div className="panel p-3 text-center border-emerald-500/30">
                  <div className="text-xs text-emerald-400">Ready to Import</div>
                  <div className="text-xl font-bold text-emerald-400">{batch.readyCount}</div>
                </div>
                <div className="panel p-3 text-center border-amber-500/30">
                  <div className="text-xs text-amber-400">Needs Review</div>
                  <div className="text-xl font-bold text-amber-400">{batch.needsReviewCount}</div>
                </div>
                <div className="panel p-3 text-center border-slate-500/30">
                  <div className="text-xs text-muted-foreground">Duplicates</div>
                  <div className="text-xl font-bold text-muted-foreground">{batch.duplicateCount}</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Detected Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.files.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.file.name}</TableCell>
                      <TableCell>{a.marketplace}</TableCell>
                      <TableCell><span className="text-xs font-mono">{a.fileType}</span></TableCell>
                      <TableCell>{a.periodStart && a.periodEnd ? `${a.periodStart} to ${a.periodEnd}` : '—'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${a.confidence === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400' : a.confidence === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                          {a.confidence}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Status value={a.status === 'READY' ? 'Ready' : a.status === 'DUPLICATE' ? 'Duplicate' : a.status === 'NEEDS_REVIEW' ? 'Review Required' : 'Error'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : step === 1 ? (
            /* Single File Auto-Detection & Preview */
            <>
              <div className="file-summary">
                <FileSpreadsheet size={24} />
                <div>
                  <strong>{file?.name}</strong>
                  <small>
                    {rows.length} rows detected · {Object.keys(rows[0] || {}).length} columns
                  </small>
                </div>
                <Button variant="outline" className="ml-auto" onClick={() => setStep(0)}>
                  Change file
                </Button>
              </div>

              {/* Auto-Detection & Confidence Banner */}
              {currentAnalysis && (
                <div className="panel p-4 my-4 border-l-4 border-l-blue-500 bg-blue-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-400" />
                      <strong className="text-sm">Auto-Detected Marketplace Schema</strong>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${currentAnalysis.confidence === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      Confidence: {currentAnalysis.confidence}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-3">
                    <div>
                      <span className="text-muted-foreground">Marketplace:</span>
                      <div className="font-semibold">{currentAnalysis.marketplace}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Report Format:</span>
                      <div className="font-semibold font-mono text-xs">{currentAnalysis.fileType}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Period Coverage:</span>
                      <div className="font-semibold">{currentAnalysis.periodStart && currentAnalysis.periodEnd ? `${currentAnalysis.periodStart} → ${currentAnalysis.periodEnd}` : 'Unknown'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valid Transaction Rows:</span>
                      <div className="font-semibold">{currentAnalysis.validRowsCount} of {currentAnalysis.totalRows}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Schema Drift Warning */}
              {currentAnalysis?.schemaDrift.hasDrift && (
                <div className="error-banner my-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle size={16} />
                    Schema Drift Warning
                  </div>
                  <p className="text-xs mt-1">{currentAnalysis.schemaDrift.warningMessage}</p>
                </div>
              )}

              {/* Reconciliation Preview */}
              {reconciliation && (
                <div className="panel p-3 my-4 bg-muted/20 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <Info size={15} />
                    Overlapping Period Reconciliation:
                  </div>
                  <div className="flex items-center gap-4">
                    <span>New: <strong>+{reconciliation.newCount}</strong></span>
                    <span>Existing Unchanged: <strong>{reconciliation.existingUnchangedCount}</strong></span>
                    <span>Updated: <strong>{reconciliation.updatedCount}</strong></span>
                  </div>
                </div>
              )}

              <h2 className="mb-4">Preview Source Rows</h2>
              <div className="preview-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(rows[0] || {}).map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 4).map((r, i) => (
                      <TableRow key={i}>
                        {Object.values(r).map((v, j) => (
                          <TableCell key={j}>{v}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <h2 className="mt-7 mb-2">Column Mappings</h2>
              <div className="mapping-row mb-4">
                <span>Default internal campaign <span className="text-blue-600">*</span></span>
                <ArrowRight size={13} />
                <Choice
                  label="Default campaign"
                  value={mapping.__campaign_id || ''}
                  onChange={(v) => setMapping({ ...mapping, __campaign_id: v })}
                  options={[
                    { value: '', label: 'Choose campaign' },
                    ...data.entities.campaigns
                      .filter((c) => !activeMarketplace || c.marketplace === activeMarketplace || c.marketplace === 'Multi-platform')
                      .map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>

              {activeMarketplace && (
                <div className="mapping-grid">
                  {mappings[activeMarketplace].map((f) => (
                    <div className="mapping-row" key={f.key}>
                      <label>
                        {f.label}
                        {f.required && <span className="text-blue-600"> *</span>}
                      </label>
                      <ArrowRight size={13} />
                      <Choice
                        label={f.label}
                        value={mapping[f.key] || ''}
                        onChange={(v) => setMapping({ ...mapping, [f.key]: v })}
                        options={[
                          { value: '', label: 'Not mapped' },
                          ...Object.keys(rows[0] || {}).map((v) => ({
                            value: v,
                            label: v,
                          })),
                        ]}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button onClick={() => setStep(2)}>
                  Validate file <ArrowRight size={15} />
                </Button>
              </div>
            </>
          ) : step === 2 ? (
            /* Validation & Final Confirmation Step */
            <>
              <div className="validation-heading">
                <ShieldCheck size={28} />
                <div>
                  <h2>Validation complete</h2>
                  <p>
                    {validation.valid.length} of {rows.length} rows pass field validation.
                  </p>
                </div>
              </div>
              {validation.errors.length > 0 && (
                <div className="error-banner">
                  <strong>{validation.errors.length} issues need review</strong>
                  <ul className="mt-3 space-y-2">
                    {validation.errors.slice(0, 15).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="info-notice">
                  <strong>{validation.warnings.length} warnings</strong>
                  <p>Excluded, unmatched, or attention-required rows will not be attached silently.</p>
                </div>
              )}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back to preview
                </Button>
                <Button
                  disabled={busy || !canImport || !mapping.__campaign_id || validation.valid.length === 0 || !activeMarketplace}
                  onClick={() => file && activeMarketplace && stageImport(file, rows, mapping, activeMarketplace)}
                >
                  {busy && <LoaderCircle className="animate-spin" size={14} />}
                  Confirm & Process Import
                </Button>
              </div>
            </>
          ) : (
            /* Post-Import Saved State & What Changed Summary */
            <div className="saved-state">
              <span className="saved-check">
                <Check size={26} />
              </span>
              <h2>Import completed successfully</h2>
              <p>{file?.name} is preserved with its original source evidence and audit fingerprint.</p>

              {/* "What Changed?" Intelligence Card */}
              {whatChanged && (
                <div className="panel p-4 my-4 bg-emerald-500/5 border border-emerald-500/20 text-left w-full max-w-xl mx-auto">
                  <div className="flex items-center gap-2 font-semibold text-sm text-emerald-400 mb-2">
                    <Sparkles size={16} />
                    What Changed in AffiliateOS?
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-300">
                    {whatChanged.summaryBulletPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mt-4">
                <Button
                  onClick={() => {
                    setStep(0);
                    setFile(null);
                    setRows([]);
                    setWhatChanged(null);
                    setCurrentAnalysis(null);
                  }}
                >
                  Upload another file
                </Button>
                <Link href="/reports" className={buttonVariants({ variant: 'outline' })}>
                  Prepare Report <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner mt-4" role="alert">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Import History Table */}
      <section className="panel data-panel">
        <div className="panel-heading flex items-center justify-between border-b pb-4 mb-4">
          <div className="flex items-center gap-6">
            <button
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                historyTab === 'manual'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setHistoryTab('manual')}
            >
              Manual File Imports ({jobs.length})
            </button>
            <button
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                historyTab === 'automated'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setHistoryTab('automated')}
            >
              Automated Sync Runs ({syncRuns.length})
            </button>
          </div>
        </div>

        {historyTab === 'manual' ? (
          jobs.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File name</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet size={17} />
                        {j.filename}
                      </div>
                    </TableCell>
                    <TableCell>{j.marketplace}</TableCell>
                    <TableCell>{j.created_at.slice(0, 10)}</TableCell>
                    <TableCell>{j.rows}</TableCell>
                    <TableCell>
                      <Status value={j.status} />
                    </TableCell>
                    <TableCell>
                      {!demo && (
                        <a
                          className={buttonVariants({ variant: 'ghost' })}
                          href={`/api/imports/${j.id}/file`}
                        >
                          Original file
                        </a>
                      )}
                      {j.raw_rows && demo && (
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              const original = await readDemoFile(j.id);
                              if (!original) throw Error('Original file is no longer in this browser.');
                              const url = URL.createObjectURL(original);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = j.filename;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Download failed');
                            }
                          }}
                        >
                          Original file
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No imports yet"
              description="Drop your first Shopee or TikTok export file to start organizing your performance data."
            />
          )
        ) : (
          syncRuns.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Capability</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Records (Fetched / Norm)</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncRuns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium capitalize">{r.provider}</TableCell>
                    <TableCell>{r.capability}</TableCell>
                    <TableCell>{r.started_at ? String(r.started_at).slice(0, 16).replace('T', ' ') : '—'}</TableCell>
                    <TableCell>{r.fetched_records} / {r.normalized_records}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted font-mono">{r.trigger_type}</span>
                    </TableCell>
                    <TableCell>
                      <Status value={r.status === 'SUCCEEDED' ? 'Completed' : r.status === 'FAILED' ? 'Failed' : r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No automated sync runs yet"
              description="Automated connector sync runs will appear here as scheduled or background jobs execute."
            />
          )
        )}
      </section>
    </>
  );
}
