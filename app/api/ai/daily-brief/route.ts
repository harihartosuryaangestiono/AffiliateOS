import { z } from 'zod';
import { loadWorkspace } from '@/lib/queries/workspace';
import { getAIProvider } from '@/lib/ai/client';
import { DailyBriefSchema } from '@/lib/ai/schemas';
import { getDailyBriefPrompt, PROMPT_VERSIONS, TEMPERATURE_SETTINGS } from '@/lib/ai/prompts';
import { buildDailyBriefContext } from '@/lib/ai/context';
import { checkRateLimit, recordAIRequest } from '@/lib/ai/usage';
import { formatAIErrorMessage } from '@/lib/ai/guardrails';

const requestSchema = z.object({
  language: z.enum(['id', 'en']).default('id'),
});

export async function GET(request: Request) {
  return handleDailyBrief(request, { language: 'id' });
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json().catch(() => ({ language: 'id' })));
    return handleDailyBrief(request, body);
  } catch (error) {
    const message = error instanceof z.ZodError 
      ? 'Invalid daily brief request' 
      : formatAIErrorMessage(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

async function handleDailyBrief(request: Request, body: { language: 'id' | 'en' }) {
  try {
    const { initialData: workspaceData, workspaceId } = await loadWorkspace();

    const rateCheck = checkRateLimit(workspaceId, 'DAILY_BRIEF');
    if (!rateCheck.allowed) {
      return Response.json({ error: rateCheck.reason }, { status: 429 });
    }

    const actions = workspaceData.operations?.operational_actions || [];
    const context = buildDailyBriefContext(workspaceData, actions);

    const provider = getAIProvider();
    const systemPrompt = getDailyBriefPrompt(body.language);

    const result = await provider.generateStructured({
      feature: 'DAILY_BRIEF',
      promptVersion: PROMPT_VERSIONS.DAILY_BRIEF,
      systemPrompt,
      context,
      userPrompt: `Generate today's executive operational brief.`,
      schema: DailyBriefSchema,
      temperature: TEMPERATURE_SETTINGS.DAILY_BRIEF,
    });

    recordAIRequest({
      workspaceId,
      feature: 'DAILY_BRIEF',
      status: 'SUCCESS',
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });

    return Response.json({
      ok: true,
      data: result.data,
      usage: result.usage,
      latencyMs: result.latencyMs,
      model: result.model,
    });
  } catch (error) {
    return Response.json({ error: formatAIErrorMessage(error) }, { status: 500 });
  }
}
