'use client';

import { useState } from 'react';
import { MarketplaceAnalytics } from '@/components/analytics/marketplace-analytics';
import { EntityTable } from './entity-table';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import { ArrowUpRight, BarChart3, Database } from 'lucide-react';

export function MarketplacePage({ market }: { market: 'TikTok' | 'Shopee' }) {
  const { data } = useWorkspace();
  const [viewMode, setViewMode] = useState<'analytics' | 'entities'>('analytics');
  const [entityTab, setEntityTab] = useState(market === 'TikTok' ? 'Creators' : 'Affiliates');

  const tt = market === 'TikTok';
  const accounts = tt ? data.tiktok_accounts : data.shopee_accounts;

  return (
    <div className="space-y-6">
      {/* Top Workspace View Mode Switcher */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('analytics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all ${
              viewMode === 'analytics'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            <BarChart3 size={14} />
            Analytics &amp; Performance
          </button>
          <button
            type="button"
            onClick={() => setViewMode('entities')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all ${
              viewMode === 'entities'
                ? 'bg-[#0F172A] text-white shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            <Database size={14} />
            Entity Records &amp; Tables
          </button>
        </div>

        <span className="text-[11px] font-medium text-[#64748B] hidden sm:inline-block">
          {viewMode === 'analytics'
            ? `${market} Analytics Workspace · Deterministic Attribution`
            : `${market} Raw Entities & Import History`}
        </span>
      </div>

      {viewMode === 'analytics' ? (
        <MarketplaceAnalytics market={market} />
      ) : (
        <div className="space-y-4">
          <Tabs value={entityTab} onValueChange={(v) => setEntityTab(String(v))}>
            <TabsList variant="line" className="tabs-nav w-full justify-start">
              <TabsTrigger value={tt ? 'Creators' : 'Affiliates'}>
                {tt ? 'Creators' : 'Affiliates'}
              </TabsTrigger>
              <TabsTrigger value="Campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="Products">Products</TabsTrigger>
              <TabsTrigger value="Imports">Imports</TabsTrigger>
            </TabsList>

            <TabsContent value={tt ? 'Creators' : 'Affiliates'}>
              <EntityTable
                entity="creators"
                embedded
                subset={data.entities.creators.filter((c) =>
                  accounts.some((a) => a.creator_id === c.id),
                )}
              />
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

            <TabsContent value="Imports">
              <section className="panel detail-panel bg-white p-6 rounded-2xl border border-[#E2E8F0]">
                <h2 className="text-base font-bold text-[#0F172A] mb-4">{market} import history</h2>
                <div className="space-y-3">
                  {data.imports
                    .filter((j) => j.marketplace === market)
                    .map((j) => (
                      <div className="settings-row flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9]" key={j.id}>
                        <div>
                          <strong className="text-xs font-semibold text-[#0F172A] block">{j.filename}</strong>
                          <p className="text-[11px] text-[#64748B]">
                            {j.rows} rows · {j.created_at.slice(0, 10)}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">{j.status}</span>
                      </div>
                    ))}
                </div>
                <div className="pt-4 mt-4 border-t border-[#F1F5F9]">
                  <Link
                    className="button-outline text-xs inline-flex items-center gap-1.5"
                    href={'/imports/' + market.toLowerCase()}
                  >
                    Open {market} Import Center <ArrowUpRight size={14} />
                  </Link>
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
