import { z } from 'zod';
import { loadWorkspace } from '@/lib/queries/workspace';
import { getAIProvider } from '@/lib/ai/client';
import { AnalyticsInsightSchema } from '@/lib/ai/schemas';
import { getAnalyticsInsightPrompt, PROMPT_VERSIONS, TEMPERATURE_SETTINGS } from '@/lib/ai/prompts';
import { checkRateLimit, recordAIRequest } from '@/lib/ai/usage';
import { formatAIErrorMessage } from '@/lib/ai/guardrails';

const requestSchema = z.object({
  marketplace: z.enum(['Shopee', 'TikTok']),
  currentPeriodLabel: z.string(),
  comparisonPeriodLabel: z.string().optional(),
  currentGmvFormatted: z.string(),
  deltaGmvFormatted: z.string().optional(),
  growthPct: z.number().nullable().optional(),
  ordersCount: z.number(),
  sellingCreatorsCount: z.number(),
  topDriverName: z.string().optional(),
  topDriverDeltaFormatted: z.string().optional(),
  largestDeclineName: z.string().optional(),
  largestDeclineDeltaFormatted: z.string().optional(),
  concentrationRiskExplanation: z.string().optional(),
  stockRiskCount: z.number().default(0),
  language: z.enum(['id', 'en']).default('id'),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const body = requestSchema.parse(rawBody);

    const { workspaceId } = await loadWorkspace();

    const rateCheck = checkRateLimit(workspaceId, 'ANALYTICS_INSIGHT');
    if (!rateCheck.allowed) {
      return Response.json({ error: rateCheck.reason }, { status: 429 });
    }

    const context = {
      marketplace: body.marketplace,
      current_period: body.currentPeriodLabel,
      comparison_period: body.comparisonPeriodLabel || 'No comparison period',
      current_gmv: body.currentGmvFormatted,
      delta_gmv: body.deltaGmvFormatted || 'Rp 0',
      growth_percentage: body.growthPct !== null && body.growthPct !== undefined ? `${body.growthPct}%` : 'N/A',
      orders_count: body.ordersCount,
      selling_creators_count: body.sellingCreatorsCount,
      top_growth_driver: body.topDriverName
        ? `${body.topDriverName} (${body.topDriverDeltaFormatted})`
        : 'None',
      largest_decline: body.largestDeclineName
        ? `${body.largestDeclineName} (${body.largestDeclineDeltaFormatted})`
        : 'None',
      concentration_risk: body.concentrationRiskExplanation || 'Normal distribution',
      stock_risks_count: body.stockRiskCount,
    };

    const provider = getAIProvider();
    const systemPrompt = getAnalyticsInsightPrompt(body.language);

    const result = await provider.generateStructured({
      feature: 'ANALYTICS_INSIGHT',
      promptVersion: PROMPT_VERSIONS.ANALYTICS_INSIGHT,
      systemPrompt,
      context,
      userPrompt: `Explain the ${body.marketplace} performance trends and identify operational priorities for the affiliate manager.`,
      schema: AnalyticsInsightSchema,
      temperature: TEMPERATURE_SETTINGS.ANALYTICS_INSIGHT,
    });

    recordAIRequest({
      workspaceId,
      feature: 'ANALYTICS_INSIGHT',
      status: 'SUCCESS',
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });

    return Response.json({
      data: result.data,
      metadata: {
        model: result.model,
        latencyMs: result.latencyMs,
      },
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? 'Invalid analytics insight request parameters'
        : formatAIErrorMessage(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
