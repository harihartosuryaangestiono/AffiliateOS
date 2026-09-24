'use client';
import { EmptyState } from '@/components/operations/shared';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { records } from '@/lib/operations/config';
import {
  generateOperationalActions,
  mergePersistedActions,
  type OperationalAction,
} from '@/lib/intelligence/actions';
import type { RecordData } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Heading, MetricCards } from './primitives';
import { toast } from 'sonner';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
const groups = [
  'Urgent',
  'Today',
  'Upcoming',
  'Monitoring',
  'Completed / Resolved',
];
const href = (a: OperationalAction) =>
  a.entity_type === 'creators'
    ? `/creators/${a.entity_id}`
    : a.entity_type === 'peak_days'
      ? `/peak-days/${a.entity_id}`
      : a.category === 'Outreach'
        ? '/creators/outreach'
        : a.category === 'HSL' || a.category === 'Stock'
          ? '/hsl'
          : a.category === 'Samples'
            ? '/samples'
            : a.category === 'Tasks'
              ? '/tasks'
              : '/my-work';
export function ActionCenter({ compact = false }: { compact?: boolean }) {
  const { data, setData, demo, name } = useWorkspace(),
    [filter, setFilter] = useState('All'),
    [busy, setBusy] = useState('');
  const actions = useMemo(
      () =>
        mergePersistedActions(
          generateOperationalActions(data),
          records(data, 'operational_actions'),
        ),
      [data],
    ),
    members = records(data, 'profiles');
  const visible = actions.filter(
    (a) => filter === 'All' || a.category === filter,
  );
  const now = new Date().toISOString().slice(0, 10),
    active = actions.filter(
      (a) => !['RESOLVED', 'DISMISSED'].includes(a.status),
    );
  const section = (a: OperationalAction) =>
    ['RESOLVED', 'DISMISSED'].includes(a.status)
      ? 'Completed / Resolved'
      : a.priority === 'P0' || (a.due_at && a.due_at.slice(0, 10) < now)
        ? 'Urgent'
        : a.due_at?.slice(0, 10) === now
          ? 'Today'
          : a.due_at
            ? 'Upcoming'
            : 'Monitoring';
  async function call(payload: Record<string, unknown>) {
    setBusy(String(payload.id || payload.action));
    try {
      if (demo) {
        const currentActions = records(data, 'operational_actions');
        if (payload.action === 'transition') {
          const actionId = String(payload.id);
          const act = actions.find((a) => a.id === actionId);
          if (!act) return;
          const statusStr = typeof payload.status === 'string' ? payload.status : 'OPEN';
          const assignedToStr = typeof payload.assignedTo === 'string' || payload.assignedTo === null ? payload.assignedTo : undefined;
          const snoozedUntilStr = typeof payload.snoozedUntil === 'string' ? payload.snoozedUntil : null;
          const noteStr = typeof payload.note === 'string' ? payload.note : null;

          const updated = currentActions.some((a) => a.id === actionId)
            ? currentActions.map((a) =>
                a.id === actionId
                  ? ({
                      ...a,
                      status: statusStr,
                      assigned_to: assignedToStr !== undefined ? assignedToStr : a.assigned_to,
                      snoozed_until: snoozedUntilStr !== null ? snoozedUntilStr : a.snoozed_until,
                      resolution_note: noteStr !== null ? noteStr : a.resolution_note,
                    } as RecordData)
                  : a,
              )
            : ([
                ...currentActions,
                {
                  ...act,
                  status: statusStr,
                  assigned_to: assignedToStr !== undefined ? assignedToStr : act.assigned_to,
                  snoozed_until: snoozedUntilStr !== null ? snoozedUntilStr : act.snoozed_until,
                  resolution_note: noteStr !== null ? noteStr : act.resolution_note,
                },
              ] as RecordData[]);
          setData({
            ...data,
            operations: {
              ...data.operations,
              operational_actions: updated,
            },
          });
          toast.success(`Action updated to ${statusStr}`);
          return;
        }
        if (payload.action === 'create_task') {
          const actionId = String(payload.id);
          const act = actions.find((a) => a.id === actionId);
          if (!act) return;
          const taskId = `tsk-${Date.now().toString(36)}`;
          const due = String(act.due_at || new Date().toISOString()).slice(0, 10);
          const newTask: RecordData = {
            id: taskId,
            name: act.title,
            status: 'To Do',
            priority: act.priority === 'P0' ? 'Urgent' : act.priority === 'P1' ? 'High' : 'Medium',
            due_date: due,
            owner: name,
            notes: act.reason || act.title,
            created_at: new Date().toISOString(),
          };
          const updated = currentActions.some((a) => a.id === actionId)
            ? currentActions.map((a) =>
                a.id === actionId ? ({ ...a, source_task_id: taskId, status: 'IN_PROGRESS' } as RecordData) : a,
              )
            : ([
                ...currentActions,
                {
                  ...act,
                  source_task_id: taskId,
                  status: 'IN_PROGRESS',
                },
              ] as RecordData[]);
          setData({
            ...data,
            entities: {
              ...data.entities,
              tasks: [newTask, ...data.entities.tasks],
            },
            operations: {
              ...data.operations,
              operational_actions: updated,
            },
          });
          toast.success('Task created and added to My Work');
          return;
        }
        return;
      }
      const r = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        v = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(v.error || 'Action failed');
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }
  if (compact)
    return (
      <section className="panel ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Needs attention</h2>
            <p>Highest-priority operational actions</p>
          </div>
          <Link href="/actions">View Action Center →</Link>
        </div>
        <div className="action-list">
          {active.slice(0, 5).map((a) => (
            <Link
              href="/actions"
              key={a.deduplication_key}
              className="action-card compact"
            >
              <b className={'priority ' + a.priority}>{a.priority}</b>
              <span>
                <strong>{a.title}</strong>
                <small>{a.reason}</small>
              </span>
              <ArrowUpRight size={15} />
            </Link>
          ))}
          {!active.length && <p className="ops-empty">No active actions.</p>}
        </div>
      </section>
    );
  return (
    <>
      <Heading
        eyebrow="OPERATIONAL INTELLIGENCE"
        title="Action Center"
        description="What needs attention today, why it matters, and what to do next."
      >
        <Button
          variant="outline"
          disabled={Boolean(busy)}
          onClick={() => call({ action: 'sync' })}
        >
          <RefreshCw size={15} />
          Refresh signals
        </Button>
      </Heading>
      <MetricCards
        items={[
          { label: 'Needs attention', value: active.length },
          {
            label: 'Due today',
            value: active.filter((a) => a.due_at?.slice(0, 10) === now).length,
          },
          {
            label: 'Overdue',
            value: active.filter((a) => a.due_at && a.due_at.slice(0, 10) < now)
              .length,
          },
          {
            label: 'Peak Day risks',
            value: active.filter((a) => a.category === 'Peak Day').length,
          },
        ]}
      />
      <div className="ops-tabs action-filters">
        {[
          'All',
          'Creator',
          'Outreach',
          'HSL',
          'Stock',
          'Samples',
          'Peak Day',
          'Reports',
          'Tasks',
        ].map((x) => (
          <button
            key={x}
            className={filter === x ? 'active' : ''}
            onClick={() => setFilter(x)}
          >
            {x}
          </button>
        ))}
      </div>
      {!visible.length && (
        <section className="panel">
          <EmptyState
            title="You’re all caught up"
            description="No operational actions match this view. Review another category or return as your workspace changes."
          >
            <Button variant="outline" onClick={() => setFilter('All')}>
              Show all categories
            </Button>
          </EmptyState>
        </section>
      )}
      {groups.map((group) => {
        const rows = visible.filter((a) => section(a) === group);
        return rows.length ? (
          <section key={group} className="panel ops-panel action-section">
            <div className="ops-panel-heading">
              <h2>{group}</h2>
              <span>{rows.length}</span>
            </div>
            <div className="action-list">
              <AnimatePresence mode="popLayout">
                {rows.map((a) => (
                  <motion.article
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="action-card"
                    key={a.deduplication_key}
                  >
                    <b className={'priority ' + a.priority}>{a.priority}</b>
                  <div className="action-copy">
                    <div>
                      <span className="market-tag">{a.category}</span>
                      {a.marketplace && (
                        <span className="market-tag">{a.marketplace}</span>
                      )}
                    </div>
                    <h3>{a.title}</h3>
                    <p>{a.reason}</p>
                    <small>
                      <b>Next:</b> {a.recommended_action}
                    </small>
                    <details>
                      <summary>Evidence</summary>
                      <pre>{JSON.stringify(a.evidence, null, 2)}</pre>
                    </details>
                  </div>
                  <div className="action-controls">
                    <Link href={href(a)} className="ops-text-link">
                      Open context <ArrowUpRight size={13} />
                    </Link>
                    {members.length > 0 && (
                      <select
                        aria-label={`Assign ${a.title}`}
                        value={String(a.assigned_to || '')}
                        disabled={Boolean(busy)}
                        onChange={(e) =>
                          call({
                            action: 'transition',
                            id: a.id,
                            status: a.status,
                            assignedTo: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option value={m.id} key={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {!['RESOLVED', 'DISMISSED'].includes(a.status) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            call({
                              action: 'transition',
                              id: a.id,
                              status: 'IN_PROGRESS',
                            })
                          }
                        >
                          Start
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            call({
                              action: 'transition',
                              id: a.id,
                              status: 'SNOOZED',
                              snoozedUntil: new Date(
                                Date.now() + 86400000,
                              ).toISOString(),
                            })
                          }
                        >
                          Snooze 1 day
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            call({ action: 'create_task', id: a.id })
                          }
                        >
                          Create task
                        </Button>
                        <Button
                          size="sm"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            call({
                              action: 'transition',
                              id: a.id,
                              status: 'RESOLVED',
                              note: 'Resolved from Action Center',
                            })
                          }
                        >
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            call({
                              action: 'transition',
                              id: a.id,
                              status: 'DISMISSED',
                              note: 'Dismissed from Action Center',
                            })
                          }
                        >
                          Dismiss
                        </Button>
                      </>
                    )}
                    {a.status === 'RESOLVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          call({
                            action: 'transition',
                            id: a.id,
                            status: 'OPEN',
                          })
                        }
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </motion.article>
              ))}
              </AnimatePresence>
            </div>
          </section>
        ) : null;
      })}
    </>
  );
}
