'use client';
import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageCircle, CalendarDays,
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
import { useWorkspace } from './workspace-provider';
import { initials } from '@/lib/data/metrics';
import { useBrowserStorage } from '@/hooks/use-browser-storage';
const groups: {
  name: string;
  items: [string, string, typeof LayoutDashboard][];
}[] = [
 {name:'WORKSPACE',items:[['Dashboard','dashboard',LayoutDashboard],['My Work','my-work',CheckSquare]]},
 {name:'PERFORMANCE',items:[['Overview','performance',ChartNoAxesCombined],['TikTok','tiktok',Music2],['Shopee','shopee',ShoppingBag]]},
 {name:'CREATORS',items:[['Creator Database','creators',Users],['Acquisition','creators/acquisition',Plus],['Outreach','creators/outreach',MessageCircle],['Performance Watch','creators/performance',ChartNoAxesCombined]]},
 {name:'ACTIVATIONS',items:[['Campaigns','campaigns',Flag],['HSL','hsl',Layers],['Peak Days','peak-days',CalendarDays],['Samples','samples',Package]]},
 {name:'DATA',items:[['Import Center','imports',Upload],['Products','products',Package]]},
 {name:'REPORTING',items:[['Weekly Reports','reports',ChartNoAxesCombined],['Monthly Reports','reports/monthly',CalendarDays]]},
 {name:'MANAGEMENT',items:[['Clients','clients',Building2],['Brands','brands',Layers],['Tasks','tasks',CheckSquare]]},
 {name:'SYSTEM',items:[['Users','users',Users],['Settings','settings',Settings]]},
];
const quickActions=[['Creator','/creators?create=1'],['Campaign','/campaigns?create=1'],['Task','/tasks?create=1'],['Sample','/samples?create=1'],['HSL Activation','/hsl?create=1'],['Peak Day','/peak-days?create=1'],['Stock Update','/hsl/stock?create=1']];

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
  const [quick, setQuick] = useState(false);
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
      .find((i) => path.startsWith('/' + i[1]))?.[0] || 'Workspace';
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '232px' } as React.CSSProperties}
    >
      <Sidebar collapsible="icon" className="app-sidebar">
        <SidebarHeader>
          <Link href="/dashboard" className="brand">
            <span className="brand-symbol">
              <ChartNoAxesCombined size={21} />
            </span>
            <span>
              Affiliate<span className="font-normal">OS</span>
              <small>OPERATIONS WORKSPACE</small>
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
                      isActive={path === '/' + url || (path.startsWith('/' + url + '/') && !groups.flatMap(g=>g.items).some(i=>i[1]!==url && path === '/'+i[1]))}
                      tooltip={label}
                    >
                      <Icon />
                      <span>{label}</span>
                      {url === 'tasks' && (
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
          <div className="phase-note">
            <span className="green-dot" />
            Daily operations<span className="text-xs">Phase 1.5</span>
          </div>
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
          <div className="topbar-context flex items-center gap-3">
            <SidebarTrigger className="text-neutral-400" />
            <span className="breadcrumb-muted">Workspace</span>
            <span className="text-neutral-300">/</span>
            <span>{title}</span>
            {demo && <span className="demo-badge">Demo workspace</span>}
          </div>
          <div className="flex items-center gap-4">
            <span className="topbar-divider" />
            <Link
              href="/tasks"
              aria-label="View tasks needing attention"
              className="notification"
            >
              <Bell size={18} />
              <i />
            </Link>
            <Button
              disabled={!canEdit('campaigns')}
              className="quick-create"
              onClick={() => setQuick(!quick)}
            >
              <Plus size={15} />
              Quick create
            </Button>
            {quick && <div className="ops-quick-menu">{quickActions.map(([label,url])=><Link key={url} href={url} onClick={()=>setQuick(false)}>+ {label}</Link>)}</div>}
          </div>
        </header>
        <main className="page-content">{children}</main>
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
            <CommandGroup heading="Actions">{[...quickActions.map(([label,url])=>["Create "+label,url]),["Open HSL","/hsl"],["Open Peak Days","/peak-days"],["Import Shopee Data","/imports/shopee"],["Import TikTok Data","/imports/tiktok"]].map(([label,url])=><CommandItem key={url} value={label} onSelect={()=>{setSearch(false);router.push(url);}}>{label}</CommandItem>)}</CommandGroup>
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
