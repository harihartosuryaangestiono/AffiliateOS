import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export const workspaceMode = () => process.env.AFFILIATEOS_MODE === 'production' ? 'production' : 'demo';
const environment = () => ({
  url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
export const configured = () => { const env=environment(); return Boolean(env.url&&env.key); };
export async function supabase() {
  if (!configured()) throw Error('Supabase is not configured.');
  const env=environment();
  const jar = await cookies();
  return createServerClient(
    env.url!,
    env.key!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server Components cannot write cookies. Auth route handlers do. */
          }
        },
      },
    },
  );
}
export async function identity() {
  const db = await supabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw Error('Unauthenticated');
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id,workspace_id,name,role,email')
    .eq('id', user.id)
    .single();
  if (profileError || !profile)
    throw Error('Workspace membership is required.');
  return { db, user, profile };
}
