export const dynamic = 'force-dynamic';
import { WorkspaceProvider } from '@/components/layout/workspace-provider';
import { AppShell } from '@/components/layout/app-shell';
import { loadWorkspace } from '@/lib/queries/workspace';
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await loadWorkspace();
  return (
    <WorkspaceProvider {...workspace}>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
