import { z } from 'zod';
import { loadWorkspace } from '@/lib/queries/workspace';
import { getAIProvider } from '@/lib/ai/client';
import { OutreachDraftSchema } from '@/lib/ai/schemas';
import { getOutreachPrompt, PROMPT_VERSIONS, TEMPERATURE_SETTINGS } from '@/lib/ai/prompts';
import { buildOutreachContext } from '@/lib/ai/context';
import { checkRateLimit, recordAIRequest } from '@/lib/ai/usage';
import { formatAIErrorMessage } from '@/lib/ai/guardrails';
import type { OutreachTone } from '@/lib/ai/types';

const requestSchema = z.object({
  creatorId: z.string().min(1),
  tone: z.enum(['FRIENDLY', 'PROFESSIONAL', 'CASUAL', 'CONCISE', 'FOLLOW_UP']).default('FRIENDLY'),
  customInstructions: z.string().optional(),
  language: z.enum(['id', 'en']).default('id'),
});

export async function POST(request: Request) {
  try {
    const { initialData: workspaceData, workspaceId } = await loadWorkspace();

    const rateCheck = checkRateLimit(workspaceId, 'OUTREACH_DRAFT');
    if (!rateCheck.allowed) {
      return Response.json({ error: rateCheck.reason }, { status: 429 });
    }

    const body = requestSchema.parse(await request.json());

    // Resolve creator from workspace database or fallback
    const creator = (workspaceData.entities.creators || []).find(c => c.id === body.creatorId) || {
      id: body.creatorId,
      name: 'Creator Partner',
      handle: '@affiliate_creator',
      marketplace: 'Shopee',
      tier: 'Micro',
      status: 'Target',
      created_at: new Date().toISOString(),
    };

    // Find active campaign, HSL, sample
    const campaign = (workspaceData.entities.campaigns || [])[0] || null;
    const hsl = (workspaceData.operations?.hsl_activations || []).find(h => h.creator_id === body.creatorId) || null;
    const sample = (workspaceData.operations?.sample_seedings || []).find(s => s.creator_id === body.creatorId) || null;

    const context = buildOutreachContext(creator, {
      campaign,
      stage: creator.status,
      hslContext: hsl,
      sampleContext: sample,
      deadline: campaign?.end_date ? String(campaign.end_date) : 'End of Week',
    });

    const provider = getAIProvider();
    const systemPrompt = getOutreachPrompt(body.tone as OutreachTone, body.language);

    const result = await provider.generateStructured({
      feature: 'OUTREACH_DRAFT',
      promptVersion: PROMPT_VERSIONS.OUTREACH_DRAFT,
      systemPrompt,
      context,
      userPrompt: body.customInstructions || `Draft a ${body.tone} outreach message for ${creator.name}.`,
      schema: OutreachDraftSchema,
      temperature: TEMPERATURE_SETTINGS.OUTREACH_DRAFT,
    });

    recordAIRequest({
      workspaceId,
      feature: 'OUTREACH_DRAFT',
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
      ? 'Invalid outreach request payload' 
      : formatAIErrorMessage(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
