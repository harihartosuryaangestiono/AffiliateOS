'use client';
import { GrowthChart } from '@/components/dashboard/growth-chart';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus, Check, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { EntityForm } from '@/components/operations/entity-form';
import { Status } from '@/components/operations/shared';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heading,
  MetricCards,
  OperationsTable,
  OpForm,
  PeriodControl,
  usePeriod,
} from './primitives';
import {
  metrics,
  periodRange,
  operationalAlerts,
  todayISO,
  shiftDate,
  readiness,
} from '@/lib/operations/engine';
import { records, thresholds, canOperate } from '@/lib/operations/config';
import { money, number } from '@/lib/data/metrics';
import type { RecordData } from '@/types/domain';
import { toast } from 'sonner';
export function PerformanceOverview({
  dashboard = false,
}: {
  dashboard?: boolean;
}) {
  const { data, name, demo } = useWorkspace(),
    { mode, setMode, custom, setCustom } = usePeriod(),
    [market, setMarket] = useState('Multi-platform');
  const period = periodRange(
      mode,
      new Date(),
      thresholds(data).cutoff_days,
      custom,
    ),
    m = metrics(data, period, market),
    alerts = operationalAlerts(data),
    peaks = records(data, 'peak_days')
      .filter((p) => String(p.event_date) >= todayISO())
      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
  return (
    <>
      <Heading
        eyebrow={dashboard ? 'TODAY’S WORKSPACE' : 'PERFORMANCE'}
        title={
          dashboard ? `Hello, ${name.split(' ')[0]}` : 'Performance overview'
        }
        description={
          dashboard
            ? new Intl.DateTimeFormat('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
              }).format(new Date())
            : 'Processed payment orders, with a consistent reporting cutoff.'
        }
      >
        <Link className="button-outline" href="/reports">
          Prepare report
          <ArrowUpRight size={14} />
        </Link>
      </Heading>
      {demo && (
        <div className="ops-demo-note">
          Demo workspace · synthetic records stored in this browser. Import your
          own test files to try the workflow.
        </div>
      )}
      <div className="ops-filter-bar">
        <PeriodControl
          mode={mode}
          onMode={setMode}
          custom={custom}
          onCustom={setCustom}
          period={period}
        />
        <select
          aria-label="Marketplace"
          value={market}
          onChange={(e) => setMarket(e.target.value)}
        >
          {['Multi-platform', 'Shopee', 'TikTok'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <MetricCards
        items={[
          {
            label: 'Affiliate GMV',
            value: money(m.gmv, true),
            detail:
              m.growth === null
                ? 'No previous comparison baseline'
                : `${m.growth.toFixed(1)}% vs comparable previous period`,
            href: `/creators/performance?marketplace=${encodeURIComponent(market)}`,
          },
          {
            label: 'Campaign target',
            value: m.target === null ? 'Not set' : money(m.target, true),
            detail:
              m.achievement === null
                ? 'Set targets on campaigns'
                : `${m.achievement.toFixed(1)}% achieved · full campaign targets`,
            href: '/settings/targets',
          },
          {
            label: 'Affiliates with sales',
            value: m.affiliates,
            detail:
              m.affiliatesTarget === null
                ? 'Target not set'
                : `Target ${m.affiliatesTarget}`,
            href: `/creators/performance?marketplace=${encodeURIComponent(market)}`,
          },
          {
            label: 'Orders',
            value: number(m.orders),
            detail: `${number(m.units)} units sold`,
            href: '/imports',
          },
          {
            label: 'Active creators',
            value: m.activeCreators,
            detail: 'With processed activity in period',
            href: '/creators/performance',
          },
          {
            label: 'Active campaigns',
            value: data.entities.campaigns.filter((c) => c.status === 'Active')
              .length,
            href: '/campaigns',
          },
        ]}
      />
      {!m.records && (
        <div className="ops-empty panel">
          <h3>No performance data in this period</h3>
          <p>Import a payment order report to calculate performance.</p>
          <Link href="/imports" className="button-outline">
            Open Import Center
          </Link>
        </div>
      )}
      <div className="mb-6">
        <GrowthChart market={market} period={period} />
      </div>
      <div className="ops-two-col">
        <section className="panel ops-panel">
          <div className="ops-panel-heading">
            <h2>
              {dashboard ? 'Today’s priorities' : 'Operational attention'}
            </h2>
            <span>{alerts.length} signals</span>
          </div>
          <div className="ops-alert-list">
            {alerts.slice(0, 8).map((a) => (
              <Link key={a.id} href={a.href}>
                <span className={'ops-dot ' + a.severity.toLowerCase()} />
                <span>
                  {a.message}
                  <small>{a.type.replaceAll('_', ' ')}</small>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            ))}
            {!alerts.length && (
              <p className="ops-empty">No actionable issues right now.</p>
            )}
          </div>
          <Link href="/my-work" className="ops-text-link">
            Review tasks and follow-ups →
          </Link>
        </section>
        <section className="panel ops-panel">
          <div className="ops-panel-heading">
            <h2>Upcoming activations</h2>
            <Link href="/peak-days">View all →</Link>
          </div>
          {peaks.slice(0, 4).map((p) => {
            const r = readiness(data, p);
            return (
              <Link
                href={'/peak-days/' + p.id}
                className="ops-event"
                key={p.id}
              >
                <span className="ops-calendar">
                  <CalendarDays size={18} />
                  {String(p.event_date).slice(8)}
                </span>
                <span>
                  <b>{p.name}</b>
                  <small>
                    {String(p.event_date)} · {r.locked} locked{' '}
                    {p.target_creators != null
                      ? `/ ${p.target_creators} target`
                      : ''}
                  </small>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            );
          })}
          {!peaks.length && (
            <p className="ops-empty">
              No upcoming events. Add a Peak Day to start planning.
            </p>
          )}
          <div className="ops-panel-heading">
            <h2>Marketplace contribution</h2>
          </div>
          {['TikTok', 'Shopee'].map((market) => {
            const s = metrics(data, period, market);
            return (
              <Link
                className="ops-market-row"
                key={market}
                href={'/' + market.toLowerCase()}
              >
                <Status value={market} />
                <b>{money(s.gmv, true)}</b>
                <span>{s.affiliates} affiliates with sales</span>
              </Link>
            );
          })}
        </section>
      </div>
      <CampaignMonitor period={period} />
      <section className="panel ops-panel">
        <div className="ops-panel-heading">
          <h2>Recent activity</h2>
        </div>
        {data.activity.slice(0, 5).map((a) => (
          <div className="ops-activity" key={a.id}>
            <span>{a.action}</span>
            <small>
              {a.user} · {a.created_at.slice(0, 10)}
            </small>
          </div>
        ))}
      </section>
    </>
  );
}
export function CampaignMonitor({
  period = periodRange(),
}: {
  period?: ReturnType<typeof periodRange>;
}) {
  const { data } = useWorkspace(),
    alerts = operationalAlerts(data);
  const rows = data.entities.campaigns
    .filter((c) => c.status === 'Active')
    .map((c) => ({
      c,
      m: metrics(data, period, 'Multi-platform', { campaign_id: c.id }),
      signals: alerts.filter((a) => a.entity_id === c.id).length,
    }))
    .sort((a, b) => b.signals - a.signals);
  return (
    <section className="panel ops-table-panel">
      <div className="ops-panel-heading">
        <h2>Campaign monitor</h2>
        <Link href="/campaigns/planning">Plan next month →</Link>
      </div>
      <div className="ops-scroll">
        <table className="ops-table">
          <thead>
            <tr>
              {[
                'Campaign',
                'GMV / target',
                'Achievement',
                'Creators / locked',
                'Stock risk',
                'Open tasks',
                'Status',
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, m }) => {
              const members = records(data, 'campaign_creators').filter(
                  (r) => r.campaign_id === c.id,
                ),
                stock = records(data, 'hsl_activations').filter(
                  (h) => h.campaign_id === c.id,
                );
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={'/campaigns/' + c.id}>{c.name}</Link>
                  </td>
                  <td>
                    {money(m.gmv, true)} /{' '}
                    {m.target === null ? '—' : money(m.target, true)}
                  </td>
                  <td>
                    {m.achievement === null
                      ? '—'
                      : m.achievement.toFixed(1) + '%'}
                  </td>
                  <td>
                    {members.length} /{' '}
                    {
                      members.filter((r) =>
                        ['Locked', 'Ready', 'Active', 'Completed'].includes(
                          r.status,
                        ),
                      ).length
                    }
                  </td>
                  <td>
                    <Link href={'/hsl?campaign_id=' + c.id}>
                      {stock.length
                        ? 'Review ' + stock.length + ' HSL'
                        : 'No HSL'}
                    </Link>
                  </td>
                  <td>
                    {
                      data.entities.tasks.filter(
                        (t) => t.campaign_id === c.id && t.status !== 'Done',
                      ).length
                    }
                  </td>
                  <td>
                    <Status value={c.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <div className="ops-empty">No active campaigns.</div>}
      </div>
    </section>
  );
}
export function MyWork() {
  const { data, save, name, canEdit } = useWorkspace(),
    [tab, setTab] = useState('Today'),
    [form, setForm] = useState<Partial<RecordData> | null>(null),
    today = todayISO();
  const rows = data.entities.tasks
    .filter((t) => t.status !== 'Done' && (!t.owner || t.owner === name))
    .filter((t) =>
      tab === 'Overdue'
        ? String(t.due_date) < today
        : tab === 'This week'
          ? String(t.due_date) >= today &&
            String(t.due_date) <= shiftDate(today, 6)
          : t.due_date === today,
    );
  return (
    <>
      <Heading
        title="My Work"
        description="Tasks, follow-ups, and your weekly operating rhythm."
      >
        <Button
          disabled={!canEdit('tasks')}
          onClick={() => setForm({ due_date: today, owner: name })}
        >
          <Plus size={15} />
          Create task
        </Button>
      </Heading>
      <div className="ops-tabs">
        {['Today', 'Overdue', 'This week', 'Recurring templates'].map((s) => (
          <button
            key={s}
            className={tab === s ? 'active' : ''}
            onClick={() => setTab(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {tab === 'Recurring templates' ? (
        <OperationsTable
          table="recurring_task_templates"
          actions={(r) =>
            canEdit('tasks') ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    name: r.name,
                    due_date: today,
                    owner: r.owner || name,
                    campaign_id: r.campaign_id,
                    recurrence_type: r.recurrence_type,
                    weekly_day: r.weekly_day,
                    monthly_week: r.monthly_week,
                    relative_campaign_event: r.relative_campaign_event,
                  })
                }
              >
                Create occurrence
              </Button>
            ) : null
          }
        />
      ) : (
        <section className="panel ops-panel">
          <AnimatePresence mode="popLayout">
            {rows.map((t) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="ops-task"
                key={t.id}
              >
                <button
                  disabled={!canEdit('tasks')}
                  aria-label={'Complete ' + t.name}
                  className="transition-transform active:scale-90 hover:scale-105"
                  onClick={() =>
                    save('tasks', { ...t, status: 'Done' }).catch((e) =>
                      toast.error(e.message),
                    )
                  }
                >
                  <Check size={15} />
                </button>
                <div>
                  <b>{t.name}</b>
                  <small>
                    {t.due_date} · {String(t.owner || 'Unassigned')}
                  </small>
                </div>
                <Status value={String(t.priority || 'Medium')} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setForm(t)}
                  disabled={!canEdit('tasks')}
                >
                  Edit
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
          {!rows.length && (
            <div className="ops-empty">
              <h3>No {tab.toLowerCase()} tasks</h3>
              <p>
                Your open tasks appear here when assigned to you or left
                unassigned.
              </p>
            </div>
          )}
        </section>
      )}
      <section className="panel ops-panel">
        <div className="ops-panel-heading">
          <h2>Follow-ups needing attention</h2>
          <Link href="/creators/outreach">Open Outreach →</Link>
        </div>
        {operationalAlerts(data)
          .filter((a) => ['FOLLOWUP_OVERDUE', 'SAMPLE_DELAY'].includes(a.type))
          .map((a) => (
            <Link className="ops-alert-link" key={a.id} href={a.href}>
              {a.message}
              <ArrowUpRight size={15} />
            </Link>
          ))}
      </section>
      {form && (
        <EntityForm
          entity="tasks"
          record={form}
          onClose={() => setForm(null)}
        />
      )}
    </>
  );
}
export function MonthlyPlanning() {
  const { data } = useWorkspace(),
    next = new Date();
  next.setMonth(next.getMonth() + 1, 1);
  const month = todayISO(next).slice(0, 8) + '01';
  return (
    <>
      <Heading
        title="Monthly planning"
        description="Prepare next month’s activation proposal and record the decisions."
      />
      <MetricCards
        items={[
          { label: 'Planning month', value: month.slice(0, 7) },
          {
            label: 'Upcoming campaigns',
            value: data.entities.campaigns.filter(
              (c) => String(c.start_date).slice(0, 7) === month.slice(0, 7),
            ).length,
          },
          {
            label: 'Upcoming Peak Days',
            value: records(data, 'peak_days').filter(
              (p) => String(p.event_date).slice(0, 7) === month.slice(0, 7),
            ).length,
          },
        ]}
      />
      <OperationsTable table="monthly_plans" createValues={{ month }} />
    </>
  );
}
export function ThresholdSettings() {
  const { data, role } = useWorkspace(),
    [edit, setEdit] = useState(false);
  const t = thresholds(data);
  return (
    <section className="panel ops-panel">
      <div className="ops-panel-heading">
        <div>
          <h2>Operational thresholds</h2>
          <p>Shared rules for performance, stock, samples, and reporting.</p>
        </div>
        <Button
          variant="outline"
          disabled={!canOperate(role, 'workspace_preferences')}
          onClick={() => setEdit(true)}
        >
          Adjust thresholds
        </Button>
      </div>
      <div className="info-grid">
        {Object.entries(t).map(([k, v]) => (
          <div key={k}>
            <small>{k.replaceAll('_', ' ')}</small>
            <p>{v}</p>
          </div>
        ))}
      </div>
      {edit && (
        <OpForm
          table="workspace_preferences"
          record={
            records(data, 'workspace_preferences')[0] || {
              name: 'Workspace thresholds',
              ...t,
            }
          }
          onClose={() => setEdit(false)}
        />
      )}
    </section>
  );
}
export function ProductPerformance({ id }: { id: string }) {
  const { data } = useWorkspace(),
    period = periodRange();
  return (
    <section className="panel ops-panel">
      <div className="ops-panel-heading">
        <h2>Product performance</h2>
        <span>MTD · data through {period.end}</span>
      </div>
      {['Shopee', 'TikTok'].map((market) => {
        const m = metrics(data, period, market, { product_id: id });
        return (
          <div key={market} className="ops-market-row">
            <Status value={market} />
            {m.records ? (
              <>
                <b>{money(m.gmv)}</b>
                <span>
                  {m.orders} orders · {m.units} units · {m.affiliates} creators
                  ·{' '}
                  {m.growth === null
                    ? 'no comparison baseline'
                    : m.growth.toFixed(1) + '% growth'}
                </span>
              </>
            ) : (
              <p>No product-attributed data. Map product_id during import.</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
