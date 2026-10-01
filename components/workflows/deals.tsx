'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Lock,
  MessageCircle,
  Calendar,
  Radio,
  Video,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { Status } from '@/components/operations/shared';
import { Heading, MetricCards, OpForm } from './primitives';
import { records, canOperate, activationStages } from '@/lib/operations/config';
import type { RecordData } from '@/types/domain';
import { toast } from 'sonner';

export function Deals({
  campaignId,
  creatorId,
}: {
  campaignId?: string;
  creatorId?: string;
}) {
  const { data, role, mutate } = useWorkspace();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState(
    campaignId || searchParams.get('campaign_id') || '',
  );
  const [formatFilter, setFormatFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formRecord, setFormRecord] = useState<Partial<RecordData> | null>(null);
  const [page, setPage] = useState(0);

  const canEdit = canOperate(role, 'campaign_creators');

  // Load all campaign creators records
  const allDeals = useMemo(() => {
    return records(data, 'campaign_creators').filter((deal) => {
      if (campaignId && deal.campaign_id !== campaignId) return false;
      if (creatorId && deal.creator_id !== creatorId) return false;
      return true;
    });
  }, [data, campaignId, creatorId]);

  // Status groupings
  const lockedCount = useMemo(
    () =>
      allDeals.filter((d) =>
        ['Locked', 'Ready', 'Active', 'Completed'].includes(String(d.status)),
      ).length,
    [allDeals],
  );

  const pipelineCount = useMemo(
    () =>
      allDeals.filter((d) =>
        ['Target', 'Contacted', 'Negotiating'].includes(String(d.status)),
      ).length,
    [allDeals],
  );

  const liveFormatCount = useMemo(
    () => allDeals.filter((d) => d.format === 'Live' || d.format === 'Both').length,
    [allDeals],
  );

  // Filtered rows
  const filteredDeals = useMemo(() => {
    return allDeals.filter((deal) => {
      const creator = data.entities.creators.find((c) => c.id === deal.creator_id);
      const campaign = data.entities.campaigns.find((c) => c.id === deal.campaign_id);

      if (campaignFilter && deal.campaign_id !== campaignFilter) return false;
      if (stageFilter && deal.status !== stageFilter) return false;
      if (formatFilter && deal.format !== formatFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchCreator = creator?.name?.toLowerCase().includes(q);
        const matchCampaign = campaign?.name?.toLowerCase().includes(q);
        const matchNotes = String(deal.notes || '').toLowerCase().includes(q);
        if (!matchCreator && !matchCampaign && !matchNotes) return false;
      }

      return true;
    });
  }, [allDeals, data.entities.creators, data.entities.campaigns, campaignFilter, stageFilter, formatFilter, search]);

  const visibleDeals = filteredDeals.slice(page * 10, page * 10 + 10);

  // Bulk actions
  async function handleBulkLock() {
    if (!selectedIds.length) return;
    try {
      await mutate(
        selectedIds.map((id) => {
          const old = allDeals.find((d) => d.id === id);
          return {
            table: 'campaign_creators',
            record: {
              ...old,
              id,
              name: old?.name || 'Campaign creator',
              created_at: old?.created_at || new Date().toISOString(),
              status: 'Locked',
            },
          };
        }),
      );
      toast.success(`${selectedIds.length} deals locked successfully.`);
      setSelectedIds([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not lock deals.');
    }
  }

  async function handleBulkReady() {
    if (!selectedIds.length) return;
    try {
      await mutate(
        selectedIds.map((id) => {
          const old = allDeals.find((d) => d.id === id);
          return {
            table: 'campaign_creators',
            record: {
              ...old,
              id,
              name: old?.name || 'Campaign creator',
              created_at: old?.created_at || new Date().toISOString(),
              status: 'Ready',
            },
          };
        }),
      );
      toast.success(`${selectedIds.length} deals marked ready.`);
      setSelectedIds([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update deals.');
    }
  }

  return (
    <>
      <Heading
        eyebrow="CAMPAIGNS & ACTIVATIONS"
        title="Creator Deals & Commitments"
        description="Track commercial campaign commitments, locked rates, agreed broadcasting formats (Live / Video), and contractual execution."
      >
        <Button
          disabled={!canEdit}
          onClick={() =>
            setFormRecord({
              campaign_id: campaignFilter || data.entities.campaigns[0]?.id || '',
              creator_id: creatorId || '',
              status: 'Locked',
              format: 'Live',
            })
          }
        >
          <Plus size={15} className="mr-1.5" />
          Add Deal Lock
        </Button>
      </Heading>

      <MetricCards
        items={[
          {
            label: 'Total Deals',
            value: allDeals.length,
            detail: 'All creator-campaign bindings',
          },
          {
            label: 'Locked & Confirmed',
            value: lockedCount,
            detail: `${allDeals.length ? Math.round((lockedCount / allDeals.length) * 100) : 0}% locked rate`,
          },
          {
            label: 'Pipeline / In Talk',
            value: pipelineCount,
            detail: 'Target, contacted & negotiating',
          },
          {
            label: 'Live Broadcast Deals',
            value: liveFormatCount,
            detail: 'Live streaming or hybrid commitments',
          },
        ]}
      />

      <div className="ops-funnel">
        <button
          className={stageFilter === '' ? 'active' : ''}
          onClick={() => {
            setStageFilter('');
            setPage(0);
          }}
        >
          <small>All Deals</small>
          <b>{allDeals.length}</b>
          <span>100% total pipeline</span>
        </button>
        {activationStages.map((st) => {
          const count = allDeals.filter((d) => d.status === st).length;
          return (
            <button
              key={st}
              className={stageFilter === st ? 'active' : ''}
              onClick={() => {
                setStageFilter(stageFilter === st ? '' : st);
                setPage(0);
              }}
            >
              <small>{st}</small>
              <b>{count}</b>
              <span>
                {allDeals.length ? Math.round((count / allDeals.length) * 100) : 0}% of deals
              </span>
            </button>
          );
        })}
      </div>

      <section className="panel ops-table-panel">
        <div className="ops-toolbar">
          <Input
            aria-label="Search deals"
            placeholder="Search creator, campaign, or deal notes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />

          <select
            aria-label="Campaign filter"
            value={campaignFilter}
            onChange={(e) => {
              setCampaignFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Campaigns</option>
            {data.entities.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Format filter"
            value={formatFilter}
            onChange={(e) => {
              setFormatFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Formats</option>
            <option value="Live">Live Stream Only</option>
            <option value="Video">Video / Short-form Only</option>
            <option value="Both">Both (Hybrid)</option>
          </select>

          <select
            aria-label="Stage filter"
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Stages</option>
            {activationStages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="ops-bulk">
            <span>{selectedIds.length} selected deals</span>
            <Button size="sm" onClick={handleBulkLock}>
              <Lock size={13} className="mr-1" />
              Lock for Activation
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkReady}>
              <CheckCircle2 size={13} className="mr-1" />
              Mark Ready
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        )}

        <div className="ops-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  <input
                    aria-label="Select all deals"
                    type="checkbox"
                    checked={
                      visibleDeals.length > 0 &&
                      visibleDeals.every((d) => selectedIds.includes(d.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newIds = new Set([
                          ...selectedIds,
                          ...visibleDeals.map((d) => d.id),
                        ]);
                        setSelectedIds(Array.from(newIds));
                      } else {
                        const pageIds = new Set(visibleDeals.map((d) => d.id));
                        setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
                      }
                    }}
                  />
                </th>
                <th>Creator</th>
                <th>Campaign</th>
                <th>Format</th>
                <th>Status</th>
                <th>Scheduled Date</th>
                <th>Lock Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDeals.map((deal) => {
                const creator = data.entities.creators.find(
                  (c) => c.id === deal.creator_id,
                );
                const campaign = data.entities.campaigns.find(
                  (c) => c.id === deal.campaign_id,
                );
                const isLocked = [
                  'Locked',
                  'Ready',
                  'Active',
                  'Completed',
                ].includes(String(deal.status));

                return (
                  <tr key={deal.id}>
                    <td>
                      <input
                        aria-label={`Select deal for ${creator?.name || 'Creator'}`}
                        type="checkbox"
                        checked={selectedIds.includes(deal.id)}
                        onChange={(e) =>
                          setSelectedIds(
                            e.target.checked
                              ? [...selectedIds, deal.id]
                              : selectedIds.filter((id) => id !== deal.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      {creator ? (
                        <div className="flex flex-col">
                          <Link
                            href={`/creators/${creator.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {creator.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {creator.relationship_status || 'Prospect'} ·{' '}
                            {creator.phone ? 'WhatsApp Available' : 'No Phone'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown creator</span>
                      )}
                    </td>
                    <td>
                      {campaign ? (
                        <div className="flex flex-col">
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            className="font-medium hover:underline"
                          >
                            {campaign.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {campaign.marketplace}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No campaign</span>
                      )}
                    </td>
                    <td>
                      <Badge
                        variant="secondary"
                        className={
                          deal.format === 'Live'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : deal.format === 'Video'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }
                      >
                        {deal.format === 'Live' && <Radio size={11} className="mr-1 inline" />}
                        {deal.format === 'Video' && <Video size={11} className="mr-1 inline" />}
                        {deal.format === 'Both' && <Sparkles size={11} className="mr-1 inline" />}
                        {deal.format || 'Live'}
                      </Badge>
                    </td>
                    <td>
                      <Status value={String(deal.status || 'Target')} />
                    </td>
                    <td>
                      {deal.scheduled_at ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Calendar size={13} className="text-muted-foreground" />
                          {String(deal.scheduled_at)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Unscheduled
                        </span>
                      )}
                    </td>
                    <td>
                      {isLocked ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <Lock size={12} className="text-emerald-600" />
                          <span>
                            {deal.locked_at
                              ? String(deal.locked_at).slice(0, 10)
                              : 'Locked'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600">
                          <Clock size={12} />
                          <span>Pending lock</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {!isLocked && canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                            onClick={() =>
                              mutate([
                                {
                                  table: 'campaign_creators',
                                  record: {
                                    ...deal,
                                    name: deal.name || 'Campaign creator',
                                    created_at: deal.created_at || new Date().toISOString(),
                                    status: 'Locked',
                                  },
                                },
                              ])
                                .then(() => toast.success(`Locked deal for ${creator?.name}`))
                                .catch((e) => toast.error(e.message))
                            }
                          >
                            <Lock size={12} />
                            Lock
                          </Button>
                        )}
                        {creator && (
                          <Link
                            href={`/creators/communication?creator_id=${creator.id}`}
                            className="button-ghost text-xs h-7 px-2 inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
                            title="Open outreach and conversation"
                          >
                            <MessageCircle size={12} />
                            Contact
                          </Link>
                        )}
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-slate-500 hover:text-slate-900"
                            onClick={() => setFormRecord(deal)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredDeals.length && (
            <div className="ops-empty">
              No campaign deals found matching your criteria.
            </div>
          )}
        </div>

        <div className="ops-pagination">
          <span>{filteredDeals.length} deals total</span>
          <Button
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            disabled={(page + 1) * 10 >= filteredDeals.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </section>

      {formRecord && (
        <OpForm
          table="campaign_creators"
          record={formRecord}
          onClose={() => setFormRecord(null)}
        />
      )}
    </>
  );
}
