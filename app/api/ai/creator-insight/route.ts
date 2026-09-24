import { z } from 'zod';
import { loadWorkspace } from '@/lib/queries/workspace';
import { getAIProvider } from '@/lib/ai/client';
import { CreatorInsightSchema } from '@/lib/ai/schemas';
import { getCreatorInsightPrompt, PROMPT_VERSIONS, TEMPERATURE_SETTINGS } from '@/lib/ai/prompts';
import { buildCreatorInsightContext } from '@/lib/ai/context';
import { checkRateLimit, recordAIRequest } from '@/lib/ai/usage';
import { formatAIErrorMessage } from '@/lib/ai/guardrails';

const requestSchema = z.object({
  creatorId: z.string().min(1),
  language: z.enum(['id', 'en']).default('id'),
});

export async function POST(request: Request) {
  try {
    const { initialData: workspaceData, workspaceId } = await loadWorkspace();

    const rateCheck = checkRateLimit(workspaceId, 'CREATOR_INSIGHT');
    if (!rateCheck.allowed) {
      return Response.json({ error: rateCheck.reason }, { status: 429 });
    }

    const body = requestSchema.parse(await request.json());

    const creator = (workspaceData.entities.creators || []).find(c => c.id === body.creatorId) || {
      id: body.creatorId,
      name: 'Creator Partner',
      handle: '@creator',
      marketplace: 'Shopee',
      tier: 'Macro',
      status: 'Active',
      created_at: new Date().toISOString(),
    };

    // Filter performance rows via creator marketplace accounts or creator_id
    const accountIds = new Set([
      ...(workspaceData.shopee_accounts || []).filter(a => a.creator_id === body.creatorId).map(a => a.id),
      ...(workspaceData.tiktok_accounts || []).filter(a => a.creator_id === body.creatorId).map(a => a.id),
    ]);

    const shopeeRows = (workspaceData.shopee_performance || []).filter(r => accountIds.has(r.account_id));
    const tiktokRows = (workspaceData.tiktok_performance || []).filter(r => accountIds.has(r.account_id));
    const performanceRows = [...shopeeRows, ...tiktokRows];

    // Signals related to creator
    const creatorName = String(creator.name || '');
    const signals = (workspaceData.operations?.operational_actions || []).filter(
      a => a.entity_id === body.creatorId || (a.title && String(a.title).includes(creatorName))
    );

    const hsl = (workspaceData.operations?.hsl_activations || []).find(h => h.creator_id === body.creatorId) || null;
    const sample = (workspaceData.operations?.sample_seedings || []).find(s => s.creator_id === body.creatorId) || null;

    const context = buildCreatorInsightContext(creator, performanceRows, signals, hsl, sample);
    const provider = getAIProvider();
    const systemPrompt = getCreatorInsightPrompt(body.language);

    const result = await provider.generateStructured({
      feature: 'CREATOR_INSIGHT',
      promptVersion: PROMPT_VERSIONS.CREATOR_INSIGHT,
      systemPrompt,
      context,
      userPrompt: `Generate performance insights for creator ${creator.name} (${creator.id}).`,
      schema: CreatorInsightSchema,
      temperature: TEMPERATURE_SETTINGS.CREATOR_INSIGHT,
    });

    recordAIRequest({
      workspaceId,
      feature: 'CREATOR_INSIGHT',
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
    const message = error instanceof z.ZodError 
      ? 'Invalid creator insight request payload' 
      : formatAIErrorMessage(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
