'use client';
import { periodRange } from '@/lib/operations/engine';
import { thresholds } from '@/lib/operations/config';
import { usePeriod, PeriodControl } from '@/components/workflows/primitives';
import { useState } from 'react';
import Link from 'next/link';
import { Upload, ArrowUpRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { PlatformIcon } from '@/components/dashboard/dashboard';
import { sum, money, number, initials } from '@/lib/data/metrics';
import { EntityTable } from './entity-table';
import { EmptyState } from './shared';
import { GrowthChart } from '@/components/dashboard/growth-chart';
export function MarketplacePage({ market }: { market: 'TikTok' | 'Shopee' }) {
  const { data } = useWorkspace();
  const [tab, setTab] = useState('Overview');
  const { mode, setMode, custom, setCustom } = usePeriod();
  const period = periodRange(
    mode,
    new Date(),
    thresholds(data).cutoff_days,
    custom,
  );
  const tt = market === 'TikTok';
  const rows = (tt ? data.tiktok_performance : data.shopee_performance).filter(
    (r) => r.date >= period.start && r.date <= period.end,
  );
  const accounts = tt ? data.tiktok_accounts : data.shopee_accounts;
  const ranks = accounts
    .map((a) => ({
      ...a,
      gmv: sum(rows.filter((p) => p.account_id === a.id)),
      orders: sum(
        rows.filter((p) => p.account_id === a.id),
        'orders',
      ),
    }))
    .sort((a, b) => b.gmv - a.gmv);
  const tabs = [
    'Overview',
    tt ? 'Creators' : 'Affiliates',
    'Performance',
    tt ? 'Content' : 'Products',
    'Campaigns',
    'Imports',
  ];
  const chart = (
    <div className="mb-5">
      <GrowthChart market={market} period={period} />
    </div>
  );
  return (
    <>
      <div className="page-heading">
        <div className="detail-heading">
          <PlatformIcon market={market} />
          <div>
            <h1>{market} workspace</h1>
            <p>
              {tt
                ? 'Creator-led performance. Every video, every conversion.'
                : 'Affiliate performance, from product discovery to purchase.'}
            </p>
          </div>
        </div>
        <Link
          className="button-outline"
          href={'/imports/' + market.toLowerCase()}
        >
          <Upload size={14} />
          Import {market} data
        </Link>
      </div>
      <PeriodControl
        mode={mode}
        onMode={setMode}
        custom={custom}
        onCustom={setCustom}
        period={period}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="line" className="tabs-nav w-full justify-start">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="Overview">
          <div className="metric-strip">
            {[
              { label: market + ' GMV', value: money(sum(rows)) },
              { label: 'Orders', value: number(sum(rows, 'orders')) },
              {
                label: tt ? 'Active creators' : 'Active affiliates',
                value: accounts.length,
              },
              {
                label: tt ? 'Content published' : 'Products sold',
                value: tt
                  ? data.tiktok_performance
                      .filter(
                        (r) => r.date >= period.start && r.date <= period.end,
                      )
                      .reduce((s, p) => s + p.video_count, 0)
                  : number(sum(rows, 'units_sold')),
              },
            ].map((k) => (
              <div className="kpi-card" key={k.label}>
                <small>{k.label}</small>
                <strong>{k.value}</strong>
              </div>
            ))}
          </div>
          {chart}
          <section className="panel">
            <div className="panel-heading">
              <h2>Top {tt ? 'creators' : 'affiliates'}</h2>
              <span className="text-xs text-muted-foreground">
                Average GMV / {tt ? 'creator' : 'affiliate'}:{' '}
                {money(sum(rows) / Math.max(accounts.length, 1))}
              </span>
            </div>
            {ranks.slice(0, 8).map((a, i) => {
              const c = data.entities.creators.find(
                (c) => c.id === a.creator_id,
              );
              return (
                <Link
                  className="top-creator"
                  key={a.id}
                  href={'/creators/' + a.creator_id}
                >
                  <span className="rank">{i + 1}</span>
                  <span className={'avatar color-' + (i % 4)}>
                    {initials(c?.name || a.username)}
                  </span>
                  <div>
                    <strong>{c?.name || a.username}</strong>
                    <small>{a.username}</small>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {number(a.orders)} orders
                  </span>
                  <strong>{money(a.gmv)}</strong>
                  <ArrowUpRight size={14} />
                </Link>
              );
            })}
            {!rows.length && (
              <EmptyState
                title={'No ' + market + ' data yet'}
                description={
                  'Import your first ' +
                  market +
                  ' affiliate report to start tracking performance.'
                }
              >
                <Link
                  className="button-outline"
                  href={'/imports/' + market.toLowerCase()}
                >
                  Import {market} data
                </Link>
              </EmptyState>
            )}
          </section>
        </TabsContent>
        <TabsContent value={tt ? 'Creators' : 'Affiliates'}>
          <EntityTable
            entity="creators"
            embedded
            subset={data.entities.creators.filter((c) =>
              accounts.some((a) => a.creator_id === c.id),
            )}
          />
        </TabsContent>
        <TabsContent value="Performance">
          {chart}
          <div className="info-notice">
            All metrics in this workspace come exclusively from {market}{' '}
            performance records. Each record retains its source import.
          </div>
        </TabsContent>
        <TabsContent value="Campaigns">
          <EntityTable
            entity="campaigns"
            embedded
            subset={data.entities.campaigns.filter(
              (c) =>
                c.marketplace === market || c.marketplace === 'Multi-platform',
            )}
          />
        </TabsContent>
        <TabsContent value="Products">
          <EntityTable entity="products" embedded />
        </TabsContent>
        <TabsContent value="Content">
          <section className="panel">
            <EmptyState
              title="Content-level performance coming soon"
              description="Daily TikTok content counts are available in the overview. Individual videos and live sessions will be supported in a future import configuration."
            >
              <span className="coming-soon">Coming Soon</span>
            </EmptyState>
          </section>
        </TabsContent>
        <TabsContent value="Imports">
          <section className="panel detail-panel">
            <h2>{market} import history</h2>
            {data.imports
              .filter((j) => j.marketplace === market)
              .map((j) => (
                <div className="settings-row" key={j.id}>
                  <div>
                    <strong>{j.filename}</strong>
                    <p>
                      {j.rows} rows · {j.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <span>{j.status}</span>
                </div>
              ))}
            <Link
              className="button-outline mt-5"
              href={'/imports/' + market.toLowerCase()}
            >
              Open {market} Import Center <ArrowUpRight size={14} />
            </Link>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
