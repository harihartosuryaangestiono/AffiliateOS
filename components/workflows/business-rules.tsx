'use client';
import { useState } from 'react';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { records } from '@/lib/operations/config';
import { possibleDefinitions } from '@/lib/reporting/business-rules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Status } from '@/components/operations/shared';
import { toast } from 'sonner';

type Draft = { definition?: string; effectiveDate?: string; notes?: string };

export function BusinessRules() {
  const { data, role } = useWorkspace();
  const rules = [...records(data, 'business_rules')].sort((a, b) => String(a.rule_key).localeCompare(String(b.rule_key)) || Number(b.version) - Number(a.version));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const update = (id: string, patch: Draft) => setDrafts((value) => ({ ...value, [id]: { ...value[id], ...patch } }));
  async function submit(ruleId: string, payload: Record<string, unknown>) {
    setBusy(ruleId);
    try {
      const response = await fetch('/api/business-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw Error(result.error || 'Could not update business rule.');
      toast.success('Business rule updated');
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update business rule.');
      setBusy(null);
    }
  }
  return <div className="space-y-5">
    <div className="ops-demo-note">Business definitions are versioned and effective-dated. Existing report snapshots retain the rule metadata captured when they were finalized.</div>
    {!rules.length && <section className="panel detail-panel"><h2>No business questions</h2><p>No confirmation questions are configured for this workspace.</p></section>}
    {rules.map((rule) => {
      const draft = drafts[rule.id] || {};
      const options = possibleDefinitions(rule.possible_definitions), resolvedOptions = options.filter((option) => option.key !== 'UNRESOLVED');
      const open = rule.status === 'OPEN';
      return <section className="panel detail-panel" key={rule.id}>
        <div className="ops-panel-heading">
          <div><div className="eyebrow">{rule.rule_key} · {rule.marketplace} · {rule.scope_type} · VERSION {rule.version}</div><h2>{rule.name}</h2></div>
          <Status value={String(rule.status)} />
        </div>
        <div className="settings-row"><div><strong>Decision required</strong><p>{rule.question}</p></div></div>
        <div className="settings-row"><div><strong>Evidence</strong><p>{rule.evidence_summary}</p></div></div>
        <div className="settings-row"><div><strong>Current application behavior</strong><p>{rule.operational_behavior}</p></div></div>
        <div className="settings-row"><div><strong>Impact</strong><p>{Array.isArray(rule.impact) ? rule.impact.join(' · ') : String(rule.impact || '—')}</p></div></div>
        {rule.status === 'CONFIRMED' && <div className="settings-row"><div><strong>Confirmed definition</strong><p>{options.find((option) => option.key === rule.selected_definition)?.label || rule.selected_definition} · effective {rule.effective_from}</p></div></div>}
        {role === 'Admin' && open ? <div className="mt-5 grid gap-4 max-w-2xl">
          <div className="form-field"><label htmlFor={`definition-${rule.id}`}>Definition</label><select id={`definition-${rule.id}`} value={draft.definition || ''} onChange={(event) => update(rule.id, { definition: event.target.value })}><option value="">Select after business confirmation</option>{resolvedOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select><p>Use Defer when the definition remains unresolved.</p></div>
          <div className="form-field"><label htmlFor={`effective-${rule.id}`}>Effective from</label><Input id={`effective-${rule.id}`} type="date" value={draft.effectiveDate || ''} onChange={(event) => update(rule.id, { effectiveDate: event.target.value })} /></div>
          <div className="form-field"><label htmlFor={`notes-${rule.id}`}>Decision notes</label><textarea id={`notes-${rule.id}`} value={draft.notes || ''} onChange={(event) => update(rule.id, { notes: event.target.value })} /></div>
          <div className="flex gap-3"><Button disabled={busy === rule.id || !draft.definition || !draft.effectiveDate} onClick={() => submit(rule.id, { action: 'decide', id: rule.id, decision: 'CONFIRMED', definition: draft.definition, effectiveDate: draft.effectiveDate, notes: draft.notes })}>Confirm definition</Button><Button variant="outline" disabled={busy === rule.id} onClick={() => submit(rule.id, { action: 'decide', id: rule.id, decision: 'DEFERRED', notes: draft.notes })}>Defer</Button></div>
        </div> : role === 'Admin' && rule.status !== 'SUPERSEDED' ? <div className="mt-5 flex items-end gap-3"><div className="form-field"><label htmlFor={`supersede-${rule.id}`}>New version effective from</label><Input id={`supersede-${rule.id}`} type="date" value={draft.effectiveDate || ''} onChange={(event) => update(rule.id, { effectiveDate: event.target.value })} /></div><Button variant="outline" disabled={!draft.effectiveDate || busy === rule.id} onClick={() => submit(rule.id, { action: 'supersede', id: rule.id, effectiveDate: draft.effectiveDate })}>Create new version</Button></div> : role !== 'Admin' && <p className="mt-5 text-sm text-muted-foreground">Read only · confirmation is owned by an Admin.</p>}
      </section>;
    })}
  </div>;
}
