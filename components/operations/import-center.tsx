'use client';
import { fileFingerprint, normalizeReportDetailed, applyImportedRows } from '@/lib/imports/normalize';
import { todayISO, shiftDate } from '@/lib/operations/engine';
import { readReport } from '@/lib/imports/read-file';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { detectMapping, mappings, sourceSemantics, validateRows, type RawRow } from '@/lib/imports/validation';
import type { ImportJob } from '@/types/domain';
import { toast } from 'sonner';
import { preserveDemoFile, readDemoFile } from '@/lib/data/demo-files';
export function ImportCenter({ market }: { market?: 'TikTok' | 'Shopee' }) {
  const { data, setData, demo, role, name } = useWorkspace();
  const [file, setFile] = useState<File | null>(null),
    [rows, setRows] = useState<RawRow[]>([]),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [step, setStep] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const canImport = ['Admin','Affiliate Manager','Analyst'].includes(role);
  const validation = market
    ? validateRows(rows, mapping, market)
    : { errors: [], warnings: [], issues: [], valid: [], skipped: 0 };
  const jobs = data.imports.filter((j) => !market || j.marketplace === market);
  async function readFile(f: File) {
    setError('');
    setRows([]);
    setStep(0);
    if (!/\.(csv|xlsx)$/i.test(f.name)) {
      setError('File format not supported. Choose a CSV or XLSX file.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError(
        'Files must be smaller than 50 MB. Split larger reports into separate files.',
      );
      return;
    }
    setBusy(true);
    try {
      const parsed = await readReport(f, market);
      setFile(f);
      setRows(parsed);
      const headers = Object.keys(parsed[0]);
      const detected=detectMapping(headers,market!);
      detected.__campaign_id=data.entities.campaigns.find(c=>c.marketplace===market||c.marketplace==='Multi-platform')?.id||'';
      setMapping(detected);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this file.');
    } finally {
      setBusy(false);
    }
  }
  async function stage() {
    if (!file || !market) return;
    setBusy(true);
    setError('');
    try {
      const job: ImportJob = {
        id: crypto.randomUUID(),
        marketplace: market,
        filename: file.name,
        created_at: new Date().toISOString(),
        rows: rows.length,
        successful_rows: 0,
        failed_rows: rows.length - validation.valid.length,
        status: validation.issues.length ? 'Completed With Warnings' : 'Completed',
        file_hash: await fileFingerprint(file),
        mapping,
        raw_rows: rows,
        errors: validation.errors,
        warnings: validation.warnings,
        source_type: market+' Payment Order',
        sales_metric: sourceSemantics[market],
      };
      const detail = normalizeReportDetailed(data, market, rows, mapping, job);
      if(!detail.normalized.length) throw Error('No matched valid rows are ready to process. Resolve creator and campaign mappings first.');
      job.successful_rows=detail.validRows;
      job.failed_rows=detail.skippedRows;
      job.status=detail.issues.length?'Completed With Warnings':'Completed';
      job.errors=detail.issues.filter(i=>i.severity==='ERROR').map(i=>`Row ${i.row}: ${i.message}`);
      job.warnings=detail.issues.filter(i=>i.severity==='WARNING').map(i=>`Row ${i.row}: ${i.message}`);
      if (demo) await preserveDemoFile(job.id, file);
      if (!demo) {
        const payload = new FormData();
        payload.append('file', file);
        payload.append('marketplace', market);
        payload.append('mapping', JSON.stringify(mapping));
        payload.append('rows', JSON.stringify(rows));
        const result = await fetch('/api/imports', {
          method: 'POST',
          body: payload,
        });
        const value = (await result.json()) as {
          error?: string;
          job?: ImportJob;
        };
        if (!result.ok) throw Error(value.error || 'Could not save import.');
        if (value.job) Object.assign(job, value.job);
      }
      setData({
        ...applyImportedRows(data, job, detail.normalized),
        activity: [
          {
            id: crypto.randomUUID(),
            action: market + ' import completed',
            entity_type: 'imports',
            entity_id: job.id,
            user: name,
            created_at: job.created_at,
          },
          ...data.activity,
        ],
      });
      setStep(3);
      toast.success('Import completed · marketplace performance updated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save import.');
    } finally {
      setBusy(false);
    }
  }
  function sample() {
    if (!market) return;
    const fields = mappings[market].filter(f=>f.key!=='order_id').map((f) => f.key);
    const acc = (
      market === 'TikTok' ? data.tiktok_accounts : data.shopee_accounts
    )[0];
    const values: Record<string, string> = {
      date: shiftDate(todayISO(), -2),
      username: acc?.username || 'creatorname',
      campaign_id: data.entities.campaigns.find(c=>c.marketplace===market||c.marketplace==='Multi-platform')?.id || '',
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
    const blob = new Blob(
      [fields.join(',') + '\n' + fields.map((k) => values[k]).join(',')],
      { type: 'text/csv' },
    );
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
          <p>Reliable performance starts with traceable data.</p>
        </div>
        {market && (
          <Button variant="outline" onClick={sample}>
            <Download size={14} />
            Download CSV template
          </Button>
        )}
      </div>
      {!market ? (
        <div className="marketplace-grid">
          {(['TikTok', 'Shopee'] as const).map((m) => (
            <Link
              href={'/imports/' + m.toLowerCase()}
              className="panel import-option"
              key={m}
            >
              <PlatformIcon market={m} />
              <h2>Import {m} data</h2>
              <p>
                {m === 'TikTok'
                  ? 'Creator performance, videos, live sessions, and orders.'
                  : 'Affiliate orders, product clicks, conversions, and sales.'}
              </p>
              <div className="flex items-center justify-between mt-6">
                <span className="text-xs text-muted-foreground">
                  CSV & XLSX · Up to 50 MB
                </span>
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="panel mb-6">
          <div className="import-steps">
            {['Upload file', 'Preview & map', 'Validate & normalize', 'Processed'].map(
              (s, i) => (
                <span
                  className={
                    step === i ? 'current' : step > i ? 'complete' : ''
                  }
                  key={s}
                >
                  <b>{step > i ? <Check size={12} /> : i + 1}</b>
                  {s}
                  {i < 3 && <ArrowRight size={12} />}
                </span>
              ),
            )}
          </div>
          <div className="import-body">
            {step === 0 ? (
              <>
                <input
                  type="file"
                  ref={input}
                  accept=".csv,.xlsx"
                  className="sr-only"
                  aria-label={'Upload ' + market + ' file'}
                  onChange={(e) =>
                    e.target.files?.[0] && readFile(e.target.files[0])
                  }
                />
                <button
                  className="upload-zone"
                  disabled={!canImport || busy}
                  onClick={() => input.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (canImport && e.dataTransfer.files[0])
                      void readFile(e.dataTransfer.files[0]);
                  }}
                >
                  {busy ? (
                    <LoaderCircle className="animate-spin" size={28} />
                  ) : (
                    <Upload size={28} />
                  )}
                  <strong>
                    {busy
                      ? 'Reading your report…'
                      : 'Drop your ' + market + ' report here'}
                  </strong>
                  <span>or click to browse your files</span>
                  <small>CSV or XLSX · Maximum 50 MB · 50,000 rows</small>
                </button>
                {!canImport && (
                  <div className="info-notice">
                    Your role has read-only access to imports.
                  </div>
                )}
              </>
            ) : step === 1 ? (
              <>
                <div className="file-summary">
                  <FileSpreadsheet size={24} />
                  <div>
                    <strong>{file?.name}</strong>
                    <small>
                      {rows.length} rows detected ·{' '}
                      {Object.keys(rows[0] || {}).length} columns
                    </small>
                  </div>
                  <Button
                    variant="outline"
                    className="ml-auto"
                    onClick={() => setStep(0)}
                  >
                    Change file
                  </Button>
                </div>
                <div className="info-notice">Detected schema: {market} Payment Order · Metric: {sourceSemantics[market]}. Original rows remain unchanged.</div>
                <h2 className="mb-4">Preview</h2>
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
                <h2 className="mt-7 mb-2">Map {market} columns</h2>
                <p className="text-xs text-muted-foreground mb-5">
                  Match each destination field to a column in your report.
                  Amounts use plain IDR numbers.
                </p>
                <div className="mapping-row mb-4">
                  <span>Default internal campaign <span className="text-blue-600">*</span></span><ArrowRight size={13}/>
                  <Choice label="Default campaign" value={mapping.__campaign_id||''} onChange={v=>setMapping({...mapping,__campaign_id:v})} options={[{value:'',label:'Choose campaign'},...data.entities.campaigns.filter(c=>c.marketplace===market||c.marketplace==='Multi-platform').map(c=>({value:c.id,label:c.name}))]}/>
                </div>
                <div className="mapping-grid">
                  {mappings[market].map((f) => (
                    <div className="mapping-row" key={f.key}>
                      <label>
                        {f.label}
                        {f.required && (
                          <span className="text-blue-600"> *</span>
                        )}
                      </label>
                      <ArrowRight size={13} />
                      <Choice
                        label={f.label}
                        value={mapping[f.key] || ''}
                        onChange={(v) => setMapping({ ...mapping, [f.key]: v })}
                        options={[
                          { value: '', label: 'Not mapped' },
                          ...Object.keys(rows[0]).map((v) => ({
                            value: v,
                            label: v,
                          })),
                        ]}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={() => setStep(2)}>
                    Validate file <ArrowRight size={15} />
                  </Button>
                </div>
              </>
            ) : step === 2 ? (
              <>
                <div className="validation-heading">
                  <ShieldCheck size={28} />
                  <div>
                    <h2>Validation complete</h2>
                    <p>
                      {validation.valid.length} of {rows.length} rows pass field
                      validation.
                    </p>
                  </div>
                </div>
                {validation.errors.length > 0 && (
                  <div className="error-banner">
                    <strong>
                      {validation.errors.length} issues need review
                    </strong>
                    <ul className="mt-3 space-y-2">
                      {validation.errors.slice(0, 15).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.warnings.length > 0 && <div className="info-notice"><strong>{validation.warnings.length} warnings</strong><p>Excluded, unmatched, or attention-required rows will not be attached silently.</p></div>}
                {validation.issues.length>0&&<div className="ops-scroll"><table className="ops-table"><thead><tr><th>Level</th><th>Row</th><th>Field</th><th>Source value</th><th>Issue</th><th>Suggested action</th></tr></thead><tbody>{validation.issues.slice(0,50).map((i,n)=><tr key={n}><td><Status value={i.severity}/></td><td>{i.row}</td><td>{i.field}</td><td>{i.sourceValue||'—'}</td><td>{i.message}</td><td>{i.suggestedAction}</td></tr>)}</tbody></table></div>}
                <div className="info-notice">
                  The original file and raw rows are preserved. Validated records are matched to marketplace accounts and campaigns, then processed together. Duplicate files and overlapping daily records are rejected without changing analytics.
                </div>
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back to mapping
                  </Button>
                  <Button disabled={busy || !canImport || !mapping.__campaign_id || validation.valid.length===0 || validation.issues.some(i=>i.row===1&&i.severity==='ERROR')} onClick={stage}>
                    {busy && (
                      <LoaderCircle className="animate-spin" size={14} />
                    )}
                    Process payment orders
                  </Button>
                </div>
              </>
            ) : (
              <div className="saved-state">
                <span className="saved-check">
                  <Check size={26} />
                </span>
                <h2>Import completed</h2>
                <p>
                  {file?.name} is preserved with its original rows and mapping.
                </p>
                <p>Marketplace performance and draft report metrics are now updated. Finalized reports remain unchanged.</p>
                <Button
                  onClick={() => {
                    setStep(0);
                    setFile(null);
                    setRows([]);
                  }}
                >
                  Upload another file
                </Button>
              </div>
            )}
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
          </div>
        </section>
      )}
      <section className="panel data-panel">
        <div className="panel-heading">
          <h2>Import history</h2>
          <span className="text-xs text-muted-foreground">
            {jobs.length} files
          </span>
        </div>
        {jobs.length ? (
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
                    {j.raw_rows && demo && (
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          try {
                            const original = await readDemoFile(j.id);
                            if (!original)
                              throw Error(
                                'Original file is no longer in this browser.',
                              );
                            const url = URL.createObjectURL(original);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = j.filename;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : 'Download failed',
                            );
                          }
                        }}
                      >
                        Original file
                      </Button>
                    )}
                    {j.raw_rows ? (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          const blob = new Blob(
                            [
                              JSON.stringify(
                                { job: j, raw_rows: j.raw_rows },
                                null,
                                2,
                              ),
                            ],
                            { type: 'application/json' },
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = j.filename + '.audit.json';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download audit
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Seed data
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No imports yet"
            description="Upload your first marketplace report to start organizing your performance data."
          />
        )}
      </section>
    </>
  );
}
