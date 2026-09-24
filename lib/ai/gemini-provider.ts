import { GoogleGenAI } from '@google/genai';
import type { AIProvider, AIProviderOptions, AIProviderResult } from './types.ts';
import { wrapPromptData } from './guardrails.ts';

export class GeminiProvider implements AIProvider {
  readonly name = 'Google Gemini (Official SDK)';
  private apiKey: string | undefined;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    const rawKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.apiKey = rawKey.trim();
    this.defaultModel = model || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  async generateStructured<T>(options: AIProviderOptions<T>): Promise<AIProviderResult<T>> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API is not configured. GEMINI_API_KEY environment variable is missing.');
    }

    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 30000;
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const contents = [
      wrapPromptData('APPLICATION_CONTEXT', options.context),
      `\nUSER REQUEST: ${options.userPrompt}\n`,
      `\nINSTRUCTION: Generate the structured JSON response strictly adhering to the schema and instructions.\n`,
    ].join('\n');

    let lastError: Error | null = null;
    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;

    // Retry loop for transient 503 or rate spikes
    for (let attempt = 0; attempt < 3; attempt++) {
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      try {
        const responsePromise = ai.models.generateContent({
          model: this.defaultModel,
          contents,
          config: {
            systemInstruction: options.systemPrompt,
            temperature: options.temperature ?? 0.2,
            responseMimeType: 'application/json',
          },
        });
        response = await Promise.race([responsePromise, timeoutPromise]);
        clearTimeout(timeoutId);
        break;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err as Error;
        const msg = (err as Error).message || '';
        const isTransient = msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('429');
        if (isTransient && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1500));
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw lastError || new Error('No response from Gemini');
    }
    const latencyMs = Date.now() - startTime;
    const text = response.text || '{}';

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch (e) {
      throw new Error(`Gemini returned invalid JSON: ${(e as Error).message}`);
    }

    // Strictly validate with Zod schema
    const validatedData = options.schema.parse(parsedJson);

    const usageMetadata = response.usageMetadata || {};

    return {
      data: validatedData,
      usage: {
        inputTokens: usageMetadata.promptTokenCount,
        outputTokens: usageMetadata.candidatesTokenCount,
      },
      latencyMs,
      model: this.defaultModel,
    };
  }
}
