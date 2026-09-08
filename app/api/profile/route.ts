import { identity } from '@/lib/supabase/server';
import { z } from 'zod';
export async function PATCH(req: Request) {
  try {
    const { db, user } = await identity();
    const { name } = z
      .object({ name: z.string().trim().min(1).max(120) })
      .parse(await req.json());
    const { error } = await db
      .from('profiles')
      .update({ name })
      .eq('id', user.id);
    if (error) throw Error('Could not save your profile.');
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Could not save.' },
      { status: 400 },
    );
  }
}
