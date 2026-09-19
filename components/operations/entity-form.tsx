'use client';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Choice } from './shared';
import { config } from '@/lib/data/config';
import { useWorkspace } from '@/components/layout/workspace-provider';
import type { Entity, RecordData } from '@/types/domain';
import { LoaderCircle } from 'lucide-react';
export function EntityForm({
  entity,
  record,
  onClose,
}: {
  entity: Entity;
  record: Partial<RecordData> | null;
  onClose: () => void;
}) {
  const { data, save } = useWorkspace();
  const cfg = config[entity];
  const [values, setValues] = useState<
    Record<string, string | number | null | undefined>
  >(() =>
    Object.fromEntries(
      cfg.fields.map((f) => [f.key, record?.[f.key] ?? (f.options?.[0] || '')]),
    ),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    for (const f of cfg.fields) {
      if (f.required && !String(values[f.key] || '').trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    if (
      values.start_date &&
      values.end_date &&
      String(values.end_date) < String(values.start_date)
    ) {
      setError('End date must be on or after the start date.');
      return;
    }
    setBusy(true);
    try {
      await save(entity, {
        ...record,
        ...values,
        id: record?.id || crypto.randomUUID(),
        name: String(values.name).trim(),
        status: String(values.status || 'Active'),
        created_at: record?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this record.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="entity-sheet sm:max-w-[540px]">
        <SheetHeader>
          <span className="eyebrow">{cfg.title.toUpperCase()}</span>
          <SheetTitle className="text-2xl">
            {record?.id ? 'Edit' : 'Create'} {cfg.singular.toLowerCase()}
          </SheetTitle>
          <SheetDescription>{cfg.description}</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="entity-form">
          <div className="form-grid">
            {cfg.fields.map((f) => (
              <div
                key={f.key}
                className={
                  f.type === 'textarea' || f.section
                    ? 'form-field full'
                    : 'form-field'
                }
              >
                {f.section && <h3 className="form-section">{f.section}</h3>}
                <label htmlFor={f.key}>
                  {f.label}
                  {f.required && <span className="text-blue-600"> *</span>}
                </label>
                {f.options || f.relation ? (
                  <Choice
                    label={f.label}
                    value={String(values[f.key] || '')}
                    onChange={(v) =>
                      setValues({ ...values, [f.key]: v || null })
                    }
                    options={
                      f.options
                        ? f.options.map((v) => ({ value: v, label: v }))
                        : [
                            ...(!f.required
                              ? [{ value: '', label: 'None' }]
                              : []),
                            ...data.entities[f.relation!].map((r) => ({
                              value: r.id,
                              label: r.name,
                            })),
                          ]
                    }
                  />
                ) : f.type === 'textarea' ? (
                  <Textarea
                    id={f.key}
                    value={String(values[f.key] || '')}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                  />
                ) : (
                  <Input
                    id={f.key}
                    required={f.required}
                    type={f.type || 'text'}
                    min={f.type === 'number' ? 0 : undefined}
                    maxLength={500}
                    value={String(values[f.key] ?? '')}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [f.key]:
                          f.type === 'number'
                            ? (e.target.value === '' ? null : Number(e.target.value))
                            : e.target.value,
                      })
                    }
                  />
                )}
              </div>
            ))}
          </div>
          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}
          <div className="form-footer">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" size={15} />}{' '}
              {record?.id
                ? 'Save changes'
                : `Create ${cfg.singular.toLowerCase()}`}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
