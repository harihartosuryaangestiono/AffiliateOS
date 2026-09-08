'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Music2,
  ShoppingBag,
  TrendingUp,
  Flag,
  Users,
  Clapperboard,
  CheckSquare,
  Upload,
  Clock3,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { money, number, sum, trend, initials } from '@/lib/data/metrics';
export function TrendChart({
  market = 'Overall',
  days = 30,
}: {
  market?: string;
  days?: number;
}) {
  const { data } = useWorkspace();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={trend(data, days)}
        margin={{ top: 12, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0071e3" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#0071e3" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="#efeff1"
          strokeDasharray="3 4"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={60}
          tick={{ fill: '#86868b', fontSize: 12 }}
          dy={8}
        />
        <YAxis
          tickFormatter={(v) => money(v)}
          width={63}
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#86868b', fontSize: 12 }}
        />
        <Tooltip
          formatter={(v) => money(Number(v), false)}
          contentStyle={{
            borderRadius: 10,
            border: '1px solid #e5e5e7',
            fontSize: 13,
          }}
        />
        {market !== 'Shopee' && (
          <Area
            type="monotone"
            name="TikTok"
            dataKey="TikTok"
            stroke="#0071e3"
            strokeWidth={2.5}
            fill="url(#blueFill)"
          />
        )}
        {market !== 'TikTok' && (
          <Area
            type="monotone"
            name="Shopee"
            dataKey="Shopee"
            stroke="#a6b6c9"
            strokeWidth={2}
            fill="transparent"
            strokeDasharray="4 4"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
export function PlatformIcon({ market }: { market: string }) {
  return (
    <span
      className={'platform-icon ' + (market === 'TikTok' ? 'tiktok' : 'shopee')}
    >
      {market === 'TikTok' ? <Music2 size={18} /> : <ShoppingBag size={18} />}
    </span>
  );
}
export function Dashboard() {
  const { data, name } = useWorkspace();
  const [period, setPeriod] = useState('This Month');
  const [market, setMarket] = useState('Overall');
  const days = period === 'Today' ? 1 : period === '7 Days' ? 7 : 30;
  const dates = trend(data, days).map((r) => r.date);
  const tt = data.tiktok_performance.filter((r) => dates.includes(r.date)),
    sp = data.shopee_performance.filter((r) => dates.includes(r.date));
  const total = sum(tt) + sum(sp);
  const pending = data.entities.tasks.filter((t) => t.status !== 'Done');
  const kpis = [
    { label: 'Total GMV', value: money(total), icon: TrendingUp },
    {
      label: 'Total orders',
      value: number(sum(tt, 'orders') + sum(sp, 'orders')),
      icon: ShoppingBag,
    },
    {
      label: 'Active campaigns',
      value: data.entities.campaigns.filter((c) => c.status === 'Active')
        .length,
      icon: Flag,
    },
    {
      label: 'Active creators',
      value: data.entities.creators.filter((c) => c.status === 'Active').length,
      icon: Users,
    },
    {
      label: 'Content published',
      value: tt.reduce((s, r) => s + r.video_count, 0),
      icon: Clapperboard,
    },
    { label: 'Pending tasks', value: pending.length, icon: CheckSquare },
  ];
  const ranked = data.entities.campaigns
    .map((c) => ({
      ...c,
      brand_id: c.brand_id,
      marketplace: c.marketplace,
      target_gmv: c.target_gmv,
      gmv:
        sum(tt.filter((r) => r.campaign_id === c.id)) +
        sum(sp.filter((r) => r.campaign_id === c.id)),
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 4);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="green-dot" />
            WORKSPACE OVERVIEW
          </div>
          <h1>
            Good morning, {name.split(' ')[0]}{' '}
            <span className="greeting-sun">☀</span>
          </h1>
          <p>Here’s what’s happening across your affiliate operations.</p>
        </div>
        <div className="heading-actions">
          <span className="date-label">
            <CalendarDays size={14} /> September 2026
          </span>
          <Link className="button-outline" href="/reports">
            View reports <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
      <div className="overview-controls">
        <Tabs value={period} onValueChange={(v) => setPeriod(String(v))}>
          <TabsList>
            {['Today', '7 Days', '30 Days', 'This Month'].map((v) => (
              <TabsTrigger key={v} value={v}>
                {v}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">
          Demo period · Sep {31 - days}–30, 2026 <span className="mx-2">·</span>{' '}
          IDR
        </span>
      </div>
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <section className="kpi-card" key={k.label}>
            <div className="kpi-label">
              {k.label}
              <k.icon size={15} />
            </div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-bottom">
              <span className={i === 5 ? 'neutral-stat' : 'positive-stat'}>
                {i === 5 ? <Clock3 size={12} /> : <ArrowUpRight size={12} />}{' '}
                {i === 5 ? 'Across campaigns' : 'Current period'}
              </span>
            </div>
          </section>
        ))}
      </div>
      <div className="section-heading">
        <h2>Marketplace performance</h2>
        <span className="subtle-text">
          Two marketplaces. One clear picture.
        </span>
      </div>
      <div className="marketplace-grid">
        {(['TikTok', 'Shopee'] as const).map((m) => {
          const rows = m === 'TikTok' ? tt : sp;
          return (
            <Link
              href={'/' + m.toLowerCase()}
              className="marketplace-card"
              key={m}
            >
              <div className="marketplace-card-header">
                <div className="flex items-center gap-3">
                  <PlatformIcon market={m} />
                  <h3>{m}</h3>
                  <span className="manual-badge">Manual import</span>
                </div>
                <ArrowUpRight size={17} className="text-neutral-400" />
              </div>
              <div className="marketplace-stats">
                <div>
                  <small>GMV</small>
                  <strong>{money(sum(rows))}</strong>
                  <span className="mini-caption">
                    {((sum(rows) / Math.max(total, 1)) * 100).toFixed(1)}% of
                    total GMV
                  </span>
                </div>
                <div>
                  <small>Orders</small>
                  <strong>{number(sum(rows, 'orders'))}</strong>
                </div>
                <div>
                  <small>{m === 'TikTok' ? 'Creators' : 'Affiliates'}</small>
                  <strong>{new Set(rows.map((r) => r.account_id)).size}</strong>
                </div>
                <div>
                  <small>{m === 'TikTok' ? 'Content' : 'Products sold'}</small>
                  <strong>
                    {m === 'TikTok'
                      ? tt.reduce((s, r) => s + r.video_count, 0)
                      : number(sum(sp, 'units_sold'))}
                  </strong>
                </div>
              </div>
              <div className="marketplace-card-footer">
                <span className="green-dot" /> Performance from imported reports{' '}
                <span className="ml-auto">
                  Open workspace <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="chart-grid">
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <h2>GMV trend</h2>
              <p>Daily performance across your marketplaces</p>
            </div>
            <Tabs value={market} onValueChange={(v) => setMarket(String(v))}>
              <TabsList>
                {['Overall', 'TikTok', 'Shopee'].map((v) => (
                  <TabsTrigger key={v} value={v}>
                    {v}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="chart-total">
            {money(
              market === 'TikTok'
                ? sum(tt)
                : market === 'Shopee'
                  ? sum(sp)
                  : total,
            )}
            <span>in selected period</span>
          </div>
          <TrendChart market={market} days={days} />
          <div className="chart-legend">
            <span>
              <i style={{ background: '#0071e3' }} />
              TikTok
            </span>
            <span>
              <i style={{ background: '#a6b6c9' }} />
              Shopee
            </span>
          </div>
        </section>
        <section className="panel contribution">
          <div className="panel-heading">
            <div>
              <h2>Marketplace contribution</h2>
              <p>Share of total GMV</p>
            </div>
          </div>
          <div className="donut">
            <ResponsiveContainer width="100%" height={185}>
              <PieChart>
                <Pie
                  data={[
                    { value: sum(tt), fill: '#0071e3' },
                    { value: sum(sp), fill: '#dbe6f2' },
                  ]}
                  innerRadius={63}
                  outerRadius={80}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={4}
                ></Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-label">
              <small>Total GMV</small>
              <strong>{money(total)}</strong>
            </div>
          </div>
          {[
            ['TikTok', sum(tt), '#0071e3'],
            ['Shopee', sum(sp), '#dbe6f2'],
          ].map(([m, v, c]) => (
            <div className="contribution-row" key={m}>
              <i style={{ background: String(c) }} />
              <span>{m}</span>
              <strong>{money(Number(v))}</strong>
              <small>
                {((Number(v) / Math.max(total, 1)) * 100).toFixed(1)}%
              </small>
            </div>
          ))}
        </section>
      </div>
      <div className="lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <div className="flex items-center gap-2">
              <h2>Campaign performance</h2>
              <span className="count-badge">
                {data.entities.campaigns.length}
              </span>
            </div>
            <Link className="text-link" href="/campaigns">
              All campaigns <ArrowRight size={13} />
            </Link>
          </div>
          <div className="compact-table">
            <div className="compact-table-head">
              <span>CAMPAIGN</span>
              <span>GMV</span>
              <span>TARGET PROGRESS</span>
            </div>
            {ranked.map((c, i) => (
              <Link
                href={'/campaigns/' + c.id}
                className="campaign-row"
                key={c.id}
              >
                <div className="flex items-center gap-3">
                  <span className={'brand-avatar color-' + i}>
                    {String(
                      data.entities.brands.find((b) => b.id === c.brand_id)
                        ?.name || 'A',
                    ).slice(0, 1)}
                  </span>
                  <div>
                    <strong>{c.name}</strong>
                    <small>
                      {
                        data.entities.brands.find((b) => b.id === c.brand_id)
                          ?.name
                      }{' '}
                      <span>·</span> {c.marketplace}
                    </small>
                  </div>
                </div>
                <strong>{money(c.gmv)}</strong>
                <div className="progress-cell">
                  <div className="progress-track">
                    <i
                      style={{
                        width:
                          Math.min((c.gmv / Number(c.target_gmv)) * 100, 100) +
                          '%',
                      }}
                    />
                  </div>
                  <span>
                    {Math.round((c.gmv / Number(c.target_gmv)) * 100)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel attention-panel">
          <div className="panel-heading">
            <h2>Needs attention</h2>
            <span className="amber-count">{pending.length}</span>
          </div>
          {[
            {
              icon: Clock3,
              title: `${pending.filter((t) => String(t.due_date) < '2026-09-08').length} tasks overdue`,
              caption: 'Keep your campaigns moving',
              url: '/tasks',
              color: 'amber',
            },
            {
              icon: Users,
              title: `${data.entities.creators.filter((c) => c.status === 'Watchlist').length} creator on your watchlist`,
              caption: 'Review creator details',
              url: '/creators?status=Watchlist',
              color: 'blue',
            },
            {
              icon: Upload,
              title: 'Keep your performance up to date',
              caption: 'Upload your latest marketplace reports',
              url: '/imports',
              color: 'neutral',
            },
          ].map((a) => (
            <Link className="attention-item" href={a.url} key={a.title}>
              <span className={'attention-icon ' + a.color}>
                <a.icon size={16} />
              </span>
              <span>
                <strong>{a.title}</strong>
                <small>{a.caption}</small>
              </span>
              <ArrowRight size={14} />
            </Link>
          ))}
        </section>
      </div>
      <div className="lower-grid bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Top creators</h2>
            <Link className="text-link" href="/creators">
              View creators <ArrowRight size={13} />
            </Link>
          </div>
          {data.entities.creators.slice(0, 3).map((c, i) => (
            <Link className="top-creator" href={'/creators/' + c.id} key={c.id}>
              <span className="rank">0{i + 1}</span>
              <span className={'avatar color-' + i}>{initials(c.name)}</span>
              <div>
                <strong>{c.name}</strong>
                <small>{c.category} · TikTok</small>
              </div>
              <strong className="ml-auto">
                {money(
                  sum(
                    tt.filter(
                      (r) =>
                        data.tiktok_accounts.find((a) => a.id === r.account_id)
                          ?.creator_id === c.id,
                    ),
                  ),
                )}
              </strong>
              <ArrowUpRight size={14} />
            </Link>
          ))}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent activity</h2>
            <Link className="text-link" href="/imports">
              Import history <ArrowRight size={13} />
            </Link>
          </div>
          {data.activity.slice(0, 3).map((a) => (
            <div className="activity-item" key={a.id}>
              <span className="activity-dot" />
              <div>
                <strong>{a.action}</strong>
                <small>
                  {a.user} ·{' '}
                  {new Date(a.created_at).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </small>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
