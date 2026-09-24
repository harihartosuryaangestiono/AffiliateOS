import { operationTables } from '@/lib/operations/config';
import { seed } from '@/lib/data/seed';
import { configured, identity, workspaceMode } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { entities, type WorkspaceData, type Role } from '@/types/domain';
export async function loadWorkspace() {
  if (workspaceMode()==='production'&&!configured())
    throw Error('Production mode requires a Supabase URL and publishable key. AffiliateOS will not fall back to demo data.');
  if (workspaceMode()==='demo')
    return {
      initialData: seed,
      demo: true,
      role: 'Admin' as Role,
      name: 'Demo Operator',
      workspaceId: 'demo-workspace',
    };
  if(!configured()) throw Error('Supabase configuration is incomplete.');
  let auth;
  try {
    auth = await identity();
  } catch {
    redirect('/login');
  }
  const { db, profile } = auth;
  const tableNames = [
    ...entities,
    'tiktok_accounts',
    'shopee_accounts',
    'tiktok_performance_daily',
    'shopee_performance_daily',
    'import_jobs',
    'activity_logs',
    'profiles',
    'campaign_creators',
    ...operationTables.filter(t=>t!=='campaign_creators'),
  ];
  const results = await Promise.all(
    tableNames.map(async (table) => {
      const all: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db
          .from(table)
          .select('*')
          .eq('workspace_id', profile.workspace_id)
          .order('id')
          .range(offset, offset + 999);
        if (error) {
          if (['brand_mappings', 'report_datasets', 'integration_connections', 'integration_sync_runs', 'communication_templates', 'communication_events', 'communication_template_versions', 'communication_preparations', 'ai_request_logs'].includes(table)) return { data: [], error: null };
          return { data: null, error };
        }
        all.push(...(data || []));
        if ((data?.length || 0) < 1000) return { data: all, error: null };
      }
    }),
  );
  for (let i = 0; i < results.length; i++)
    if (results[i].error)
      throw Error(
        `Could not load ${tableNames[i]}. Check the database migration and workspace permissions.`,
      );
  const byTable = Object.fromEntries(
    tableNames.map((t, i) => [t, results[i].data || []]),
  );
  const initialData = {
    operations: {
      ...Object.fromEntries(operationTables.filter(t=>t!=='campaign_creators').map(t=>[t,byTable[t]])),
      profiles: byTable.profiles,
    },
    entities: Object.fromEntries(
      entities.map((e) => [e, byTable[e]]),
    ) as WorkspaceData['entities'],
    tiktok_accounts: byTable.tiktok_accounts,
    shopee_accounts: byTable.shopee_accounts,
    tiktok_performance: byTable.tiktok_performance_daily,
    shopee_performance: byTable.shopee_performance_daily,
    imports: byTable.import_jobs.map((j) => ({
      ...j,
      filename: j.original_filename,
      rows: j.row_count,
    })),
    activity: byTable.activity_logs.map((a) => ({ ...a, user: a.actor_name })),
    campaign_creators: byTable.campaign_creators,
  } as unknown as WorkspaceData;
  return {
    initialData,
    demo: false,
    role: profile.role as Role,
    name: profile.name,
    workspaceId: profile.workspace_id,
  };
}
