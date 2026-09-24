import { z } from 'zod';
import { loadWorkspace } from '@/lib/queries/workspace';
import { getAIProvider } from '@/lib/ai/client';
import { ReportNarrativeSchema } from '@/lib/ai/schemas';
import { getReportNarrativePrompt, PROMPT_VERSIONS, TEMPERATURE_SETTINGS } from '@/lib/ai/prompts';
import { buildReportNarrativeContext } from '@/lib/ai/context';
import { checkRateLimit, recordAIRequest } from '@/lib/ai/usage';
import { formatAIErrorMessage } from '@/lib/ai/guardrails';
import { buildReportDataset } from '@/lib/reporting/datamart';
import type { RecordData } from '@/types/domain';

const requestSchema = z.object({
  reportId: z.string().optional(),
  language: z.enum(['id', 'en']).default('id'),
  focusArea: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { initialData: workspaceData, workspaceId } = await loadWorkspace();

    const rateCheck = checkRateLimit(workspaceId, 'REPORT_NARRATIVE');
    if (!rateCheck.allowed) {
      return Response.json({ error: rateCheck.reason }, { status: 429 });
    }

    const body = requestSchema.parse(await request.json().catch(() => ({})));

    // Resolve report metadata from real workspace data
    const reportList = workspaceData.operations?.reports || [];
    const report = (body.reportId ? reportList.find((r) => r.id === body.reportId) : reportList[0]) || {
      id: 'default-report',
      name: 'Weekly Haleon Affiliate Performance Recap',
      period_start: '2026-09-01',
      period_end: '2026-09-07',
      cutoff_date: '2026-09-05',
      marketplace: 'Shopee',
      created_at: '2026-09-01T00:00:00Z',
    };

    // Build real deterministic dataset from workspace data
    const typedReport = report as unknown as RecordData;
    const dataset = buildReportDataset({ report: typedReport, data: workspaceData });
    const context = buildReportNarrativeContext(dataset as unknown as Record<string, unknown>, typedReport);
    const provider = getAIProvider();
    const systemPrompt = getReportNarrativePrompt(body.language);

    const result = await provider.generateStructured({
      feature: 'REPORT_NARRATIVE',
      promptVersion: PROMPT_VERSIONS.REPORT_NARRATIVE,
      systemPrompt,
      context,
      userPrompt: `Draft executive highlights, positive drivers, issues, and next actions for ${report.name}.`,
      schema: ReportNarrativeSchema,
      temperature: TEMPERATURE_SETTINGS.REPORT_NARRATIVE,
    });

    recordAIRequest({
      workspaceId,
      feature: 'REPORT_NARRATIVE',
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
      ? 'Invalid report narrative request' 
      : formatAIErrorMessage(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
