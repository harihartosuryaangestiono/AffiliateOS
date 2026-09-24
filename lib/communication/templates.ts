import type { CommunicationTemplate, CommunicationTemplateVersion } from '../../types/domain.ts';

export const SUPPORTED_PLACEHOLDERS = [
  '{{creator_name}}',
  '{{campaign_name}}',
  '{{brand_name}}',
  '{{marketplace}}',
  '{{product_name}}',
  '{{deadline}}',
] as const;

export type PlaceholderName = (typeof SUPPORTED_PLACEHOLDERS)[number];

export type InterpolationVariables = {
  creator_name?: string;
  campaign_name?: string;
  brand_name?: string;
  marketplace?: string;
  product_name?: string;
  deadline?: string;
};

export type InterpolationResult = {
  text: string;
  missingVariables: string[];
  isReady: boolean;
};

/**
 * Extract all placeholder tags present in a template body
 */
export function extractPlaceholders(body: string): string[] {
  const matches = body.match(/\{\{[a-zA-Z0-9_]+\}\}/g) || [];
  return Array.from(new Set(matches));
}

/**
 * Validate that template placeholders are allowed and not executable expressions
 */
export function validateTemplateBody(body: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const found = extractPlaceholders(body);

  for (const tag of found) {
    if (!SUPPORTED_PLACEHOLDERS.includes(tag as PlaceholderName)) {
      errors.push(`Unsupported placeholder tag '${tag}'. Allowed: ${SUPPORTED_PLACEHOLDERS.join(', ')}`);
    }
  }

  // Check for executable or script-like patterns
  if (/<script|eval\(|javascript:|function\s*\(|=>/i.test(body)) {
    errors.push('Template body contains invalid or executable code expressions.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Deterministically interpolate variables into a template body
 */
export function interpolateTemplate(
  body: string,
  variables: InterpolationVariables,
): InterpolationResult {
  const found = extractPlaceholders(body);
  const missingVariables: string[] = [];

  let resultText = body;

  for (const tag of found) {
    const key = tag.slice(2, -2) as keyof InterpolationVariables;
    const value = variables[key];

    if (value && value.trim() !== '') {
      resultText = resultText.replaceAll(tag, value.trim());
    } else {
      missingVariables.push(tag);
    }
  }

  return {
    text: resultText,
    missingVariables,
    isReady: missingVariables.length === 0,
  };
}

/**
 * Increment template version and construct version audit record
 */
export function prepareTemplateUpdate(
  existingTemplate: CommunicationTemplate,
  newBody: string,
  actorName = 'System',
): {
  updatedTemplate: CommunicationTemplate;
  versionRecord: CommunicationTemplateVersion;
} {
  const validation = validateTemplateBody(newBody);
  if (!validation.isValid) {
    throw new Error(`Invalid template update: ${validation.errors.join('; ')}`);
  }

  const nextVersion = existingTemplate.current_version + 1;
  const nowIso = new Date().toISOString();

  const updatedTemplate: CommunicationTemplate = {
    ...existingTemplate,
    body: newBody,
    current_version: nextVersion,
    updated_by: actorName,
    updated_at: nowIso,
  };

  const versionRecord: CommunicationTemplateVersion = {
    id: crypto.randomUUID(),
    name: `${existingTemplate.name} v${nextVersion}`,
    status: 'Active',
    template_id: existingTemplate.id,
    version: nextVersion,
    body: newBody,
    created_by: actorName,
    created_at: nowIso,
  };

  return {
    updatedTemplate,
    versionRecord,
  };
}
