'use client';
import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageCircle,
  CalendarDays,
  LayoutDashboard,
  Building2,
  Layers,
  Flag,
  Users,
  Package,
  Music2,
  ShoppingBag,
  Upload,
  CheckSquare,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronsUpDown,
  Command as CommandIcon,
  ArrowUpRight,
  ListChecks,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { canOperate } from '@/lib/operations/config';
import { useWorkspace } from './workspace-provider';
import { initials } from '@/lib/data/metrics';
import { useBrowserStorage } from '@/hooks/use-browser-storage';
const groups: {
  name: string;
  items: [string, string, typeof LayoutDashboard][];
}[] = [
  {
    name: 'WORKSPACE',
    items: [
      ['Dashboard', 'dashboard', LayoutDashboard],
      ['Action Center', 'actions', ListChecks],
      ['My Work', 'my-work', CheckSquare],
    ],
  },
  {
    name: 'PERFORMANCE',
    items: [
      ['Overview', 'performance', ChartNoAxesCombined],
      ['TikTok', 'tiktok', Music2],
      ['Shopee', 'shopee', ShoppingBag],
    ],
  },
  {
    name: 'CREATORS',
    items: [
      ['Creator Database', 'creators', Users],
      ['Acquisition', 'creators/acquisition', Plus],
      ['Outreach', 'creators/outreach', MessageCircle],
      ['Performance Watch', 'creators/performance', ChartNoAxesCombined],
    ],
  },
  {
    name: 'ACTIVATIONS',
    items: [
      ['Campaigns', 'campaigns', Flag],
      ['HSL', 'hsl', Layers],
      ['Peak Days', 'peak-days', CalendarDays],
      ['Samples', 'samples', Package],
    ],
  },
  {
    name: 'DATA',
    items: [
      ['Import Center', 'imports', Upload],
      ['Products', 'products', Package],
    ],
  },
  {
    name: 'REPORTING',
    items: [
      ['Weekly Reports', 'reports', ChartNoAxesCombined],
      ['Monthly Reports', 'reports/monthly', CalendarDays],
    ],
  },
  {
    name: 'MANAGEMENT',
    items: [
      ['Clients', 'clients', Building2],
      ['Brands', 'brands', Layers],
      ['Tasks', 'tasks', CheckSquare],
    ],
  },
  {
    name: 'SYSTEM',
    items: [
      ['Users', 'users', Users],
      ['Settings', 'settings', Settings],
    ],
  },
];
const quickActions = [
  ['Creator', '/creators?create=1'],
  ['Campaign', '/campaigns?create=1'],
  ['Task', '/tasks?create=1'],
  ['Sample', '/samples?create=1'],
  ['HSL Activation', '/hsl?create=1'],
  ['Peak Day', '/peak-days?create=1'],
  ['Stock Update', '/hsl/stock?create=1'],
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data, name, role, demo, canEdit } = useWorkspace();
  const workspaceName = useBrowserStorage(
    'affiliateos-workspace-name',
    'AffiliateOS Workspace',
    demo,
  );
  const [search, setSearch] = useState(false);
  const availableActions = quickActions.filter(([, url]) => {
    const target = url.split('?')[0];
    return target === '/hsl/stock'
      ? canOperate(role, 'product_stock_snapshots')
      : target === '/samples'
        ? canOperate(role, 'sample_seedings')
        : target === '/hsl'
          ? canOperate(role, 'hsl_activations')
          : target === '/peak-days'
            ? canOperate(role, 'peak_days')
            : canEdit(target.slice(1) as 'creators' | 'campaigns' | 'tasks');
  });
  const pendingTasks = data.entities.tasks.filter(
    (t) => t.status !== 'Done',
  ).length;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  const title =
    groups
      .flatMap((g) => g.items)
      .sort((a, b) => b[1].length - a[1].length)
      .find(
        (i) => path === '/' + i[1] || path.startsWith('/' + i[1] + '/'),
      )?.[0] || 'Workspace';
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '248px' } as React.CSSProperties}
    >
      <CloseMobileOnNavigation path={path} />
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <Sidebar collapsible="icon" className="app-sidebar">
        <SidebarHeader>
          <Link href="/dashboard" className="brand">
            <span className="brand-symbol">
              <span className="brand-mark" aria-hidden="true">
                A
              </span>
            </span>
            <span>
              Affiliate<span className="brand-os">OS</span>
              <small>CREATE · CONNECT · GROW</small>
            </span>
          </Link>
          <Link href="/settings" className="workspace-switch">
            <span className="workspace-avatar">A</span>
            <span>
              {workspaceName}
              <small>{demo ? 'Demo workspace' : 'Team workspace'}</small>
            </span>
            <ChevronsUpDown size={14} />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {groups.map((g) => (
            <SidebarGroup key={g.name}>
              <SidebarGroupLabel>{g.name}</SidebarGroupLabel>
              <SidebarMenu>
                {g.items.map(([label, url, Icon]) => (
                  <SidebarMenuItem key={url}>
                    <SidebarMenuButton
                      render={<Link href={'/' + url} />}
                      isActive={
                        path === '/' + url ||
                        (path.startsWith('/' + url + '/') &&
                          !groups
                            .flatMap((g) => g.items)
                            .some((i) => i[1] !== url && path === '/' + i[1]))
                      }
                      tooltip={label}
                    >
                      <Icon />
                      <span>{label}</span>
                      {url === 'tasks' && pendingTasks > 0 && (
                        <span className="nav-count">
                          {
                            data.entities.tasks.filter(
                              (t) => t.status !== 'Done',
                            ).length
                          }
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <Link href="/creators/acquisition" className="sidebar-prompt">
            <span>Built for possibility.</span>
            <small>
              Grow your creator network <ArrowUpRight size={13} />
            </small>
          </Link>
          <Link href="/settings?tab=profile" className="profile-button">
            <span className="avatar">{initials(name)}</span>
            <span>
              {name}
              <small>{role}</small>
            </span>
            <ChevronsUpDown size={14} />
          </Link>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="workspace-main">
        <header className="topbar">
          <button className="search-trigger" onClick={() => setSearch(true)}>
            <Search size={15} />
            <span>Search creators, campaigns, brands, or anything…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-context">
            <SidebarTrigger aria-label="Toggle navigation" />
            <span>{title}</span>
          </div>
          <div className="topbar-actions">
            <Link
              href="/actions"
              aria-label="Open Action Center"
              className="notification"
            >
              <Bell size={20} />
            </Link>
            <time
              className="topbar-date"
              dateTime={new Date().toISOString().slice(0, 10)}
            >
              <CalendarDays size={16} />
              {new Intl.DateTimeFormat('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
              }).format(new Date())}
            </time>
            {availableActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="quick-create"
                      aria-label="Quick create"
                    />
                  }
                >
                  <Plus size={16} />
                  <span>Quick create</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="quick-create-menu">
                  <DropdownMenuLabel>Create something great</DropdownMenuLabel>
                  {availableActions.map(([label, url]) => (
                    <DropdownMenuItem key={url} render={<Link href={url} />}>
                      <Plus size={15} />
                      {label}
                    </DropdownMenuItem>
                  ))}
                  {['Admin', 'Affiliate Manager', 'Analyst'].includes(role) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem render={<Link href="/imports" />}>
                        <Upload size={15} />
                        Import data
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Link
              href="/settings?tab=profile"
              className="topbar-avatar"
              aria-label={'Profile for ' + name}
            >
              {initials(name)}
            </Link>
          </div>
        </header>
        <main
          id="workspace-content"
          tabIndex={-1}
          className="page-content"
          data-workspace-page={path.split('/')[1]}
        >
          {children}
        </main>
        <footer className="workspace-footer">
          <span>
            AffiliateOS <span className="text-neutral-300">/</span> Your
            operations, in focus.
          </span>
          <span>
            {demo ? 'Sample data · September 2026' : 'Secure workspace'}
            <span className="green-dot" />
          </span>
        </footer>
      </SidebarInset>
      <CommandDialog
        open={search}
        onOpenChange={setSearch}
        title="Search your workspace"
        description="Find clients, brands, campaigns, creators, and products."
      >
        <Command>
          <CommandInput placeholder="Search your workspace..." />
          <CommandList>
            <CommandEmpty>No matching records found.</CommandEmpty>
            <CommandGroup heading="Actions">
              {[
                ...availableActions.map(([label, url]) => [
                  'Create ' + label,
                  url,
                ]),
                ['Open HSL', '/hsl'],
                ['Open Peak Days', '/peak-days'],
                ['Import Shopee Data', '/imports/shopee'],
                ['Import TikTok Data', '/imports/tiktok'],
              ].map(([label, url]) => (
                <CommandItem
                  key={url}
                  value={label}
                  onSelect={() => {
                    setSearch(false);
                    router.push(url);
                  }}
                >
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
            {Object.entries(data.entities)
              .filter(([k]) => k !== 'tasks')
              .map(([entity, rows]) => (
                <CommandGroup key={entity} heading={entity}>
                  {rows.map((r) => (
                    <CommandItem
                      key={r.id}
                      value={entity + ' ' + r.name}
                      onSelect={() => {
                        setSearch(false);
                        router.push('/' + entity + '/' + r.id);
                      }}
                    >
                      <Search size={14} />
                      {r.name}
                      <ArrowUpRight className="ml-auto" size={14} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
          <div className="command-footer">
            <CommandIcon size={13} /> Search across your entire workspace{' '}
            <span className="ml-auto">Esc to close</span>
          </div>
        </Command>
      </CommandDialog>
    </SidebarProvider>
  );
}

function CloseMobileOnNavigation({ path }: { path: string }) {
  const { setOpenMobile } = useSidebar();
  useEffect(() => {
    setOpenMobile(false);
  }, [path, setOpenMobile]);
  return null;
}
