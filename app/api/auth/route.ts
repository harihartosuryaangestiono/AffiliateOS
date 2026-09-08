import { supabase, configured } from '@/lib/supabase/server';
import { z } from 'zod';
export async function POST(req: Request) {
  if (!configured())
    return Response.json(
      {
        error:
          'Supabase is not configured. Use the demo workspace or configure your project environment.',
      },
      { status: 503 },
    );
  try {
    const { email, password } = z
      .object({ email: z.email(), password: z.string().min(1).max(200) })
      .parse(await req.json());
    const db = await supabase();
    const { data: authData, error } = await db.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      return Response.json(
        { error: 'Sign-in failed. Check your email and password.' },
        { status: 401 },
      );
    const { data: membership } = await db
      .from('profiles')
      .select('id')
      .eq('id', authData.user!.id)
      .single();
    if (!membership)
      return Response.json(
        {
          error:
            'Your account does not have a workspace membership. Contact your administrator.',
        },
        { status: 403 },
      );
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: 'Enter a valid email and password.' },
      { status: 400 },
    );
  }
}
export async function DELETE() {
  try {
    const db = await supabase();
    await db.auth.signOut();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Sign-out failed.' }, { status: 400 });
  }
}
