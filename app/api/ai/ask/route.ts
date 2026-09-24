import { z } from 'zod';
import { loadWorkspace } from '@/lib/queries/workspace';
import { getAIProvider } from '@/lib/ai/client';
import { AskAffiliateOSSchema } from '@/lib/ai/schemas';
import { getAskAffiliateOSPrompt, PROMPT_VERSIONS, TEMPERATURE_SETTINGS } from '@/lib/ai/prompts';
import { routeAndBuildAskContext } from '@/lib/ai/context';
import { validateEntityReferences, formatAIErrorMessage } from '@/lib/ai/guardrails';
import { checkRateLimit, recordAIRequest } from '@/lib/ai/usage';

const requestSchema = z.object({
  query: z.string().min(2, 'Query must be at least 2 characters'),
  language: z.enum(['id', 'en']).default('id'),
});

export async function POST(request: Request) {
  try {
    const { initialData: workspaceData, workspaceId } = await loadWorkspace();

    const rateCheck = checkRateLimit(workspaceId, 'ASK_AFFILIATEOS');
    if (!rateCheck.allowed) {
      return Response.json({ error: rateCheck.reason }, { status: 429 });
    }

    const body = requestSchema.parse(await request.json());

    // Deterministic domain query routing and context creation using real workspace data
    const { domain, context, validEntityIds } = routeAndBuildAskContext(body.query, workspaceData);

    const provider = getAIProvider();
    const systemPrompt = getAskAffiliateOSPrompt(body.language);

    const result = await provider.generateStructured({
      feature: 'ASK_AFFILIATEOS',
      promptVersion: PROMPT_VERSIONS.ASK_AFFILIATEOS,
      systemPrompt,
      context,
      userPrompt: body.query,
      schema: AskAffiliateOSSchema,
      temperature: TEMPERATURE_SETTINGS.ASK_AFFILIATEOS,
    });

    // Validate returned entity references against actual context entities
    const validatedReferences = validateEntityReferences(result.data.references, validEntityIds);

    recordAIRequest({
      workspaceId,
      feature: 'ASK_AFFILIATEOS',
      status: 'SUCCESS',
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });

    return Response.json({
      ok: true,
      data: {
        ...result.data,
        references: validatedReferences,
        domain_routed: domain,
      },
      usage: result.usage,
      latencyMs: result.latencyMs,
      model: result.model,
    });
  } catch (error) {
    const message = error instanceof z.ZodError 
      ? 'Invalid ask query request' 
      : formatAIErrorMessage(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
