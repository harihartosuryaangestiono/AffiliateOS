'use client';
import { ThresholdSettings } from '@/components/workflows/workspace';
import { OperationsTable } from '@/components/workflows/primitives';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useBrowserStorage,
  writeBrowserStorage,
} from '@/hooks/use-browser-storage';
import Link from 'next/link';
import {
  FileChartColumn,
  CalendarDays,
  Flag,
  Building2,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
  Users,
  Save,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { PlatformIcon } from '@/components/dashboard/dashboard';
import { Status } from './shared';
import { initials } from '@/lib/data/metrics';
import { toast } from 'sonner';
export function ReportsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PRODUCTIVITY / REPORTS</div>
          <h1>Reports</h1>
          <p>From operational detail to a clear client conversation.</p>
        </div>
        <span className="coming-soon">Report generation · Coming Soon</span>
      </div>
      <div className="report-grid">
        {[
          {
            name: 'Weekly Affiliate Report',
            icon: CalendarDays,
            desc: 'A focused view of your weekly affiliate performance.',
          },
          {
            name: 'Monthly Affiliate Report',
            icon: FileChartColumn,
            desc: 'A complete picture of growth across the month.',
          },
          {
            name: 'Campaign Report',
            icon: Flag,
            desc: 'Campaign results, creator contributions, and targets.',
          },
          {
            name: 'Client Report',
            icon: Building2,
            desc: 'Bring a client’s brands and campaigns together.',
          },
        ].map((r) => (
          <section className="panel report-card" key={r.name}>
            <span className="section-symbol">
              <r.icon size={23} />
            </span>
            <h2>{r.name}</h2>
            <p>{r.desc}</p>
            <div className="report-options">
              <span>Generate report</span>
              <span className="coming-soon">Coming Soon</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {['PDF', 'Excel', 'PPT'].map((t) => (
                <Button key={t} variant="outline" disabled size="sm">
                  Export {t} · Coming Soon
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <section className="panel detail-panel">
        <h2>Report management</h2>
        <p className="text-sm text-muted-foreground">
          Report periods, clients, campaigns, marketplace attribution, and
          authors are prepared in the database foundation. Automated generation
          and exports are planned for a later phase.
        </p>
        <Link className="text-link mt-5" href="/dashboard">
          Explore current performance <ArrowUpRight size={14} />
        </Link>
      </section>
    </>
  );
}
export function UsersPage() {
  const { name, role, demo } = useWorkspace();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE / ACCESS</div>
          <h1>Users & roles</h1>
          <p>Give your team the right access to do their best work.</p>
        </div>
        <span className="coming-soon">Invite management · Coming Soon</span>
      </div>
      <section className="panel detail-panel">
        <h2>Current workspace membership</h2>
        <div className="settings-row">
          <span className="avatar">{initials(name)}</span>
          <div className="mr-auto">
            <strong>{name}</strong>
            <p>{demo ? 'Demo profile' : 'Authenticated workspace member'}</p>
          </div>
          <Status value="Active" />
          <span className="market-tag">{role}</span>
        </div>
      </section>
      <div className="report-grid mt-5">
        {[
          {
            role: 'Admin',
            desc: 'Full workspace access, including clients, brands, products, and access management.',
          },
          {
            role: 'Affiliate Manager',
            desc: 'Manage campaigns, creators, imports, and tasks. View workspace performance.',
          },
          {
            role: 'Analyst',
            desc: 'Read operational and performance data. Reporting foundation available.',
          },
          {
            role: 'Viewer',
            desc: 'Read-only access. Record creation, edits, imports, and deletion are restricted.',
          },
        ].map((r) => (
          <section key={r.role} className="panel detail-panel">
            <span className="section-symbol">
              <ShieldCheck size={22} />
            </span>
            <h2>{r.role}</h2>
            <p className="text-xs text-muted-foreground leading-6">{r.desc}</p>
          </section>
        ))}
      </div>
    </>
  );
}
export function SettingsPage({ initialTab }: { initialTab?: string } = {}) {
  const { name, role, demo } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const tabs = [
    'Workspace',
    'Marketplace',
    'Import Configuration',
    'Users & Access',
    'Data Preferences',
    'Profile',
  ];
  const tab =
    tabs.find((t) => t.toLowerCase() === params.get('tab')?.toLowerCase()) ||
    initialTab || 'Workspace';
  const setTab = (value: string) =>
    router.replace('/settings?tab=' + encodeURIComponent(value));
  const storedProfile = useBrowserStorage(
    'affiliateos-profile-name',
    name,
    demo,
  );
  const storedWorkspace = useBrowserStorage(
    'affiliateos-workspace-name',
    'AffiliateOS Workspace',
    demo,
  );
  const [profileDraft, setProfile] = useState<string | null>(null);
  const [workspaceDraft, setWorkspace] = useState<string | null>(null);
  const profile = profileDraft ?? storedProfile;
  const workspace = workspaceDraft ?? storedWorkspace;
  const [saved, setSaved] = useState(false);
  async function saveProfile() {
    try {
      if (!profile.trim()) throw Error('Your name is required.');
      if (demo) writeBrowserStorage('affiliateos-profile-name', profile);
      else {
        const r = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: profile }),
        });
        if (!r.ok) throw Error('Could not save your profile.');
      }
      toast.success('Profile saved');
      setSaved(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    }
  }
  async function logout() {
    if (demo) {
      window.location.assign('/login');
      return;
    }
    const r = await fetch('/api/auth', { method: 'DELETE' });
    if (r.ok) window.location.assign('/login');
    else toast.error('Sign-out failed. Please try again.');
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SYSTEM / SETTINGS</div>
          <h1>Workspace settings</h1>
          <p>The foundations of a well-run workspace.</p>
        </div>
      </div>
      <ThresholdSettings />
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="line" className="tabs-nav w-full justify-start">
          {[
            'Workspace',
            'Marketplace',
            'Import Configuration',
            'Users & Access',
            'Data Preferences',
            'Profile',
          ].map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="Workspace">
          <section className="panel detail-panel">
            <h2>Workspace information</h2>
            <div className="form-field max-w-lg">
              <label htmlFor="workspace-name">Workspace name</label>
              <Input
                id="workspace-name"
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                disabled={!demo}
              />
            </div>
            <div className="settings-row">
              <div>
                <strong>Workspace mode</strong>
                <p>
                  {demo
                    ? 'Demo changes are saved only in this browser.'
                    : 'Connected to Supabase PostgreSQL.'}
                </p>
              </div>
              <Status value={demo ? 'Demo' : 'Active'} />
            </div>
            {demo ? (
              <Button
                className="mt-5"
                disabled={!workspace.trim()}
                onClick={() => {
                  writeBrowserStorage('affiliateos-workspace-name', workspace);
                  toast.success('Demo workspace name saved');
                }}
              >
                <Save size={14} />
                Save workspace
              </Button>
            ) : (
              <span className="coming-soon mt-5 inline-block">
                Workspace administration · Coming Soon
              </span>
            )}
          </section>
        </TabsContent>
        <TabsContent value="Marketplace">
          <section className="panel detail-panel">
            <h2>Marketplace connections</h2>
            {['TikTok', 'Shopee'].map((m) => (
              <div className="settings-row" key={m}>
                <PlatformIcon market={m} />
                <div className="mr-auto">
                  <strong>{m}</strong>
                  <p>Upload marketplace reports through the Import Center.</p>
                </div>
                <span className="market-tag">Manual Import</span>
                <span className="coming-soon">
                  API Integration · Coming Soon
                </span>
              </div>
            ))}
          </section>
        </TabsContent>
        <TabsContent value="Import Configuration">
          <section className="panel detail-panel">
            <h2>Independent marketplace mappings</h2>
            <p className="text-sm text-muted-foreground leading-7">
              TikTok and Shopee each have separate field mappings. Original
              uploads, raw rows, mapping selections, and validation results are
              preserved before any normalization.
            </p>
            <div className="settings-row">
              <div>
                <strong>Accepted files</strong>
                <p>CSV and XLSX · 50 MB · up to 50,000 rows</p>
              </div>
              <Link className="button-outline" href="/imports">
                Open Import Center <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="Users & Access">
          <section className="panel detail-panel">
            <h2>Workspace access</h2>
            <p className="text-sm text-muted-foreground">
              Your role: {role}. Role changes are managed by your Supabase
              administrator.
            </p>
            <Link className="button-outline mt-5" href="/users">
              <Users size={14} />
              View roles
            </Link>
          </section>
        </TabsContent>
        <TabsContent value="Data Preferences">
          <OperationsTable table="metric_targets" title="Reporting targets" />
          <section className="panel detail-panel">
            <h2>Data preferences</h2>
            {[
              ['Currency', 'Indonesian Rupiah (IDR)'],
              ['Timezone', 'Asia/Jakarta'],
              ['Interface', 'Light mode'],
              ['Schema version', '0.1'],
              ['Marketplace attribution', 'Separate TikTok and Shopee records'],
            ].map(([a, b]) => (
              <div className="settings-row" key={a}>
                <strong>{a}</strong>
                <span className="text-muted-foreground">{b}</span>
              </div>
            ))}
          </section>
        </TabsContent>
        <TabsContent value="Profile">
          <section className="panel detail-panel">
            <h2>Your profile</h2>
            <div className="form-field max-w-md">
              <label htmlFor="profile-name">Full name</label>
              <Input
                id="profile-name"
                value={profile}
                onChange={(e) => {
                  setProfile(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="settings-row">
              <strong>Role</strong>
              <span>{role}</span>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={saveProfile}>Save profile</Button>
              <Button variant="outline" onClick={logout}>
                <LogOut size={14} />
                {demo ? 'Leave demo' : 'Sign out'}
              </Button>
            </div>
            {saved && (
              <p className="text-xs text-muted-foreground mt-3">
                Your updated profile will appear after refreshing.
              </p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
