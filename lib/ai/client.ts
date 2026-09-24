import type { AIProvider, AIStatusInfo } from './types.ts';
import { GeminiProvider } from './gemini-provider.ts';
import { FakeAIProvider } from './fake-provider.ts';
import { getWorkspaceUsageSummary } from './usage.ts';
import { z } from 'zod';

let providerOverride: AIProvider | null = null;

export function setAIProviderOverride(provider: AIProvider | null) {
  providerOverride = provider;
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.6-flash';
}

export function getAIProvider(): AIProvider {
  if (providerOverride) {
    return providerOverride;
  }

  if (isGeminiConfigured()) {
    return new GeminiProvider();
  }

  // Fallback to deterministic fake provider for test or unconfigured demo environment
  return new FakeAIProvider();
}

/**
 * Safe server-side test of Gemini connectivity without exposing keys or sending creator PII.
 */
export async function testGeminiConnection(): Promise<{
  success: boolean;
  model: string;
  latencyMs: number;
  message: string;
}> {
  if (!isGeminiConfigured()) {
    return {
      success: false,
      model: getGeminiModel(),
      latencyMs: 0,
      message: 'GEMINI_API_KEY is not configured in server environment.',
    };
  }

  const provider = new GeminiProvider();
  const startTime = Date.now();

  try {
    const testSchema = z.object({
      status: z.string(),
      echo: z.string(),
    });

    const result = await provider.generateStructured({
      feature: 'ASK_AFFILIATEOS',
      promptVersion: 'connectivity-test-v1',
      systemPrompt: 'You are a connectivity test assistant. Respond with JSON { "status": "OK", "echo": "AffiliateOS Copilot Ready" }.',
      context: { test: true },
      userPrompt: 'Ping',
      schema: testSchema,
      timeoutMs: 8000,
    });

    return {
      success: true,
      model: result.model,
      latencyMs: result.latencyMs || (Date.now() - startTime),
      message: `Gemini API connection successful (${result.data.echo}).`,
    };
  } catch (err) {
    return {
      success: false,
      model: getGeminiModel(),
      latencyMs: Date.now() - startTime,
      message: `Gemini connectivity test failed: ${(err as Error).message}`,
    };
  }
}

/**
 * Returns current AI status and feature availability for the workspace.
 */
export function getAIStatus(workspaceId: string): AIStatusInfo {
  const configured = isGeminiConfigured();
  const usage = getWorkspaceUsageSummary(workspaceId);

  return {
    provider: configured ? 'Google Gemini' : 'Google Gemini (Not Configured)',
    isConfigured: configured,
    model: getGeminiModel(),
    features: {
      outreachDraft: true,
      creatorInsight: true,
      dailyBrief: true,
      reportNarrative: true,
      askAffiliateOS: true,
    },
    usage,
  };
}
