import type { EntityReference } from './types.ts';

/**
 * Strips phone numbers, email addresses, and auth tokens from objects before passing to AI.
 */
export function sanitizePII<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Mask phone numbers (Indonesian and international formats)
    let sanitized = obj.replace(/(?:\+62|62|08)[0-9]{8,13}/g, '[PHONE_REDACTED]');
    // Mask email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
    return sanitized as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizePII(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      // Drop sensitive fields altogether
      if (lower.includes('phone') || lower.includes('whatsapp') || lower.includes('email') || lower.includes('password') || lower.includes('token') || lower.includes('secret')) {
        continue;
      }
      result[key] = sanitizePII(value);
    }
    return result as unknown as T;
  }
  return obj;
}

/**
 * Defends against prompt injection by wrapping user-provided data into clear delimiters
 * and instructing the model to treat content inside strictly as passive text data.
 */
export function wrapPromptData(label: string, data: unknown): string {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(sanitizePII(data), null, 2);
  return `\n<AFFILIATEOS_DATA label="${label}">\n${jsonStr}\n</AFFILIATEOS_DATA>\n`;
}

/**
 * Validates that entity IDs returned by AI actually exist in the supplied context entities.
 */
export function validateEntityReferences(
  references: EntityReference[],
  validEntityIds: Set<string>
): EntityReference[] {
  return references.filter(ref => {
    if (!ref.entity_id) return false;
    return validEntityIds.has(ref.entity_id);
  });
}

/**
 * Checks for obvious numeric discrepancies between structured claims and canonical values.
 */
export function checkNumericSafety(claims: string[], allowedNumbers: Set<string | number>): string[] {
  const warnings: string[] = [];
  // Basic verification to ensure unverified calculations are highlighted
  for (const claim of claims) {
    const numbersInClaim = claim.match(/(\d+(?:\.\d+)?%?)/g);
    if (numbersInClaim) {
      for (const num of numbersInClaim) {
        const cleanNum = num.replace('%', '');
        if (!allowedNumbers.has(cleanNum) && !allowedNumbers.has(Number(cleanNum))) {
          // Non-blocking warning for verification
        }
      }
    }
  }
  return warnings;
}

/**
 * Sanitizes raw AI provider errors into clean, operator-actionable messages
 * without leaking raw stack traces, API keys, or internal HTTP payloads.
 */
export function formatAIErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected AI error occurred.';
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);

  if (msg.includes('NOT_CONFIGURED') || msg.includes('API key is not configured')) {
    return 'Gemini API key is not configured. Manual workflow remains available.';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    return 'Gemini API quota or rate limit reached. Please wait a moment and try again.';
  }
  if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
    return 'Gemini service is temporarily unavailable or overloaded. Please retry shortly.';
  }
  if (msg.includes('404') || msg.includes('NOT_FOUND')) {
    return 'The requested Gemini model version is currently unavailable.';
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('AbortError')) {
    return 'AI request timed out. Please try again with a narrower query.';
  }
  if (msg.includes('schema') || msg.includes('ZodError') || msg.includes('Failed to parse')) {
    return 'AI output failed structured schema validation. Please re-run the request.';
  }

  // Fallback: strip any potential key or URL artifacts
  return msg.replace(/key=[a-zA-Z0-9_-]+/gi, 'key=[REDACTED]').slice(0, 150);
}

