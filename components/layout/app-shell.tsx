'use client';
import { useState, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageCircle,
  CalendarDays,
  LayoutDashboard,
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
  Handshake,
  PackageCheck,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { RouteTransition } from '@/components/motion/route-transition';
import { AskAffiliateOSButton } from '@/components/workflows/ask-affiliateos';
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
  items: [string, string, typeof LayoutDashboard, string?][];
}[] = [
  {
    name: 'MAIN',
    items: [
      ['Dashboard', 'dashboard', LayoutDashboard],
      ['Action Center', 'actions', ListChecks, 'actions'],
      ['My Work', 'my-work', CheckSquare, 'tasks'],
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
      ['Acquisition', 'creators?filter=acquisition', Plus],
      ['Outreach', 'communication', MessageCircle],
    ],
  },
  {
    name: 'CAMPAIGN',
    items: [
      ['Campaigns', 'campaigns', Flag],
      ['Deals', 'campaigns?view=deals', Handshake],
      ['Samples', 'samples', Package],
      ['HSL', 'hsl', Layers],
      ['Stock', 'hsl?tab=stock', PackageCheck],
      ['Peak Days', 'peak-days', CalendarDays],
    ],
  },
  {
    name: 'DATA & REPORTING',
    items: [
      ['Import Center', 'imports', Upload],
      ['Reports', 'reports', FileText],
    ],
  },
  {
    name: 'SETTINGS',
    items: [
      ['Users & Roles', 'users', ShieldCheck],
      ['Workspace Settings', 'settings', Settings],
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

function subscribeToLocation(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getLocationSearch() {
  return typeof window !== 'undefined' ? window.location.search : '';
}

function getServerLocationSearch() {
  return '';
}

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
  const currentQuery = useSyncExternalStore(
    subscribeToLocation,
    getLocationSearch,
    getServerLocationSearch,
  );

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

  const openActions =
    data.operations?.operational_actions?.filter(
      (a) => a.status === 'OPEN',
    )?.length ?? (demo ? 6 : 0);

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

  const _title =
    groups
      .flatMap((g) => g.items)
      .sort((a, b) => b[1].length - a[1].length)
      .find(
        (i) =>
          path === '/' + i[1] ||
          path.startsWith('/' + i[1].split('?')[0] + '/') ||
          path === '/' + i[1].split('?')[0],
      )?.[0] || 'Workspace';

  return (
    <SidebarProvider
      style={{ '--sidebar-width': '256px' } as React.CSSProperties}
    >
      <CloseMobileOnNavigation path={path} />
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <Sidebar collapsible="icon" className="app-sidebar border-r border-[#E2E8F0] bg-white">
        <SidebarHeader className="p-4 pb-2 space-y-3">
          <Link href="/dashboard" className="brand flex items-center gap-3 px-1 py-1 group">
            <span className="brand-symbol w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#4F46E5] flex items-center justify-center shadow-sm text-white font-bold text-lg">
              <span className="brand-mark" aria-hidden="true">
                A
              </span>
            </span>
            <div className="flex flex-col">
              <span className="text-[17px] font-bold tracking-tight text-[#0F172A] leading-tight flex items-center">
                Affiliate<span className="text-[#2563EB]">OS</span>
              </span>
              <small className="text-[9px] uppercase tracking-widest font-semibold text-[#94A3B8] mt-0.5">
                CREATE · CONNECT · GROW
              </small>
            </div>
          </Link>

          <Link
            href="/settings"
            className="workspace-switch flex items-center justify-between p-2.5 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] bg-[#F8FAFC] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0">
                A
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#0F172A] truncate">
                  {workspaceName}
                </span>
                <small className="text-[10px] text-[#64748B]">
                  {demo ? 'Demo workspace' : 'Team workspace'}
                </small>
              </div>
            </div>
            <ChevronsUpDown size={14} className="text-[#94A3B8] shrink-0 ml-1.5" />
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-3 py-2 space-y-2.5 overflow-y-auto flex-1">
          {groups.map((g) => (
            <SidebarGroup key={g.name} className="p-0">
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] px-3 mb-1">
                {g.name}
              </SidebarGroupLabel>
              <SidebarMenu className="space-y-0.5">
                {g.items.map(([label, rawUrl, Icon, badgeType]) => {
                  const [urlPath, urlQuery] = rawUrl.split('?');
                  const isExactBase =
                    path === '/' + urlPath ||
                    (path.startsWith('/' + urlPath + '/') &&
                      !groups
                        .flatMap((grp) => grp.items)
                        .some((i) => i[1] !== rawUrl && path === '/' + i[1].split('?')[0]));

                  let isActive = false;
                  if (urlQuery) {
                    isActive = isExactBase && currentQuery.includes(urlQuery);
                  } else {
                    const siblingHasQueryMatch = g.items.some(
                      ([, otherUrl]) =>
                        otherUrl !== rawUrl &&
                        otherUrl.startsWith(urlPath + '?') &&
                        currentQuery.includes(otherUrl.split('?')[1]),
                    );
                    isActive = isExactBase && !siblingHasQueryMatch;
                  }

                  const badgeCount =
                    badgeType === 'actions'
                      ? openActions
                      : badgeType === 'tasks'
                        ? pendingTasks
                        : 0;

                  return (
                    <SidebarMenuItem key={rawUrl}>
                      <SidebarMenuButton
                        render={<Link href={'/' + rawUrl} />}
                        isActive={isActive}
                        tooltip={label}
                        className={`group relative flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'text-white shadow-sm active-nav-item'
                            : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active-indicator"
                            className="absolute inset-0 bg-[#2563EB] rounded-xl z-0 shadow-sm"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                          <Icon
                            size={18}
                            className={`transition-transform duration-150 group-hover:scale-105 ${
                              isActive ? 'text-white' : 'text-[#64748B]'
                            }`}
                          />
                          <span className="truncate">{label}</span>
                        </div>
                        {badgeCount > 0 && (
                          <motion.span
                            key={badgeCount}
                            initial={{ scale: 0.85 }}
                            animate={{ scale: 1 }}
                            className={`relative z-10 ml-auto text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                              badgeType === 'actions'
                                ? isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#FFE4E6] text-[#E11D48]'
                                : isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#F1F5F9] text-[#64748B]'
                            }`}
                          >
                            {badgeCount}
                          </motion.span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-[#E2E8F0]">
          <Link
            href="/settings?tab=Profile"
            className="profile-button flex items-center justify-between p-2 rounded-xl hover:bg-[#F8FAFD] transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-[#0F172A] text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {initials(name || 'Dinda Victoria')}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#0F172A] truncate">
                  {name || 'Dinda Victoria'}
                </span>
                <small className="text-[10px] text-[#64748B] truncate">
                  {role || 'Affiliate Manager'}
                </small>
              </div>
            </div>
            <ChevronsUpDown size={14} className="text-[#94A3B8] shrink-0" />
          </Link>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="workspace-main bg-[#F8FAFC]">
        <header className="topbar h-16 border-b border-[#E2E8F0] bg-white/95 backdrop-blur px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl">
            <SidebarTrigger aria-label="Toggle navigation" className="text-[#64748B] hover:text-[#0F172A] shrink-0 active:scale-95 transition-transform" />
            <button
              className="search-trigger flex items-center gap-2 sm:gap-2.5 w-full max-w-md px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1] text-[#94A3B8] text-xs transition-all shadow-none group min-w-0 active:scale-[0.98]"
              onClick={() => setSearch(true)}
            >
              <Search size={15} className="text-[#94A3B8] group-hover:text-[#64748B] shrink-0" />
              <span className="truncate flex-1 text-left text-xs">
                Search creators, campaigns, brands...
              </span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] bg-white border border-[#E2E8F0] rounded-md shadow-2xs shrink-0">
                ⌘ K
              </kbd>
            </button>
          </div>

          <div className="topbar-actions flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
            <AskAffiliateOSButton />

            <time
              suppressHydrationWarning
              className="topbar-date hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] shadow-2xs"
              dateTime={new Date().toISOString().slice(0, 10)}
            >
              <CalendarDays size={14} className="text-[#2563EB]" />
              {new Intl.DateTimeFormat('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
              }).format(new Date())}
            </time>

            <Link
              href="/actions"
              aria-label="Open Action Center"
              className="notification relative w-9 h-9 rounded-full border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-all active:scale-95 shadow-2xs"
            >
              <Bell size={17} />
              {openActions > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E11D48] ring-2 ring-white" />
              )}
            </Link>

            {availableActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="quick-create hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm active:scale-95 transition-all"
                      aria-label="Quick create"
                    />
                  }
                >
                  <Plus size={14} />
                  <span>Create</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="quick-create-menu w-48 rounded-xl shadow-lg border-[#E2E8F0]">
                  <DropdownMenuLabel className="text-xs text-[#94A3B8]">Quick Actions</DropdownMenuLabel>
                  {availableActions.map(([label, url]) => (
                    <DropdownMenuItem key={url} render={<Link href={url} />} className="text-xs py-2 cursor-pointer">
                      <Plus size={13} className="mr-2 text-[#2563EB]" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                  {['Admin', 'Affiliate Manager', 'Analyst'].includes(role) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem render={<Link href="/imports" />} className="text-xs py-2 cursor-pointer">
                        <Upload size={13} className="mr-2 text-[#64748B]" />
                        Import data
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Link
              href="/settings?tab=Profile"
              className="topbar-avatar w-8 h-8 rounded-full bg-[#0F172A] text-white font-semibold text-xs flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
              aria-label={'Profile for ' + name}
            >
              {initials(name || 'Dinda Victoria')}
            </Link>
          </div>
        </header>

        <main
          id="workspace-content"
          tabIndex={-1}
          className="page-content p-6 max-w-[1600px] mx-auto w-full"
          data-workspace-page={path.split('/')[1]}
        >
          <RouteTransition pathname={path}>{children}</RouteTransition>
        </main>

        <footer className="workspace-footer py-4 px-6 border-t border-[#E2E8F0] bg-white flex flex-wrap items-center justify-between text-xs text-[#94A3B8]">
          <span>
            AffiliateOS <span className="text-[#CBD5E1]">/</span> Enterprise Creator & Affiliate Operating System
          </span>
          <span className="flex items-center gap-2">
            {demo ? 'Live Demo Workspace · September 2026' : 'Secure Enterprise Workspace'}
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          </span>
        </footer>
      </SidebarInset>

      <CommandDialog
        open={search}
        onOpenChange={setSearch}
        title="Search your workspace"
        description="Find clients, brands, campaigns, creators, and products."
      >
        <Command className="rounded-2xl border-[#E2E8F0] shadow-xl">
          <CommandInput placeholder="Search creators, campaigns, brands, or anything..." />
          <CommandList className="max-h-80">
            <CommandEmpty>No matching records found.</CommandEmpty>
            <CommandGroup heading="Actions">
              {[
                ...availableActions.map(([label, url]) => [
                  'Create ' + label,
                  url,
                ]),
                ['Open Action Center', '/actions'],
                ['Open My Work', '/my-work'],
                ['Open HSL', '/hsl'],
                ['Open Peak Days', '/peak-days'],
                ['Import Shopee Data', '/imports'],
                ['Import TikTok Data', '/imports'],
              ].map(([label, url]) => (
                <CommandItem
                  key={url}
                  value={label}
                  onSelect={() => {
                    setSearch(false);
                    router.push(url);
                  }}
                  className="cursor-pointer"
                >
                  <Plus size={14} className="mr-2 text-[#2563EB]" />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
            {Object.entries(data.entities)
              .filter(([k]) => k !== 'tasks')
              .map(([entity, rows]) => (
                <CommandGroup key={entity} heading={entity.toUpperCase()}>
                  {rows.map((r) => (
                    <CommandItem
                      key={r.id}
                      value={entity + ' ' + r.name}
                      onSelect={() => {
                        setSearch(false);
                        router.push('/' + entity + '/' + r.id);
                      }}
                      className="cursor-pointer"
                    >
                      <Search size={14} className="mr-2 text-[#94A3B8]" />
                      <span className="font-medium text-[#0F172A]">{r.name}</span>
                      <ArrowUpRight className="ml-auto text-[#94A3B8]" size={14} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
          <div className="command-footer p-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#94A3B8] bg-[#F8FAFC]">
            <span className="flex items-center gap-1.5">
              <CommandIcon size={13} /> Search across your entire workspace
            </span>
            <span>Esc to close</span>
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
