import { z } from 'zod';
import { config } from '@/lib/data/config';
import type { Entity } from '@/types/domain';
export function entitySchema(entity: Entity) {
  const fields: Record<string, z.ZodType> = {
    id: z.uuid(),
    created_at: z.iso.datetime().optional(),
    updated_at: z.iso.datetime().optional(),
  };
  for (const f of config[entity].fields) {
    let schema: z.ZodType =
      f.type === 'number'
        ? z.number().nonnegative()
        : f.relation
          ? z.uuid()
          : f.options
            ? z.enum(f.options as [string, ...string[]])
            : f.type === 'email'
              ? z.union([z.email(), z.literal('')])
              : f.type === 'date'
                ? z.iso.date()
                : z.string().trim().max(2000);
    if (
      f.required &&
      f.type !== 'number' &&
      !f.options &&
      !f.relation &&
      f.type !== 'date'
    )
      schema = z.string().trim().min(1).max(500);
    if (!f.required)
      schema = z.union([schema, z.literal(''), z.null()]).optional();
    fields[f.key] = schema;
  }
  return z
    .object(fields)
    .refine(
      (r) =>
        !r.start_date ||
        !r.end_date ||
        (typeof r.end_date === 'string' &&
          typeof r.start_date === 'string' &&
          r.end_date >= r.start_date),
      { message: 'End date must be on or after start date.' },
    );
}
