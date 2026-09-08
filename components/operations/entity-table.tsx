'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import { config, columnLabels } from '@/lib/data/config';
import { sum, money, number, initials } from '@/lib/data/metrics';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { EntityForm } from './entity-form';
import { Choice, Status, EmptyState } from './shared';
import type { Entity, RecordData, WorkspaceData } from '@/types/domain';
import { toast } from 'sonner';
export function displayValue(
  key: string,
  r: RecordData,
  e: Entity,
  d: WorkspaceData,
): string | number {
  if (key.endsWith('_id'))
    return (
      Object.values(d.entities)
        .flat()
        .find((v) => v.id === r[key])?.name || '—'
    );
  if (key === 'tiktok_account' || key === 'shopee_account')
    return (
      d[key === 'tiktok_account' ? 'tiktok_accounts' : 'shopee_accounts']
        .filter((a) => a.creator_id === r.id)
        .map((a) => a.username)
        .join(', ') || '—'
    );
  if (key === 'followers')
    return d.tiktok_accounts
      .filter((a) => a.creator_id === r.id)
      .reduce((s, a) => s + a.followers, 0);
  if (key === 'tiktok_gmv' || key === 'shopee_gmv') {
    const accounts = d[
      key === 'tiktok_gmv' ? 'tiktok_accounts' : 'shopee_accounts'
    ]
      .filter((a) => a.creator_id === r.id)
      .map((a) => a.id);
    return sum(
      d[
        key === 'tiktok_gmv' ? 'tiktok_performance' : 'shopee_performance'
      ].filter((p) => accounts.includes(p.account_id)),
    );
  }
  if (key === 'total_gmv')
    return (
      Number(displayValue('tiktok_gmv', r, e, d)) +
      Number(displayValue('shopee_gmv', r, e, d))
    );
  if (key === 'actual_gmv')
    return (
      sum(d.tiktok_performance.filter((p) => p.campaign_id === r.id)) +
      sum(d.shopee_performance.filter((p) => p.campaign_id === r.id))
    );
  if (key === 'brands')
    return d.entities.brands.filter((b) => b.client_id === r.id).length;
  if (key === 'products')
    return d.entities.products.filter((p) => p.brand_id === r.id).length;
  if (key === 'creators')
    return d.campaign_creators.filter((c) => c.campaign_id === r.id).length;
  if (key === 'campaigns') {
    if (e === 'creators')
      return d.campaign_creators.filter((c) => c.creator_id === r.id).length;
    const brandIds =
      e === 'brands'
        ? [r.id]
        : d.entities.brands
            .filter((b) => b.client_id === r.id)
            .map((b) => b.id);
    return d.entities.campaigns.filter((c) =>
      brandIds.includes(String(c.brand_id)),
    ).length;
  }
  return r[key] ?? '—';
}
export function EntityTable({
  entity,
  subset,
  embedded = false,
}: {
  entity: Entity;
  subset?: RecordData[];
  embedded?: boolean;
}) {
  const { data, canEdit, remove } = useWorkspace();
  const router = useRouter();
  const cfg = config[entity],
    params = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') || 'all');
  const [market, setMarket] = useState('all');
  const [sort, setSort] = useState({ key: 'name', dir: 1 });
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(cfg.columns);
  const [form, setForm] = useState<Partial<RecordData> | null>(() =>
    params.get('create') === '1' && canEdit(entity) ? {} : null,
  );
  const [deleting, setDeleting] = useState<RecordData | null>(null);
  const all = subset || data.entities[entity];
  const filtered = all
    .filter(
      (r) =>
        Object.values(r).some((v) =>
          String(v).toLowerCase().includes(search.toLowerCase()),
        ) &&
        (status === 'all' || r.status === status) &&
        (market === 'all' ||
          r.marketplace === market ||
          r.marketplace === 'Multi-platform'),
    )
    .sort((a, b) => {
      const x = displayValue(sort.key, a, entity, data),
        y = displayValue(sort.key, b, entity, data);
      return (
        (typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y))) * sort.dir
      );
    });
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pageCount - 1);
  const reset = () => setPage(0);
  return (
    <>
      {!embedded && (
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              OPERATIONS / {cfg.title.toUpperCase()}
            </div>
            <h1>
              {cfg.title} <span className="heading-count">{all.length}</span>
            </h1>
            <p>{cfg.description}</p>
          </div>
          {canEdit(entity) && (
            <Button onClick={() => setForm({})}>
              <Plus size={16} />{' '}
              {entity === 'creators'
                ? 'Add creator'
                : 'Create ' + cfg.singular.toLowerCase()}
            </Button>
          )}
        </div>
      )}
      <section className="panel data-panel">
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} />
            <Input
              aria-label={'Search ' + cfg.title}
              placeholder={'Search ' + cfg.title.toLowerCase() + '...'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                reset();
              }}
            />
          </div>
          <div className="filter-select">
            <Choice
              label="Filter by status"
              value={status}
              onChange={(v) => {
                setStatus(v);
                reset();
              }}
              options={[
                { value: 'all', label: 'All statuses' },
                ...Array.from(new Set(all.map((r) => r.status))).map((v) => ({
                  value: v,
                  label: v,
                })),
              ]}
            />
          </div>
          {entity === 'campaigns' && (
            <div className="filter-select">
              <Choice
                label="Marketplace"
                value={market}
                onChange={(v) => {
                  setMarket(v);
                  reset();
                }}
                options={['all', 'TikTok', 'Shopee', 'Multi-platform'].map(
                  (v) => ({
                    value: v,
                    label: v === 'all' ? 'All marketplaces' : v,
                  }),
                )}
              />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="ml-auto" />}
            >
              <SlidersHorizontal size={14} /> Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {cfg.columns
                .filter((k) => k !== 'name')
                .map((k) => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={visible.includes(k)}
                    onCheckedChange={(checked) =>
                      setVisible(
                        checked
                          ? [...visible, k]
                          : visible.filter((v) => v !== k),
                      )
                    }
                  >
                    {columnLabels[k]}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {filtered.length ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {cfg.columns
                    .filter((k) => visible.includes(k))
                    .map((k) => (
                      <TableHead key={k}>
                        <button
                          className="sort-button"
                          onClick={() =>
                            setSort({
                              key: k,
                              dir: sort.key === k ? -sort.dir : 1,
                            })
                          }
                        >
                          {columnLabels[k]}
                          <ArrowUpDown size={11} />
                        </button>
                      </TableHead>
                    ))}
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(current * 10, current * 10 + 10).map((r, i) => (
                  <TableRow key={r.id}>
                    {cfg.columns
                      .filter((k) => visible.includes(k))
                      .map((k) => {
                        const value = displayValue(k, r, entity, data);
                        return (
                          <TableCell key={k}>
                            {k === 'name' ? (
                              <Link
                                className="record-name"
                                href={'/' + entity + '/' + r.id}
                              >
                                <span
                                  className={
                                    (entity === 'creators'
                                      ? 'avatar'
                                      : 'brand-avatar') +
                                    ' color-' +
                                    (i % 4)
                                  }
                                >
                                  {initials(r.name)}
                                </span>
                                <span>
                                  {r.name}
                                  {entity === 'creators' && (
                                    <small>{r.tags}</small>
                                  )}
                                </span>
                              </Link>
                            ) : k === 'status' || k === 'priority' ? (
                              <Status value={String(value)} />
                            ) : k.includes('gmv') ? (
                              money(Number(value))
                            ) : k === 'followers' ? (
                              number(Number(value))
                            ) : k === 'marketplace' ? (
                              <span className="market-tag">{value}</span>
                            ) : k === 'created_at' ? (
                              String(value).slice(0, 10)
                            ) : (
                              <span
                                className={
                                  k === 'due_date' &&
                                  String(value) < '2026-09-08' &&
                                  r.status !== 'Done'
                                    ? 'overdue'
                                    : ''
                                }
                              >
                                {value}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={'Actions for ' + r.name}
                          render={<Button variant="ghost" size="icon-sm" />}
                        >
                          <MoreHorizontal size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            render={<Link href={'/' + entity + '/' + r.id} />}
                          >
                            <ArrowUpRight size={14} />
                            View details
                          </DropdownMenuItem>
                          {canEdit(entity) && (
                            <>
                              <DropdownMenuItem onClick={() => setForm(r)}>
                                <Pencil size={14} />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(r)}
                              >
                                <Trash2 size={14} />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="table-pagination">
              <span>
                Showing {current * 10 + 1}–
                {Math.min((current + 1) * 10, filtered.length)} of{' '}
                {filtered.length} {cfg.title.toLowerCase()}
              </span>
              <Pagination className="w-auto m-0">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={current === 0}
                      aria-label="Previous page"
                      onClick={() => setPage(current - 1)}
                    >
                      <ChevronLeft size={14} />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3">
                      {current + 1} / {pageCount}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={current >= pageCount - 1}
                      aria-label="Next page"
                      onClick={() => setPage(current + 1)}
                    >
                      <ChevronRight size={14} />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        ) : (
          <EmptyState
            title={'No ' + cfg.title.toLowerCase() + ' found'}
            description="Try changing your filters, or add your first record."
          >
            {search || status !== 'all' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatus('all');
                  setMarket('all');
                }}
              >
                Clear filters
              </Button>
            ) : (
              canEdit(entity) && (
                <Button onClick={() => setForm({})}>
                  Create {cfg.singular.toLowerCase()}
                </Button>
              )
            )}
          </EmptyState>
        )}
      </section>
      {form && (
        <EntityForm
          key={form.id || 'new'}
          entity={entity}
          record={form}
          onClose={() => {
            setForm(null);
            if (params.get('create')) router.replace('/' + entity);
          }}
        />
      )}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the record. Records with existing relationships must be
            unlinked first.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await remove(entity, deleting!.id);
                  setDeleting(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Delete failed');
                }
              }}
            >
              Delete record
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
