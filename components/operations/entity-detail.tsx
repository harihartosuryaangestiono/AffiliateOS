'use client';
import { ProductPerformance } from '@/components/workflows/workspace';
import { useSearchParams } from 'next/navigation';
import { ActivationTable, CreatorQuickActions, Outreach, PerformanceWatch } from '@/components/workflows/creators';
import { HSL, Samples } from '@/components/workflows/activations';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { EntityForm } from './entity-form';
import { EntityTable, displayValue } from './entity-table';
import { Status, EmptyState, Choice } from './shared';
import { config } from '@/lib/data/config';
import { initials, sum, money, number } from '@/lib/data/metrics';
import type { Entity, Account } from '@/types/domain';
import { PlatformIcon } from '@/components/dashboard/dashboard';
import { toast } from 'sonner';
export function EntityDetail({ entity, id }: { entity: Entity; id: string }) {
  const searchParams = useSearchParams();
  const { data, setData, demo, canEdit } = useWorkspace();
  const record = data.entities[entity].find((r) => r.id === id);
  const [edit, setEdit] = useState(false),
    [tab, setTab] = useState(searchParams.get('tab') || 'Overview'),
    [account, setAccount] = useState<'TikTok' | 'Shopee' | null>(null),
    [username, setUsername] = useState(''),
    [followers, setFollowers] = useState('0'),
    [association, setAssociation] = useState(''),
    [accountError, setAccountError] = useState('');
  if (!record)
    return (
      <EmptyState
        title={config[entity].singular + ' not found'}
        description="This record may have been removed."
      >
        <Link className="button-outline" href={'/' + entity}>
          Back to {entity}
        </Link>
      </EmptyState>
    );
  const tabs =
    entity === 'clients'
      ? ['Overview', 'Brands', 'Campaigns', 'Performance', 'Files', 'Activity']
      : entity === 'campaigns'
        ? [
            'Overview',
            'Creators',
            'Creator Activation',
            'Products',
            'Content',
            'Performance',
            'Tasks',
            'Files',
            'Activity',
          ]
        : entity === 'creators'
          ? [
              'Overview',
              'TikTok',
              'Shopee',
              'Campaigns',
              'HSL', 'Samples', 'Outreach',
              'Content',
              'Performance',
              'Notes',
              'Activity',
            ]
          : ['Overview', 'Activity'];
  const brandIds =
    entity === 'clients'
      ? data.entities.brands.filter((b) => b.client_id === id).map((b) => b.id)
      : entity === 'brands'
        ? [id]
        : [];
  const campaignIds =
    entity === 'campaigns'
      ? [id]
      : entity === 'creators'
        ? data.campaign_creators
            .filter((c) => c.creator_id === id)
            .map((c) => c.campaign_id)
        : data.entities.campaigns
            .filter((c) => brandIds.includes(String(c.brand_id)))
            .map((c) => c.id);
  const accountIds = {
    TikTok: data.tiktok_accounts
      .filter((a) => a.creator_id === id)
      .map((a) => a.id),
    Shopee: data.shopee_accounts
      .filter((a) => a.creator_id === id)
      .map((a) => a.id),
  };
  const tt = data.tiktok_performance.filter((p) =>
    entity === 'creators'
      ? accountIds.TikTok.includes(p.account_id)
      : campaignIds.includes(p.campaign_id),
  );
  const sp = data.shopee_performance.filter((p) =>
    entity === 'creators'
      ? accountIds.Shopee.includes(p.account_id)
      : campaignIds.includes(p.campaign_id),
  );
  const performance = (
    <div className="marketplace-grid">
      {(['TikTok', 'Shopee'] as const)
        .filter((m) => !['TikTok', 'Shopee'].includes(tab) || tab === m)
        .map((m) => (
          <section className="panel detail-panel" key={m}>
            <div className="flex items-center gap-3 mb-5">
              <PlatformIcon market={m} />
              <h3>{m} performance</h3>
            </div>
            <div className="info-grid">
              <div>
                <small className="text-muted-foreground">GMV</small>
                <h1 className="mt-2">{money(sum(m === 'TikTok' ? tt : sp))}</h1>
              </div>
              <div>
                <small className="text-muted-foreground">Orders</small>
                <h1 className="mt-2">
                  {number(sum(m === 'TikTok' ? tt : sp, 'orders'))}
                </h1>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-5">
              From {(m === 'TikTok' ? tt : sp).length} daily performance records
              ·{' '}
              <Link
                className="text-blue-600"
                href={'/imports/' + m.toLowerCase()}
              >
                View sources
              </Link>
            </p>
          </section>
        ))}
    </div>
  );
  async function addAccount(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setAccountError('');
    const key = account === 'TikTok' ? 'tiktok_accounts' : 'shopee_accounts';
    const clean = username.trim();
    if (!clean || !/^[a-zA-Z0-9@._-]+$/.test(clean)) {
      setAccountError('Enter a valid account username.');
      return;
    }
    if (
      data[key].some((a) => a.username.toLowerCase() === clean.toLowerCase())
    ) {
      setAccountError('This marketplace account is already registered.');
      return;
    }
    const value: Account = {
      id: crypto.randomUUID(),
      creator_id: id,
      username: clean,
      followers: Number(followers) || 0,
      status: 'Active',
    };
    try {
      if (!demo) {
        const r = await fetch('/api/relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: key, record: value }),
        });
        if (!r.ok) throw Error('Account could not be saved.');
      }
      setData({ ...data, [key]: [...data[key], value] });
      setAccount(null);
      setUsername('');
      toast.success('Marketplace account added');
    } catch (e) {
      setAccountError(
        e instanceof Error ? e.message : 'Could not save account',
      );
    }
  }
  async function associate() {
    if (!association) return;
    const value = {
      id: crypto.randomUUID(),
      campaign_id: id,
      creator_id: association,
    };
    try {
      if (!demo) {
        const r = await fetch('/api/relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'campaign_creators', record: value }),
        });
        if (!r.ok) throw Error('Could not associate creator.');
      }
      setData({
        ...data,
        campaign_creators: [...data.campaign_creators, value],
      });
      setAssociation('');
      toast.success('Creator added to campaign');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add creator');
    }
  }
  return (
    <>
      <Link className="back-link" href={'/' + entity}>
        <ArrowLeft size={14} />
        Back to {entity}
      </Link>
      <div className="page-heading">
        <div className="detail-heading">
          <span className="avatar color-0">{initials(record.name)}</span>
          <div>
            <h1>{record.name}</h1>
            <div className="flex gap-3 items-center mt-2">
              <Status value={record.status} />
              <span className="text-xs text-muted-foreground">
                {record.category ||
                  record.marketplace ||
                  config[entity].singular}
              </span>
            </div>
          </div>
        </div>
        {canEdit(entity) && (
          <Button variant="outline" onClick={() => setEdit(true)}>
            <Pencil size={14} />
            Edit {config[entity].singular.toLowerCase()}
          </Button>
        )}
      </div>
      {entity === 'creators' && <CreatorQuickActions id={id} />}
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="line" className="tabs-nav w-full justify-start">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        {tab === 'Creator Activation' && <TabsContent value={tab}><ActivationTable campaignId={id}/></TabsContent>}
        {entity === 'creators' && tab === 'HSL' && <TabsContent value={tab}><HSL creatorId={id}/></TabsContent>}
        {entity === 'creators' && tab === 'Samples' && <TabsContent value={tab}><Samples creatorId={id}/></TabsContent>}
        {entity === 'creators' && tab === 'Outreach' && <TabsContent value={tab}><Outreach creatorId={id}/></TabsContent>}

        <TabsContent value="Overview">
          {entity === "products" && <ProductPerformance id={id}/>}
          <div className="detail-grid mb-5">
            <section className="panel detail-panel">
              <h2>{config[entity].singular} information</h2>
              <dl className="info-grid">
                {config[entity].fields
                  .filter((f) => !['name', 'notes', 'status'].includes(f.key))
                  .map((f) => (
                    <div key={f.key}>
                      <dt>{f.label}</dt>
                      <dd>
                        {f.key.includes('gmv')
                          ? record[f.key] === null || record[f.key] === undefined || record[f.key] === ''
                            ? 'Not set'
                            : money(Number(record[f.key]))
                          : displayValue(f.key, record, entity, data) || '—'}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>
            <section className="panel detail-panel">
              <h2>At a glance</h2>
              <dl className="info-grid">
                <div>
                  <dt>Campaigns</dt>
                  <dd>{campaignIds.length}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{record.created_at.slice(0, 10)}</dd>
                </div>
                <div>
                  <dt>TikTok accounts</dt>
                  <dd>{accountIds.TikTok.length}</dd>
                </div>
                <div>
                  <dt>Shopee accounts</dt>
                  <dd>{accountIds.Shopee.length}</dd>
                </div>
              </dl>
              <div className="info-notice">
                Marketplace performance remains independently attributed to its
                original import.
              </div>
            </section>
          </div>
          {['clients', 'campaigns', 'creators', 'brands'].includes(entity) &&
            performance}
        </TabsContent>
        <TabsContent value="Performance">{entity === "creators" ? <PerformanceWatch creatorId={id}/> : performance}</TabsContent>
        <TabsContent value="Brands">
          <EntityTable
            entity="brands"
            embedded
            subset={data.entities.brands.filter((b) => b.client_id === id)}
          />
        </TabsContent>
        <TabsContent value="Campaigns">
          <EntityTable
            entity="campaigns"
            embedded
            subset={data.entities.campaigns.filter((c) =>
              campaignIds.includes(c.id),
            )}
          />
        </TabsContent>
        <TabsContent value="Creators">
          {canEdit(entity) && (
            <div className="flex gap-3 mb-5 max-w-lg">
              <Choice
                label="Add creator to campaign"
                placeholder="Select a creator"
                value={association}
                onChange={setAssociation}
                options={data.entities.creators
                  .filter(
                    (c) =>
                      !data.campaign_creators.some(
                        (cc) => cc.campaign_id === id && cc.creator_id === c.id,
                      ),
                  )
                  .map((c) => ({ value: c.id, label: c.name }))}
              />
              <Button disabled={!association} onClick={associate}>
                <Plus size={14} />
                Add creator
              </Button>
            </div>
          )}
          <EntityTable
            entity="creators"
            embedded
            subset={data.entities.creators.filter((c) =>
              data.campaign_creators.some(
                (cc) => cc.campaign_id === id && cc.creator_id === c.id,
              ),
            )}
          />
        </TabsContent>
        <TabsContent value="Tasks">
          <EntityTable
            entity="tasks"
            embedded
            subset={data.entities.tasks.filter((t) => t.campaign_id === id)}
          />
        </TabsContent>
        <TabsContent value="Products">
          <EntityTable
            entity="products"
            embedded
            subset={data.entities.products.filter(
              (p) => p.brand_id === record.brand_id,
            )}
          />
          <p className="text-xs text-muted-foreground mt-3">
            Products available from this campaign’s brand. Campaign product
            selection is coming soon.
          </p>
        </TabsContent>
        {(['TikTok', 'Shopee'] as const).map((m) => (
          <TabsContent value={m} key={m}>
            <div className="section-heading">
              <h2>{m} accounts</h2>
              {canEdit('creators') && (
                <Button onClick={() => setAccount(m)}>
                  <Plus size={14} />
                  Add {m} account
                </Button>
              )}
            </div>
            {data[m === 'TikTok' ? 'tiktok_accounts' : 'shopee_accounts']
              .filter((a) => a.creator_id === id)
              .map((a) => (
                <div className="panel detail-panel mb-5" key={a.id}>
                  <div className="flex items-center gap-3">
                    <PlatformIcon market={m} />
                    <h3>{a.username}</h3>
                    <Status value={a.status} />
                    <span className="ml-auto text-muted-foreground">
                      {number(a.followers)} followers
                    </span>
                  </div>
                </div>
              ))}
            {!accountIds[m].length && (
              <EmptyState
                title={'No ' + m + ' account yet'}
                description="Link this creator’s marketplace identity to keep their performance organized."
              />
            )}
            {performance}
          </TabsContent>
        ))}
        <TabsContent value="Notes">
          <section className="panel detail-panel">
            <h2>Internal notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {record.notes ||
                'No notes yet. Edit this creator to add context for your team.'}
            </p>
            {canEdit(entity) && (
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => setEdit(true)}
              >
                Edit notes
              </Button>
            )}
          </section>
        </TabsContent>
        <TabsContent value="Activity">
          <section className="panel">
            {data.activity.filter((a) => a.entity_id === id).length ? (
              data.activity
                .filter((a) => a.entity_id === id)
                .map((a) => (
                  <div className="activity-item" key={a.id}>
                    <span className="activity-dot" />
                    <div>
                      <strong>{a.action}</strong>
                      <small>
                        {a.user} · {a.created_at.slice(0, 10)}
                      </small>
                    </div>
                  </div>
                ))
            ) : (
              <EmptyState
                title="No activity recorded yet"
                description="Changes to this record will appear here."
              />
            )}
          </section>
        </TabsContent>
        {['Files', 'Content'].map((t) => (
          <TabsContent value={t} key={t}>
            <section className="panel">
              <EmptyState
                title={
                  t === 'Files'
                    ? 'No files attached'
                    : 'Content library coming soon'
                }
                description={
                  t === 'Files'
                    ? 'Campaign and client file attachments are planned for the next phase.'
                    : 'Content-level imports will appear here once their mapping is configured.'
                }
              >
                <span className="coming-soon">Coming Soon</span>
              </EmptyState>
            </section>
          </TabsContent>
        ))}
      </Tabs>
      {edit && (
        <EntityForm
          entity={entity}
          record={record}
          onClose={() => setEdit(false)}
        />
      )}
      <Sheet open={!!account} onOpenChange={(v) => !v && setAccount(null)}>
        <SheetContent className="p-6">
          <SheetHeader>
            <SheetTitle>Add {account} account</SheetTitle>
            <SheetDescription>
              Link a separate marketplace account to {record.name}.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={addAccount} className="space-y-5">
            <label htmlFor="account-username" className="form-field block">
              Username
              <Input
                required
                id="account-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={
                  account === 'TikTok' ? '@creatorname' : 'creator.store'
                }
                className="mt-2"
              />
            </label>
            <label htmlFor="account-followers" className="form-field block">
              Followers
              <Input
                type="number"
                min="0"
                id="account-followers"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                className="mt-2"
              />
            </label>
            {accountError && (
              <div className="error-banner" role="alert">
                {accountError}
              </div>
            )}
            <Button type="submit">Save account</Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
