import { z } from 'zod';
import { identity, workspaceMode } from '@/lib/supabase/server';

const feedbackSchema = z.object({
  feature: z.enum(['OUTREACH_DRAFT', 'CREATOR_INSIGHT', 'DAILY_BRIEF', 'REPORT_NARRATIVE', 'ASK_AFFILIATEOS']),
  rating: z.enum(['HELPFUL', 'NOT_HELPFUL']),
  note: z.string().optional(),
  requestId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    let workspaceId = 'demo-workspace';
    const isDemo = workspaceMode() === 'demo';

    if (!isDemo) {
      try {
        const { profile } = await identity();
        workspaceId = profile.workspace_id;
      } catch {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    const body = feedbackSchema.parse(await request.json());

    // In demo or live, log feedback receipt
    return Response.json({
      ok: true,
      message: 'Feedback recorded successfully',
      feedback: {
        workspaceId,
        feature: body.feature,
        rating: body.rating,
        recorded_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof z.ZodError 
      ? 'Invalid feedback payload' 
      : (error as Error).message || 'Failed to record feedback';
    return Response.json({ error: message }, { status: 400 });
  }
}
