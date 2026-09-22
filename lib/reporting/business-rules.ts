import type { RecordData, WorkspaceData } from '../../types/domain.ts';

export type RuleScope = 'GLOBAL' | 'MARKETPLACE' | 'CLIENT' | 'REPORT_TEMPLATE';
export type RuleContext = {
  canonicalMetricId: string;
  marketplace: string;
  clientId?: string;
  templateId?: string;
  asOf: string;
};

export type RuleSnapshot = {
  id: string;
  ruleKey: string;
  canonicalMetricId: string;
  status: string;
  selectedDefinition: string | null;
  scopeType: string;
  marketplace: string;
  version: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
};

const precedence: Record<string, number> = {
  GLOBAL: 0,
  MARKETPLACE: 1,
  CLIENT: 2,
  REPORT_TEMPLATE: 3,
};

function matches(rule: RecordData, context: RuleContext) {
  if (rule.canonical_metric_id !== context.canonicalMetricId) return false;
  if (rule.marketplace !== 'Multi-platform' && rule.marketplace !== context.marketplace) return false;
  if (rule.scope_type === 'CLIENT' && rule.client_id !== context.clientId) return false;
  if (rule.scope_type === 'REPORT_TEMPLATE' && rule.report_template_id !== context.templateId) return false;
  return true;
}

function isEffective(rule: RecordData, asOf: string) {
  return (!rule.effective_from || String(rule.effective_from) <= asOf) &&
    (!rule.effective_until || String(rule.effective_until) >= asOf);
}

export function applicableBusinessRules(rules: RecordData[], context: RuleContext) {
  return rules.filter((rule) => matches(rule, context) && isEffective(rule, context.asOf)).sort((a, b) =>
    (precedence[String(b.scope_type)] ?? -1) - (precedence[String(a.scope_type)] ?? -1) ||
    String(b.effective_from || '').localeCompare(String(a.effective_from || '')) ||
    Number(b.version || 0) - Number(a.version || 0),
  );
}

export function resolveBusinessRule(rules: RecordData[], context: RuleContext) {
  return applicableBusinessRules(rules, context).find((rule) => ['CONFIRMED', 'SUPERSEDED'].includes(String(rule.status)) && Boolean(rule.selected_definition)) || null;
}

export type ConfirmationStatus = 'CONFIRMED' | 'BUSINESS CONFIRMATION REQUIRED' | 'PROVISIONAL';

export function metricConfirmationStatus(rules: RecordData[], context: RuleContext): ConfirmationStatus {
  if (resolveBusinessRule(rules, context)) return 'CONFIRMED';
  return applicableBusinessRules(rules, context).some((rule) => ['OPEN', 'DEFERRED'].includes(String(rule.status)))
    ? 'BUSINESS CONFIRMATION REQUIRED'
    : 'PROVISIONAL';
}

export function snapshotBusinessRules(
  data: WorkspaceData,
  context: Omit<RuleContext, 'canonicalMetricId'>,
): RuleSnapshot[] {
  const rules = data.operations?.business_rules || [];
  const metricIds = [...new Set(rules.map((rule) => String(rule.canonical_metric_id)))];
  return metricIds.flatMap((canonicalMetricId) => {
    const candidates = applicableBusinessRules(rules, { ...context, canonicalMetricId });
    const selected = candidates.find((rule) => ['CONFIRMED', 'SUPERSEDED'].includes(String(rule.status)) && Boolean(rule.selected_definition)) || candidates[0];
    return selected ? [{
      id: selected.id,
      ruleKey: String(selected.rule_key),
      canonicalMetricId,
      status: String(selected.status),
      selectedDefinition: selected.selected_definition ? String(selected.selected_definition) : null,
      scopeType: String(selected.scope_type),
      marketplace: String(selected.marketplace),
      version: Number(selected.version),
      effectiveFrom: selected.effective_from ? String(selected.effective_from) : null,
      effectiveUntil: selected.effective_until ? String(selected.effective_until) : null,
    }] : [];
  });
}

export function snapshotMetricStatus(snapshot: { business_rules?: RuleSnapshot[] } | null, metricId: string): ConfirmationStatus {
  const rule = snapshot?.business_rules?.find((item) => item.canonicalMetricId === metricId);
  if (!rule) return 'PROVISIONAL';
  return ['CONFIRMED', 'SUPERSEDED'].includes(rule.status) && Boolean(rule.selectedDefinition) ? 'CONFIRMED' : 'BUSINESS CONFIRMATION REQUIRED';
}

export function possibleDefinitions(value: unknown): { key: string; label: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { key: string; label: string } =>
    Boolean(item && typeof item === 'object' && typeof (item as { key?: unknown }).key === 'string' && typeof (item as { label?: unknown }).label === 'string'),
  );
}
