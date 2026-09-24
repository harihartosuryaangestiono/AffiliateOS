'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useWorkspace } from '@/components/layout/workspace-provider';
import {
  records,
  operationConfig,
  canOperate,
  thresholds,
  type OpField,
} from '@/lib/operations/config';
import {
  todayISO,
  periodRange,
  metrics,
  type Period,
} from '@/lib/operations/engine';
import type { RecordData } from '@/types/domain';
import { Status } from '@/components/operations/shared';
import { money } from '@/lib/data/metrics';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
export function Heading({
  eyebrow = 'OPERATIONS',
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="ops-actions">{children}</div>
    </div>
  );
}
export function MetricCards({
  items,
}: {
  items: { label: string; value: ReactNode; detail?: string; href?: string }[];
}) {
  return (
    <div
      className="ops-metrics"
      style={
        { '--metric-count': Math.min(items.length, 6) } as React.CSSProperties
      }
    >
      {items.map((i) => {
        const card = (
          <section className="panel ops-metric">
            <small>{i.label}</small>
            <strong>{i.value}</strong>
            {i.detail && <span>{i.detail}</span>}
          </section>
        );
        return i.href ? (
          <Link className="ops-metric-link" href={i.href} key={i.label}>
            {card}
          </Link>
        ) : (
          <div key={i.label}>{card}</div>
        );
      })}
    </div>
  );
}
export function PeriodControl({
  mode,
  onMode,
  custom,
  onCustom,
  period,
}: {
  mode: string;
  onMode: (s: string) => void;
  custom: { start: string; end: string };
  onCustom: (c: { start: string; end: string }) => void;
  period: Period;
}) {
  return (
    <div className="ops-period">
      <select
        aria-label="Reporting period"
        value={mode}
        onChange={(e) => onMode(e.target.value)}
      >
        {['MTD', 'Previous MTD', 'Full Previous Month', 'Custom'].map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      {mode === 'Custom' && (
        <>
          <input
            aria-label="Period start"
            type="date"
            value={custom.start}
            onChange={(e) => onCustom({ ...custom, start: e.target.value })}
          />
          <input
            aria-label="Period end"
            type="date"
            min={custom.start}
            value={custom.end}
            onChange={(e) => onCustom({ ...custom, end: e.target.value })}
          />
        </>
      )}
      <span>
        Data through <b>{period.end}</b> · H-
        {Math.round(
          (Date.parse(todayISO()) - Date.parse(period.cutoff)) / 86400000,
        )}
      </span>
    </div>
  );
}
export function usePeriod() {
  const [mode, setMode] = useState('MTD'),
    [custom, setCustom] = useState({
      start: todayISO().slice(0, 8) + '01',
      end: todayISO(),
    });
  return { mode, setMode, custom, setCustom };
}
export function labelFor(key: string) {
  return key
    .replaceAll('_id', '')
    .replaceAll('_', ' ')
    .replace(/^./, (s) => s.toUpperCase());
}
export function OpForm({
  table,
  record,
  onClose,
}: {
  table: string;
  record: Partial<RecordData>;
  onClose: () => void;
}) {
  const { data, mutate } = useWorkspace(),
    cfg = operationConfig[table];
  const [values, setValues] = useState<
      Record<string, string | number | boolean | null | undefined>
    >(() =>
      Object.fromEntries(
        cfg.fields.map((f) => [
          f.key,
          record[f.key] ??
            (f.options?.[0] ||
              (['requested_at', 'snapshot_at'].includes(f.key)
                ? todayISO()
                : '')),
        ]),
      ),
    ),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const change = (key: string, value: string | number | null) =>
    setValues((v) => ({ ...v, [key]: value }));
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await mutate([
        {
          table,
          record: {
            ...record,
            ...values,
            id: record.id || crypto.randomUUID(),
            name: String(values.name || record.name || cfg.singular),
            status: String(values.status || record.status || 'Draft'),
            created_at: record.created_at || new Date().toISOString(),
          },
        },
      ]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="entity-sheet sm:max-w-[560px]">
        <SheetHeader>
          <span className="eyebrow">{cfg.title}</span>
          <SheetTitle>
            {record.id ? 'Edit' : 'Add'} {cfg.singular.toLowerCase()}
          </SheetTitle>
          <SheetDescription>Save changes to your workspace.</SheetDescription>
        </SheetHeader>
        <form className="entity-form" onSubmit={submit}>
          <div className="form-grid">
            {cfg.fields.map((f: OpField) => {
              const options = f.relation
                ? records(data, f.relation)
                    .filter(
                      (r) =>
                        !(
                          f.relation === 'shopee_accounts' &&
                          values.creator_id &&
                          r.creator_id !== values.creator_id
                        ) &&
                        !(
                          f.relation === 'campaigns' &&
                          table === 'hsl_activations' &&
                          r.marketplace === 'TikTok'
                        ),
                    )
                    .map((r) => ({
                      value: r.id,
                      label:
                        r.name +
                        (r.creator_id
                          ? ' · ' +
                            (data.entities.creators.find(
                              (c) => c.id === r.creator_id,
                            )?.name || '')
                          : ''),
                    }))
                : f.options?.map((s) => ({ value: s, label: s }));
              return (
                <div
                  key={f.key}
                  className={
                    'form-field ' + (f.type === 'textarea' ? 'full' : '')
                  }
                >
                  <label htmlFor={'op-' + f.key}>
                    {f.label}
                    {f.required ? ' *' : ''}
                  </label>
                  {options ? (
                    <select
                      id={'op-' + f.key}
                      required={f.required}
                      value={String(values[f.key] || '')}
                      onChange={(e) => change(f.key, e.target.value)}
                    >
                      <option value="">Select {f.label.toLowerCase()}</option>
                      {options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <Textarea
                      id={'op-' + f.key}
                      value={String(values[f.key] || '')}
                      required={f.required}
                      maxLength={10000}
                      onChange={(e) => change(f.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={'op-' + f.key}
                      value={String(values[f.key] ?? '')}
                      type={f.type || 'text'}
                      required={f.required}
                      min={f.type === 'number' ? (f.min ?? 0) : undefined}
                      max={f.max}
                      maxLength={500}
                      onChange={(e) =>
                        change(
                          f.key,
                          f.type === 'number'
                            ? e.target.value === ''
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
          {table === 'hsl_creator_products' &&
            values.hsl_activation_id &&
            values.product_id && (
              <section className="ops-help">
                <b>Historical Shopee context</b>
                {(() => {
                  const activation = records(data, 'hsl_activations').find(
                      (r) => r.id === values.hsl_activation_id,
                    ),
                    m = metrics(
                      data,
                      {
                        start: '2000-01-01',
                        end: todayISO(),
                        cutoff: todayISO(),
                      },
                      'Shopee',
                      {
                        creator_id: String(activation?.creator_id),
                        product_id: String(values.product_id),
                      },
                    );
                  return (
                    <p>
                      {m.records
                        ? `${money(m.gmv)} GMV · ${m.orders} orders · ${m.units} units from this creator and product.`
                        : 'No product-attributed performance yet. Record your strategy as the assignment reason.'}
                    </p>
                  );
                })()}
              </section>
            )}
          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}
          <div className="form-footer">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save ' + cfg.singular.toLowerCase()}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
export function OperationsTable({
  table,
  where = {},
  columns,
  render,
  actions,
  bulk,
  extraFilters = {},
  title,
  createValues = {},
  hideCreate = false,
  rows: provided,
  footer,
}: {
  table: string;
  where?: Record<string, string>;
  columns?: string[];
  render?: (key: string, r: RecordData) => ReactNode;
  actions?: (r: RecordData) => ReactNode;
  bulk?: (selected: RecordData[], clear: () => void) => ReactNode;
  extraFilters?: Record<string, (r: RecordData) => boolean>;
  title?: string;
  createValues?: Partial<RecordData>;
  hideCreate?: boolean;
  rows?: RecordData[];
  footer?: ReactNode;
}) {
  const { data, role, mutate } = useWorkspace(),
    cfg = operationConfig[table],
    params = useSearchParams();
  const [form, setForm] = useState<Partial<RecordData> | null>(() =>
      params.get('create') === '1'
        ? {
            ...createValues,
            ...Object.fromEntries(
              cfg.fields
                .filter((f) => f.relation && params.get(f.key))
                .map((f) => [f.key, params.get(f.key)!]),
            ),
          }
        : null,
    ),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [special, setSpecial] = useState(''),
    [sort, setSort] = useState('created_at'),
    [ascending, setAscending] = useState(false),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [hidden, setHidden] = useState<string[]>([]),
    [deleteRow, setDeleteRow] = useState<RecordData | null>(null),
    [busy, setBusy] = useState(false);
  const editable = canOperate(role, table),
    cols = columns || cfg.columns;
  const linkedName = (
    key: string,
    value: string | number | boolean | null | undefined,
  ) => {
    const relation = cfg.fields.find((f) => f.key === key)?.relation;
    return relation
      ? records(data, relation).find((r) => r.id === value)?.name || '—'
      : String(value ?? '—');
  };
  const rows = (provided || records(data, table))
    .filter((r) =>
      Object.entries(where).every(([k, v]) => !v || String(r[k]) === v),
    )
    .filter((r) => !params.get('id') || r.id === params.get('id'))
    .filter((r) =>
      cfg.fields
        .filter((f) => f.relation)
        .every(
          (f) => !params.get(f.key) || String(r[f.key]) === params.get(f.key),
        ),
    )
    .filter((r) => !status || r.status === status)
    .filter((r) => !special || extraFilters[special]?.(r))
    .filter((r) =>
      Object.keys(r).some((k) =>
        linkedName(k, r[k]).toLowerCase().includes(search.toLowerCase()),
      ),
    )
    .sort((a, b) => {
      const av = a[sort],
        bv = b[sort];
      return (
        (ascending ? 1 : -1) *
        (typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : linkedName(sort, av).localeCompare(linkedName(sort, bv)))
      );
    });
  const lastPage = Math.max(0, Math.ceil(rows.length / 10) - 1),
    current = Math.min(page, lastPage),
    visible = rows.slice(current * 10, current * 10 + 10);
  const fieldStatuses = cfg.fields.find((f) => f.key === 'status')?.options || [
    ...new Set(records(data, table).map((r) => r.status)),
  ];
  async function remove() {
    if (!deleteRow) return;
    setBusy(true);
    try {
      await mutate([{ table, record: deleteRow, remove: true }]);
      setDeleteRow(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    setForm(null);
    if (params.has('create')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('create');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };
  return (
    <section className="panel ops-table-panel">
      {title && (
        <div className="ops-panel-heading">
          <h2>{title}</h2>
        </div>
      )}
      <div className="ops-toolbar">
        <label className="ops-search">
          <Search size={16} />
          <input
            aria-label={'Search ' + cfg.title}
            placeholder={'Search ' + cfg.title.toLowerCase()}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </label>
        {fieldStatuses.length > 1 && (
          <select
            aria-label="Status filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            {fieldStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        {Object.keys(extraFilters).length > 0 && (
          <select
            aria-label="Attention filter"
            value={special}
            onChange={(e) => {
              setSpecial(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All records</option>
            {Object.keys(extraFilters).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        <details className="ops-columns">
          <summary>Columns</summary>
          <div>
            {cols.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={!hidden.includes(c)}
                  onChange={() =>
                    setHidden(
                      hidden.includes(c)
                        ? hidden.filter((x) => x !== c)
                        : [...hidden, c],
                    )
                  }
                />
                {labelFor(c)}
              </label>
            ))}
          </div>
        </details>
        {editable && !hideCreate && (
          <Button onClick={() => setForm(createValues)}>
            <Plus size={15} />
            Add {cfg.singular.toLowerCase()}
          </Button>
        )}
      </div>
      {selected.length > 0 && bulk && (
        <div className="ops-bulk">
          <span>{selected.length} selected</span>
          {bulk(
            records(data, table).filter((r) => selected.includes(r.id)),
            () => setSelected([]),
          )}
          <Button variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}
      <div className="ops-scroll">
        <table className="ops-table">
          <thead>
            <tr>
              {bulk && editable && (
                <th>
                  <input
                    aria-label="Select visible rows"
                    type="checkbox"
                    checked={
                      visible.length > 0 &&
                      visible.every((r) => selected.includes(r.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [
                              ...new Set([
                                ...selected,
                                ...visible.map((r) => r.id),
                              ]),
                            ]
                          : selected.filter(
                              (id) => !visible.some((r) => r.id === id),
                            ),
                      )
                    }
                  />
                </th>
              )}
              {cols
                .filter((c) => !hidden.includes(c))
                .map((c) => (
                  <th key={c}>
                    <button
                      onClick={() => {
                        setSort(c);
                        setAscending(sort === c ? !ascending : true);
                      }}
                    >
                      {labelFor(c)}
                      <ArrowUpDown size={12} />
                    </button>
                  </th>
                ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                {bulk && editable && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={'Select ' + r.name}
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, r.id]
                            : selected.filter((id) => id !== r.id),
                        )
                      }
                    />
                  </td>
                )}
                {cols
                  .filter((c) => !hidden.includes(c))
                  .map((c) => (
                    <td key={c}>
                      {render?.(c, r) ??
                        (c === 'status' ? (
                          <Status value={r.status} />
                        ) : c === 'creator_id' ? (
                          <Link href={'/creators/' + r.creator_id}>
                            {linkedName(c, r[c])}
                          </Link>
                        ) : c === 'campaign_id' ? (
                          <Link href={'/campaigns/' + r.campaign_id}>
                            {linkedName(c, r[c])}
                          </Link>
                        ) : (
                          linkedName(c, r[c])
                        ))}
                    </td>
                  ))}
                <td>
                  <div className="ops-row-actions">
                    {actions?.(r)}
                    {editable && !cfg.immutable && !r.finalized_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={'Edit ' + r.name}
                        onClick={() => setForm(r)}
                      >
                        <Pencil size={14} />
                      </Button>
                    )}
                    {editable && !cfg.immutable && !r.finalized_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={'Delete ' + r.name}
                        onClick={() => setDeleteRow(r)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="ops-empty">
            <h3>No matching {cfg.title.toLowerCase()}</h3>
            <p>
              {search || status || special
                ? 'Try a broader search or clear your filters.'
                : `Add a ${cfg.singular.toLowerCase()} to start organizing this workflow.`}
            </p>
            {search || status || special ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setSpecial('');
                  setPage(0);
                }}
              >
                Clear filters
              </Button>
            ) : (
              editable &&
              !hideCreate && (
                <Button onClick={() => setForm(createValues)}>
                  Add {cfg.singular.toLowerCase()}
                </Button>
              )
            )}
          </div>
        )}
      </div>
      <div className="ops-pagination">
        <span>
          {rows.length} records · page {current + 1} of {lastPage + 1}
        </span>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Previous page"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Next page"
          disabled={current === lastPage}
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
      {footer}
      {form && <OpForm table={table} record={form} onClose={close} />}{' '}
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(v) => !v && setDeleteRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete {cfg.singular.toLowerCase()}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes {deleteRow?.name || 'this record'}. Linked records must
            be removed first.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              {busy ? 'Deleting…' : 'Delete record'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
export function NewReportButton({ monthly = false }: { monthly?: boolean }) {
  const { data } = useWorkspace();
  const [form, setForm] = useState(false);
  const p = periodRange(
    monthly ? 'Full Previous Month' : 'MTD',
    new Date(),
    thresholds(data).cutoff_days,
  );
  return (
    <>
      <Button onClick={() => setForm(true)}>
        <Plus size={15} />
        New report
      </Button>
      {form && (
        <OpForm
          table="reports"
          record={{
            marketplace: 'Shopee',
            report_type: monthly ? 'Monthly Recap' : 'Internal Weekly',
            period_start: p.start,
            period_end: p.end,
            cutoff_date: p.cutoff,
          }}
          onClose={() => setForm(false)}
        />
      )}
    </>
  );
}
