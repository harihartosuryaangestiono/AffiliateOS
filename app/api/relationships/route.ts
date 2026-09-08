import { z } from 'zod';
import { identity } from '@/lib/supabase/server';
export async function POST(req: Request) {
  try {
    const { db, profile } = await identity();
    if (!['Admin', 'Affiliate Manager'].includes(profile.role))
      return Response.json({ error: 'Insufficient access' }, { status: 403 });
    const { table, record } = (await req.json()) as {
      table: string;
      record: unknown;
    };
    if (
      !['tiktok_accounts', 'shopee_accounts', 'campaign_creators'].includes(
        table,
      )
    )
      return Response.json({ error: 'Unknown relationship' }, { status: 400 });
    const schema =
      table === 'campaign_creators'
        ? z.object({
            id: z.uuid(),
            campaign_id: z.uuid(),
            creator_id: z.uuid(),
          })
        : z.object({
            id: z.uuid(),
            creator_id: z.uuid(),
            username: z
              .string()
              .trim()
              .regex(/^[a-zA-Z0-9@._-]+$/)
              .max(120),
            followers: z.number().int().nonnegative(),
            status: z.enum(['Active', 'Inactive']),
          });
    const value = schema.parse(record);
    const { error } = await db
      .from(table)
      .insert({ ...value, workspace_id: profile.workspace_id });
    if (error)
      throw Error(
        'Could not save. Check that the account is unique and all records belong to your workspace.',
      );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Could not save relationship' },
      { status: 400 },
    );
  }
}
