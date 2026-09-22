'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Check,
  Flag,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { money, number, initials } from '@/lib/data/metrics';
import {
  metrics,
  operationalAlerts,
  periodRange,
  shiftDate,
  todayISO,
  readiness,
} from '@/lib/operations/engine';
import { records, thresholds } from '@/lib/operations/config';
import { GrowthChart } from './growth-chart';
import { CampaignMonitor } from '@/components/workflows/workspace';
import { ActionCenter } from '@/components/workflows/action-center';
import { toast } from 'sonner';

export function CommandCenter() {
  const { data, name, demo, save, canEdit } = useWorkspace();
  const [range, setRange] = useState('MTD');
  const [market, setMarket] = useState('Multi-platform');
  const [saving, setSaving] = useState<string | null>(null);
  const today = todayISO();
  const start =
    range === 'Today'
      ? today
      : range === '7D'
        ? shiftDate(today, -6)
        : range === '30D'
          ? shiftDate(today, -29)
          : range === 'YTD'
            ? today.slice(0, 4) + '-01-01'
            : range === 'QTD'
              ? `${today.slice(0, 4)}-${String(Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, '0')}-01`
              : today.slice(0, 8) + '01';
  const period = periodRange(
    'Custom',
    new Date(),
    thresholds(data).cutoff_days,
    { start, end: today },
  );
  const m = metrics(data, period, market);
  const alerts = operationalAlerts(data);
  const tasks = data.entities.tasks
    .filter((t) => t.status !== 'Done' && (!t.owner || t.owner === name))
    .sort((a, b) =>
      String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')),
    );
  const peaks = records(data, 'peak_days')
    .filter((p) => String(p.event_date) >= today)
    .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Asia/Jakarta',
    }).format(new Date()),
  );
  const metricItems = [
    {
      label: 'Affiliate GMV',
      value: money(m.gmv, true),
      detail:
        m.growth === null
          ? 'No previous comparison baseline'
          : `${m.growth >= 0 ? '↑' : '↓'} ${Math.abs(m.growth).toFixed(1)}% vs. previous period`,
      icon: TrendingUp,
      tone: 'blue',
      href: '/creators/performance',
      growth: m.growth,
    },
    {
      label: 'Campaign target',
      value: m.target === null ? 'Not set' : money(m.target, true),
      detail:
        m.achievement === null
          ? 'Set your campaign targets'
          : `${m.achievement.toFixed(1)}% achieved`,
      icon: Target,
      tone: 'green',
      href: '/settings/targets',
      achievement: m.achievement,
    },
    {
      label: 'Affiliates with sales',
      value: number(m.affiliates),
      detail: `${m.activeCreators} active creators${m.affiliatesTarget === null ? '' : ' · target ' + m.affiliatesTarget}`,
      icon: Users,
      tone: 'violet',
      href: '/creators/performance',
    },
    {
      label: 'Orders',
      value: number(m.orders),
      detail: `${number(m.units)} units sold`,
      icon: ShoppingCart,
      tone: 'rose',
      href: '/imports',
    },
    {
      label: 'Active campaigns',
      value: data.entities.campaigns.filter((c) => c.status === 'Active')
        .length,
      detail: 'Across your workspace',
      icon: Flag,
      tone: 'green',
      href: '/campaigns',
    },
  ];
  return (
    <div className="command-center">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            GOOD {hour < 12 ? 'MORNING' : hour < 18 ? 'AFTERNOON' : 'EVENING'},{' '}
            {name.split(' ')[0].toUpperCase()} <span aria-hidden="true">✦</span>
          </p>
          <h1>
            Turn creators
            <br />
            into <span>real growth.</span>
          </h1>
          <p>Creators, campaigns, and performance — all in one place.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="ribbon ribbon-one" />
          <div className="ribbon ribbon-two" />
          <div className="ribbon ribbon-three" />
          <span className="hero-manifesto">
            Good partnerships.
            <br />
            <em>Extraordinary</em> possibilities.
          </span>
          <span className="hero-note">
            A BIGGER
            <br />
            CREATOR
            <br />
            ECONOMY.
            <i />
          </span>
        </div>
      </section>
      <div className="dashboard-controls">
        <div className="range-segments" aria-label="Performance period">
          {['Today', '7D', '30D', 'MTD', 'QTD', 'YTD'].map((x) => (
            <button
              key={x}
              aria-pressed={range === x}
              className={range === x ? 'active' : ''}
              onClick={() => setRange(x)}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="dashboard-cutoff">
          {demo && <span className="demo-indicator">Demo data</span>}
          <span>Data through {period.cutoff}</span>
          <select
            aria-label="Dashboard marketplace"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
          >
            {['Multi-platform', 'TikTok', 'Shopee'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="dashboard-metrics">
        {metricItems.map((item) => (
          <Link
            href={item.href}
            className={`dashboard-metric tone-${item.tone}`}
            key={item.label}
          >
            <div className="dashboard-metric-label">
              <span className="metric-symbol">
                <item.icon size={20} />
              </span>
              {item.label}
              <ArrowUpRight className="metric-link-arrow" size={13} />
            </div>
            <strong>{item.value}</strong>
            <small
              className={
                item.growth != null
                  ? item.growth < 0
                    ? 'trend-negative'
                    : 'trend-positive'
                  : ''
              }
            >
              {item.detail}
            </small>
            {item.achievement != null && (
              <div
                className="target-track"
                aria-label={`${item.achievement.toFixed(1)}% target achieved`}
              >
                <span
                  style={{
                    width: `${Math.min(100, Math.max(0, item.achievement))}%`,
                  }}
                />
              </div>
            )}
          </Link>
        ))}
      </div>
      {!m.records && period.start <= period.end && (
        <div className="info-notice">
          No processed orders for this selection.{' '}
          <Link href="/imports">
            Import performance data <ArrowUpRight size={13} />
          </Link>
        </div>
      )}
      <div className="dashboard-body">
        <div className="dashboard-primary">
          <GrowthChart period={period} market={market} />
          <div className="dashboard-quick-actions">
            {[
              {
                title: 'Discover new creators',
                text: 'Find your next great partnership.',
                href: '/creators/acquisition',
                icon: Users,
                tone: 'green',
              },
              {
                title: 'Explore performance',
                text: 'See what is driving your results.',
                href: '/performance',
                icon: ChartNoAxesCombined,
                tone: 'blue',
              },
              {
                title: canEdit('campaigns')
                  ? 'Create a campaign'
                  : 'Explore campaigns',
                text: 'Bring your next big idea to life.',
                href: canEdit('campaigns')
                  ? '/campaigns?create=1'
                  : '/campaigns',
                icon: Sparkles,
                tone: 'violet',
              },
            ].map((a) => (
              <Link
                className={`dashboard-quick-action tone-${a.tone}`}
                key={a.href}
                href={a.href}
              >
                <span className="metric-symbol">
                  <a.icon size={24} />
                </span>
                <span>
                  <b>{a.title}</b>
                  <small>{a.text}</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </div>
        <aside className="dashboard-context">
          <Link href="/actions" className="focus-banner">
            <span className="focus-art" aria-hidden="true">
              <Sparkles size={26} />
            </span>
            <span>
              <small>TODAY’S FOCUS</small>
              <b>
                {alerts.length
                  ? 'Keep the momentum going.'
                  : 'Make room for your next idea.'}
              </b>
              <p>
                {alerts.length
                  ? `${alerts.length} signals to turn into next steps.`
                  : 'Your workspace is clear of operational alerts.'}
              </p>
            </span>
            <ArrowRight size={18} />
          </Link>
          <section className="panel dashboard-tasks">
            <div className="ops-panel-heading">
              <h2>
                My tasks <span>{tasks.length}</span>
              </h2>
              <Link href="/my-work">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {tasks.slice(0, 4).map((t) => (
              <div className="dashboard-task" key={t.id}>
                <button
                  aria-label={'Complete ' + t.name}
                  disabled={!canEdit('tasks') || saving === t.id}
                  onClick={async () => {
                    setSaving(t.id);
                    try {
                      await save('tasks', { ...t, status: 'Done' });
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : 'Could not complete task',
                      );
                    } finally {
                      setSaving(null);
                    }
                  }}
                >
                  <Check size={12} />
                </button>
                <Link href={'/tasks/' + t.id}>{t.name}</Link>
                <span
                  className={
                    t.due_date && String(t.due_date) < today
                      ? 'task-overdue'
                      : 'task-due'
                  }
                >
                  {!t.due_date
                    ? 'No date'
                    : String(t.due_date) < today
                      ? 'Overdue'
                      : t.due_date === today
                        ? 'Today'
                        : String(t.due_date).slice(5)}
                </span>
              </div>
            ))}
            {!tasks.length && (
              <p className="context-empty">
                You’re all caught up. Your next assigned task will appear here.
              </p>
            )}
          </section>
          <section className="panel dashboard-activity">
            <div className="ops-panel-heading">
              <h2>Recent activity</h2>
              <Link href="/my-work">
                My work <ArrowRight size={13} />
              </Link>
            </div>
            {data.activity.slice(0, 4).map((a) => (
              <div className="dashboard-activity-row" key={a.id}>
                <span className="avatar">{initials(a.user)}</span>
                <div>
                  <b>{a.user}</b>
                  <p>{a.action}</p>
                </div>
                <time dateTime={a.created_at}>{a.created_at.slice(5, 10)}</time>
              </div>
            ))}
            {!data.activity.length && (
              <p className="context-empty">
                Workspace updates will appear here as your team takes action.
              </p>
            )}
          </section>
        </aside>
      </div>
      <div className="section-heading dashboard-section-heading">
        <div>
          <p className="eyebrow">FROM INSIGHT TO ACTION</p>
          <h2>Your operating picture</h2>
        </div>
        <Link href="/campaigns/planning" className="text-link">
          Plan ahead <ArrowUpRight size={14} />
        </Link>
      </div>
      <CampaignMonitor period={period} />
      <div className="ops-two-col">
        <ActionCenter compact />
        <section className="panel ops-panel">
          <div className="ops-panel-heading">
            <h2>Upcoming activations</h2>
            <Link href="/peak-days">View all →</Link>
          </div>
          {peaks.slice(0, 3).map((p) => {
            const r = readiness(data, p);
            return (
              <Link
                className="ops-event"
                key={p.id}
                href={'/peak-days/' + p.id}
              >
                <span className="event-date">
                  <b>{String(p.event_date).slice(8)}</b>
                  <small>
                    {new Intl.DateTimeFormat('en', {
                      month: 'short',
                      timeZone: 'UTC',
                    }).format(new Date(String(p.event_date) + 'T12:00:00Z'))}
                  </small>
                </span>
                <span>
                  <b>{p.name}</b>
                  <small>
                    {r.locked} creators locked
                    {p.target_creators == null
                      ? ''
                      : ` / ${p.target_creators} target`}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
            );
          })}
          {!peaks.length && (
            <p className="context-empty">
              No upcoming Peak Days. Start planning your next activation.
            </p>
          )}
          <div className="market-contributions">
            {['TikTok', 'Shopee'].map((platform) => {
              const value = metrics(data, period, platform);
              return (
                <Link href={'/' + platform.toLowerCase()} key={platform}>
                  <span className={'platform-dot ' + platform.toLowerCase()} />
                  <span>{platform}</span>
                  <b>{money(value.gmv, true)}</b>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
