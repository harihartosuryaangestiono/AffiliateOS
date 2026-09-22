import { z } from 'zod';
import { identity } from '@/lib/supabase/server';

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('decide'),
    id: z.uuid(),
    decision: z.enum(['CONFIRMED', 'DEFERRED']),
    definition: z.string().trim().max(100).nullable().optional(),
    effectiveDate: z.iso.date().nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  }),
  z.object({
    action: z.literal('supersede'),
    id: z.uuid(),
    effectiveDate: z.iso.date(),
  }),
]);

export async function POST(request: Request) {
  try {
    const { db, profile } = await identity();
    if (profile.role !== 'Admin') return Response.json({ error: 'Admin access required.' }, { status: 403 });
    const body = bodySchema.parse(await request.json());
    if (body.action === 'decide') {
      if (body.decision === 'CONFIRMED' && (!body.definition || !body.effectiveDate))
        return Response.json({ error: 'A definition and effective date are required.' }, { status: 400 });
      const { error } = await db.rpc('decide_business_rule', {
        rule_id: body.id,
        decision: body.decision,
        definition: body.definition || null,
        effective_date: body.effectiveDate || null,
        decision_notes: body.notes || null,
      });
      if (error) throw error;
    } else {
      const { error } = await db.rpc('supersede_business_rule', {
        rule_id: body.id,
        new_effective_from: body.effectiveDate,
      });
      if (error) throw error;
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Invalid business rule request.' : error instanceof Error ? error.message : 'Could not update business rule.';
    return Response.json({ error: message }, { status: 400 });
  }
}
