import { identity } from '@/lib/supabase/server';
import { entitySchema } from '@/lib/validations/entities';
import { entities, type Entity } from '@/types/domain';
async function mutate(request: Request, params: Promise<{ entity: string }>) {
  try {
    const { entity } = await params;
    if (!entities.includes(entity as Entity))
      return Response.json({ error: 'Unknown entity.' }, { status: 404 });
    const { db, profile } = await identity();
    if (
      profile.role !== 'Admin' &&
      !(
        profile.role === 'Affiliate Manager' &&
        ['campaigns', 'creators', 'tasks'].includes(entity)
      )
    )
      return Response.json(
        { error: 'Your role does not permit this change.' },
        { status: 403 },
      );
    const body = (await request.json()) as Record<string, unknown>;
    if (request.method === 'DELETE') {
      if (typeof body.id !== 'string')
        return Response.json({ error: 'Record ID required.' }, { status: 400 });
      const { error } = await db
        .from(entity)
        .delete()
        .eq('id', body.id)
        .eq('workspace_id', profile.workspace_id);
      if (error)
        throw Error(
          error.code === '23503'
            ? 'Remove linked records before deleting this item.'
            : 'Could not delete record.',
        );
      return Response.json({ ok: true });
    }
    const parsed = entitySchema(entity as Entity).safeParse(body);
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues.map((i) => i.message).join(' ') },
        { status: 400 },
      );
    const payload = {
      ...parsed.data,
      workspace_id: profile.workspace_id,
      updated_at: new Date().toISOString(),
    };
    for (const f of Object.keys(payload)) {
      if (payload[f as keyof typeof payload] === '')
        Object.assign(payload, { [f]: null });
    }
    const query =
      request.method === 'POST'
        ? db.from(entity).insert(payload)
        : db
            .from(entity)
            .update(payload)
            .eq('id', body.id)
            .eq('workspace_id', profile.workspace_id);
    const { data, error } = await query.select().single();
    if (error)
      throw Error(
        error.code === '23503'
          ? 'Select a valid related workspace record.'
          : error.code === '23505'
            ? 'A record with this unique value already exists.'
            : 'The record could not be saved.',
      );
    return Response.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed.';
    return Response.json(
      { error: msg },
      { status: msg === 'Unauthenticated' ? 401 : 400 },
    );
  }
}
export async function POST(
  r: Request,
  c: { params: Promise<{ entity: string }> },
) {
  return mutate(r, c.params);
}
export async function PATCH(
  r: Request,
  c: { params: Promise<{ entity: string }> },
) {
  return mutate(r, c.params);
}
export async function DELETE(
  r: Request,
  c: { params: Promise<{ entity: string }> },
) {
  return mutate(r, c.params);
}
