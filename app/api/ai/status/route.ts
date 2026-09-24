import { identity, workspaceMode } from '@/lib/supabase/server';
import { getAIStatus, testGeminiConnection } from '@/lib/ai/client';

export async function GET() {
  try {
    let workspaceId = 'demo-workspace';
    const isDemo = workspaceMode() === 'demo';

    if (!isDemo) {
      try {
        const { profile } = await identity();
        workspaceId = profile.workspace_id;
      } catch {
        // Safe public check returns non-sensitive status
      }
    }

    const status = getAIStatus(workspaceId);
    return Response.json(status);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST() {
  try {
    let isAdmin = false;
    const isDemo = workspaceMode() === 'demo';

    if (isDemo) {
      isAdmin = true;
    } else {
      try {
        const { profile } = await identity();
        isAdmin = profile.role === 'Admin';
      } catch {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    if (!isAdmin) {
      return Response.json({ error: 'Admin access required to test AI connection' }, { status: 403 });
    }

    const testResult = await testGeminiConnection();
    return Response.json(testResult);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
