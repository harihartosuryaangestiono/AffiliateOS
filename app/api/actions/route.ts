import { z } from 'zod';
import { generateOperationalActions } from '@/lib/intelligence/actions';
import { loadWorkspace } from '@/lib/queries/workspace';
import { identity } from '@/lib/supabase/server';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('sync') }),
  z.object({
    action: z.literal('transition'),
    id: z.uuid(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'SNOOZED', 'RESOLVED', 'DISMISSED']),
    assignedTo: z.uuid().nullable().optional(),
    snoozedUntil: z.iso.datetime({ offset: true }).nullable().optional(),
    note: z.string().max(2000).nullable().optional(),
  }),
  z.object({ action: z.literal('create_task'), id: z.uuid() }),
]);

export async function POST(request: Request) {
  try {
    const { db, profile } = await identity();
    if (!['Admin', 'Affiliate Manager'].includes(profile.role))
      return Response.json({ error: 'Operator access required.' }, { status: 403 });
    const body = schema.parse(await request.json());

    if (body.action === 'sync') {
      const { initialData } = await loadWorkspace();
      const generated = generateOperationalActions(initialData);
      const existing = initialData.operations?.operational_actions || [];
      for (const item of generated) {
        const old = existing.find(
          (row) => row.deduplication_key === item.deduplication_key,
        );
        const payload = {
          rule_id: item.rule_id,
          category: item.category,
          title: item.title,
          reason: item.reason,
          recommended_action: item.recommended_action,
          priority: item.priority,
          severity: item.severity,
          marketplace: item.marketplace || null,
          entity_type: item.entity_type || null,
          entity_id: item.entity_id || null,
          deduplication_key: item.deduplication_key,
          evidence: item.evidence,
          due_at: item.due_at || null,
          last_detected_at: new Date().toISOString(),
        };
        if (old) {
          const changed = JSON.stringify(old.evidence) !== JSON.stringify(item.evidence);
          const { error } = await db
            .from('operational_actions')
            .update({
              ...payload,
              ...(changed && ['RESOLVED', 'DISMISSED'].includes(String(old.status))
                ? { status: 'OPEN' }
                : {}),
            })
            .eq('id', old.id)
            .eq('workspace_id', profile.workspace_id);
          if (error) throw error;
        } else {
          const { error } = await db.from('operational_actions').insert({
            ...payload,
            workspace_id: profile.workspace_id,
            status: 'OPEN',
          });
          if (error) throw error;
        }
      }
    } else if (body.action === 'transition') {
      if (body.assignedTo) {
        const { data } = await db
          .from('profiles')
          .select('id')
          .eq('id', body.assignedTo)
          .eq('workspace_id', profile.workspace_id)
          .single();
        if (!data) throw Error('Choose a workspace member.');
      }
      const assignment =
        body.assignedTo !== undefined
          ? body.assignedTo
          : body.status === 'IN_PROGRESS'
            ? profile.id
            : undefined;
      const { error } = await db
        .from('operational_actions')
        .update({
          status: body.status,
          assigned_to: assignment,
          snoozed_until: body.status === 'SNOOZED' ? body.snoozedUntil : null,
          resolution_note: ['RESOLVED', 'DISMISSED'].includes(body.status)
            ? body.note
            : null,
        })
        .eq('id', body.id)
        .eq('workspace_id', profile.workspace_id)
        .select('id')
        .single();
      if (error) throw error;
    } else {
      const { data: action, error } = await db
        .from('operational_actions')
        .select('*')
        .eq('id', body.id)
        .eq('workspace_id', profile.workspace_id)
        .single();
      if (error || !action) throw Error('Action not found.');
      if (action.source_task_id) throw Error('A task already exists for this action.');
      const taskId = crypto.randomUUID();
      const due = String(action.due_at || new Date().toISOString()).slice(0, 10);
      const { error: taskError } = await db.from('tasks').insert({
        id: taskId,
        workspace_id: profile.workspace_id,
        name: action.title,
        status: 'To Do',
        priority:
          action.priority === 'P0'
            ? 'Urgent'
            : action.priority === 'P1'
              ? 'High'
              : 'Medium',
        due_date: due,
        owner: profile.name,
      });
      if (taskError) throw taskError;
      const { error: updateError } = await db
        .from('operational_actions')
        .update({
          source_task_id: taskId,
          status: 'IN_PROGRESS',
          assigned_to: profile.id,
        })
        .eq('id', action.id)
        .eq('workspace_id', profile.workspace_id);
      if (updateError) throw updateError;
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? 'Invalid action request.'
        : error instanceof Error
          ? error.message
          : 'Action update failed.';
    return Response.json(
      { error: message },
      { status: message === 'Unauthenticated' ? 401 : 400 },
    );
  }
}
