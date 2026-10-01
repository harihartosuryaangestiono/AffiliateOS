'use client';
import { useState, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageCircle,
  CalendarDays,
  LayoutDashboard,
  Flag,
  Users,
  Package,
  Music2,
  ShoppingBag,
  CheckSquare,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronsUpDown,
  Command as CommandIcon,
  ArrowUpRight,
  Handshake,
  FileText,
  ShieldCheck,
  ChevronDown,
  FileBarChart2,
  Building2,
  Sparkles,
  PackageCheck,
  FolderDown,
  Cpu,
} from 'lucide-react';
import { motion } from 'motion/react';
import { RouteTransition } from '@/components/motion/route-transition';
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
import { canOperate } from '@/lib/operations/config';
import { useWorkspace } from './workspace-provider';
import { initials } from '@/lib/data/metrics';
import { Button } from '@/components/ui/button';
import { AskAffiliateOSDrawer } from '@/components/workflows/ask-affiliateos';
import { writeBrowserStorage } from '@/hooks/use-browser-storage';
import { toast } from 'sonner';
import type { Role } from '@/types/domain';

const groups: {
  name: string;
  items: [string, string, typeof LayoutDashboard, string?][];
}[] = [
  {
    name: '',
    items: [
      ['Dashboard', 'dashboard', LayoutDashboard],
      ['Action Center', 'actions', MessageCircle, 'actions'],
      ['My Work', 'my-work', CheckSquare, 'tasks'],
    ],
  },
  {
    name: 'ANALYTICS & REPORTS',
    items: [
      ['Ask AI Copilot', 'ai-copilot', Sparkles],
      ['Performance Overview', 'performance', ChartNoAxesCombined],
      ['TikTok Analytics', 'tiktok', Music2],
      ['Shopee Analytics', 'shopee', ShoppingBag],
      ['Reports & Compare', 'reports', FileBarChart2],
    ],
  },
  {
    name: 'DATA & CATALOG',
    items: [
      ['Clients', 'clients', Building2],
      ['Brands', 'brands', Sparkles],
      ['Products', 'products', Package],
      ['Data Imports', 'imports', FolderDown],
    ],
  },
  {
    name: 'CREATORS',
    items: [
      ['Creator Database', 'creators', Users],
      ['Acquisition', 'acquisition', Plus],
      ['Outreach', 'communication', MessageCircle],
    ],
  },
  {
    name: 'CAMPAIGNS & ACTIVATIONS',
    items: [
      ['Campaigns', 'campaigns', Flag],
      ['Deals', 'deals', Handshake],
      ['Samples', 'samples', PackageCheck],
      ['Content & Logs', 'hsl', FileText],
      ['Peak Days', 'peak-days', CalendarDays],
    ],
  },
  {
    name: 'SETTINGS & ADMIN',
    items: [
      ['Integrations', 'settings/integrations', Cpu],
      ['Users & Roles', 'users', ShieldCheck],
      ['Workspace Settings', 'settings', Settings],
    ],
  },
];

const quickActions = [
  ['Report', '/reports?create=1'],
  ['Creator', '/creators?create=1'],
  ['Acquisition Prospect', '/acquisition?create=1'],
  ['Campaign', '/campaigns?create=1'],
  ['Deal Lock', '/deals?create=1'],
  ['Task', '/tasks?create=1'],
  ['Client', '/clients?create=1'],
  ['Brand', '/brands?create=1'],
  ['Product', '/products?create=1'],
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
  const currentName = name && name !== 'Demo Operator' ? name : 'Hariharto Surya';
  const [search, setSearch] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState(currentName);
  const [editRole, setEditRole] = useState<Role>(role || 'Admin');

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
            : target === '/deals'
              ? canOperate(role, 'campaign_creators')
              : target === '/acquisition'
                ? canEdit('creators')
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setAiOpen((prev) => !prev);
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
        </SidebarHeader>

        <SidebarContent className="px-3 py-2 space-y-2 overflow-y-auto flex-1">
          {groups.map((g) => (
            <SidebarGroup key={g.name || 'top'} className="p-0">
              {g.name ? (
                <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] px-3 mb-1 mt-2">
                  {g.name}
                </SidebarGroupLabel>
              ) : null}
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
                  if (rawUrl === 'acquisition') {
                    isActive =
                      path === '/acquisition' ||
                      (path === '/creators' && currentQuery.includes('filter=acquisition'));
                  } else if (rawUrl === 'creators') {
                    isActive =
                      path === '/creators' && !currentQuery.includes('filter=acquisition');
                  } else if (rawUrl === 'deals') {
                    isActive =
                      path === '/deals' ||
                      (path === '/campaigns' && currentQuery.includes('view=deals'));
                  } else if (rawUrl === 'campaigns') {
                    isActive =
                      path === '/campaigns' && !currentQuery.includes('view=deals');
                  } else if (urlQuery) {
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

                  if (rawUrl === 'ai-copilot') {
                    return (
                      <SidebarMenuItem key={rawUrl}>
                        <SidebarMenuButton
                          onClick={() => setAiOpen(true)}
                          tooltip="Tanya AI Copilot"
                          className="group relative flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-sm font-semibold transition-all bg-gradient-to-r from-blue-50/80 to-indigo-50/80 text-blue-700 hover:from-blue-100 hover:to-indigo-100 border border-blue-200/80 cursor-pointer shadow-2xs"
                        >
                          <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                            <Sparkles
                              size={18}
                              className="text-blue-600 transition-all duration-150 group-hover:rotate-12 group-hover:scale-110"
                            />
                            <span className="truncate">{label}</span>
                          </div>
                          <span className="relative z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-600 text-white shadow-2xs">
                            AI
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

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
                            className="absolute inset-0 bg-[#2563EB] rounded-xl z-0 shadow-[0_2px_12px_-1px_rgba(37,99,235,0.32)]"
                            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
                          />
                        )}
                        <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                          <Icon
                            size={18}
                            className={`transition-all duration-150 group-hover:scale-105 ${
                              isActive ? 'text-white' : 'text-[#64748B] group-hover:text-[#0F172A]'
                            }`}
                          />
                          <span className={`truncate transition-transform duration-150 ${!isActive ? 'group-hover:translate-x-0.5' : ''}`}>
                            {label}
                          </span>
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
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="profile-button w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#F8FAFD] transition-colors active:scale-[0.98] text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-[#0F172A] text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {initials(name && name !== 'Demo Operator' ? name : 'Hariharto Surya')}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#0F172A] truncate">
                  {name && name !== 'Demo Operator' ? name : 'Hariharto Surya'}
                </span>
                <small className="text-[10px] text-[#64748B] truncate">
                  {role || 'Admin'}
                </small>
              </div>
            </div>
            <ChevronsUpDown size={14} className="text-[#94A3B8] shrink-0" />
          </button>
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
                Search creators, campaigns, brands, or anything...
              </span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] bg-white border border-[#E2E8F0] rounded-md shadow-2xs shrink-0">
                ⌘ K
              </kbd>
            </button>
          </div>

          <div className="topbar-actions flex items-center gap-2 sm:gap-2.5 shrink-0 ml-2">
            {/* Ask AI Copilot Header Button */}
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all text-xs font-semibold shadow-2xs group shrink-0 active:scale-95 cursor-pointer"
            >
              <Sparkles size={14} className="text-blue-600 group-hover:rotate-12 transition-transform shrink-0" />
              <span className="hidden sm:inline">Ask AI Copilot</span>
              <span className="sm:hidden">AI</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[9px] font-bold bg-white/80 border border-blue-200 rounded text-blue-600">⌘J</kbd>
            </button>

            <time
              suppressHydrationWarning
              className="topbar-date hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] shadow-2xs hover:border-[#CBD5E1] cursor-pointer transition-all active:scale-95"
              dateTime={new Date().toISOString().slice(0, 10)}
            >
              <CalendarDays size={14} className="text-[#0F172A]" />
              <span>24 Sept 2026</span>
              <ChevronDown size={13} className="text-[#64748B]" />
            </time>

            <Link
              href="/actions"
              aria-label="Open Action Center"
              className="notification relative w-9 h-9 rounded-full border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] flex items-center justify-center text-[#0F172A] transition-all active:scale-95 shadow-2xs"
            >
              <Bell size={16} />
              {openActions > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E11D48] ring-2 ring-white" />
              )}
            </Link>

            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="topbar-profile flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-full hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-all active:scale-95 cursor-pointer text-left"
              aria-label="Edit Profile"
            >
              <span className="w-8 h-8 rounded-full bg-[#0F172A] text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {initials(name && name !== 'Demo Operator' ? name : 'Hariharto Surya')}
              </span>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-[#0F172A] leading-tight">
                  {name && name !== 'Demo Operator' ? name : 'Hariharto Surya'}
                </span>
                <span className="text-[10px] text-[#94A3B8] leading-tight">
                  {role || 'Admin'}
                </span>
              </div>
              <ChevronDown size={13} className="text-[#64748B] hidden lg:block ml-0.5" />
            </button>
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
                ['Open Creator Acquisition Funnel', '/acquisition'],
                ['Open Creator Deals & Locks', '/deals'],
                ['Open Reports & Compare', '/reports'],
                ['Open Action Center', '/actions'],
                ['Open My Work', '/my-work'],
                ['Open HSL', '/hsl'],
                ['Open Peak Days', '/peak-days'],
                ['Import Center', '/imports'],
                ['Integrations & Sync', '/settings/integrations'],
                ['Workspace Settings', '/settings'],
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

      {/* Floating AI Copilot Trigger */}
      <button
        type="button"
        onClick={() => setAiOpen(true)}
        aria-label="Tanya AI Copilot"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-[0_4px_20px_rgba(37,99,235,0.45)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.65)] hover:scale-105 active:scale-95 transition-all text-xs font-semibold cursor-pointer group"
      >
        <Sparkles size={16} className="text-amber-300 group-hover:rotate-12 transition-transform shrink-0" />
        <span className="font-bold tracking-wide">Ask AI Copilot</span>
      </button>

      {/* AI Copilot Drawer */}
      {aiOpen && <AskAffiliateOSDrawer onClose={() => setAiOpen(false)} />}

      {/* Quick Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center">
                  {initials(editName || 'Hariharto Surya')}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Profil Operator & Role</h3>
                  <p className="text-xs text-[#64748B]">Ubah identitas Anda di workspace ini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label htmlFor="profile-full-name" className="font-semibold text-[#0F172A] block mb-1">Nama Lengkap</label>
                <input
                  id="profile-full-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Hariharto Surya"
                  className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="profile-role" className="font-semibold text-[#0F172A] block mb-1">Role Akun</label>
                <select
                  id="profile-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
                >
                  <option value="Admin">Admin (Full Access & Controls)</option>
                  <option value="Affiliate Manager">Affiliate Manager</option>
                  <option value="Analyst">Analyst</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] space-y-1">
                <div className="font-semibold">Workspace Aktif: Administrator</div>
                <div>Perubahan nama ini langsung tampil pada dashboard, audit log, dan ekspor presentasi.</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
              <Link
                href="/login"
                onClick={() => {
                  document.cookie = 'affiliateos-mode=; path=/; max-age=0';
                  document.cookie = 'affiliateos-user-name=; path=/; max-age=0';
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('affiliateos-profile-name');
                  }
                }}
                className="text-xs text-rose-600 font-semibold hover:underline"
              >
                Ganti Akun / Logout
              </Link>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setProfileModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  onClick={() => {
                    const finalName = editName.trim() || 'Hariharto Surya';
                    writeBrowserStorage('affiliateos-profile-name', finalName);
                    if (typeof document !== 'undefined') {
                      document.cookie = 'affiliateos-user-name=' + encodeURIComponent(finalName) + '; path=/; max-age=86400';
                    }
                    toast.success(`Profil diperbarui sebagai ${finalName} (${editRole})`);
                    setProfileModalOpen(false);
                    // trigger refresh so server layout reads updated cookie
                    window.location.reload();
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
