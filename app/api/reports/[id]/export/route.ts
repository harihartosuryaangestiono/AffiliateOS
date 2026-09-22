import { identity } from '@/lib/supabase/server';
import { buildExcelReport } from '@/lib/reporting/excel';
import { buildPowerPointReport } from '@/lib/reporting/powerpoint';
import {
  safeReportFilename,
  type FrozenReportSnapshot,
} from '@/lib/reporting/snapshot';
import { templateFor } from '@/lib/reporting/templates';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const format = new URL(request.url).searchParams.get('format');
    if (format !== 'xlsx' && format !== 'pptx')
      return Response.json(
        { error: 'Supported formats are xlsx and pptx.' },
        { status: 400 },
      );
    const { db, profile } = await identity();
    const { data: report, error: reportError } = await db
      .from('reports')
      .select(
        'id,name,report_type,marketplace,period_start,period_end,finalized_at,workspace_id',
      )
      .eq('id', id)
      .eq('workspace_id', profile.workspace_id)
      .single();
    if (reportError || !report)
      return Response.json({ error: 'Report not found.' }, { status: 404 });
    if (!report.finalized_at)
      return Response.json(
        { error: 'Finalize the report before exporting.' },
        { status: 409 },
      );
    const { data: storedSnapshot, error: snapshotError } = await db
      .from('report_snapshots')
      .select('snapshot_json')
      .eq('report_id', id)
      .eq('workspace_id', profile.workspace_id)
      .single();
    if (snapshotError || !storedSnapshot?.snapshot_json)
      return Response.json(
        { error: 'Finalized snapshot not found.' },
        { status: 404 },
      );
    const snapshot = JSON.parse(
      storedSnapshot.snapshot_json,
    ) as FrozenReportSnapshot;
    const template = templateFor(report.report_type, report.marketplace);
    const buffer =
      format === 'xlsx'
        ? await buildExcelReport({
            reportName: report.name,
            snapshot,
            template,
            finalizedAt: report.finalized_at,
          })
        : await buildPowerPointReport({
            reportName: report.name,
            snapshot,
            template,
            finalizedAt: report.finalized_at,
          });
    const { error: auditError } = await db
      .from('report_exports')
      .insert({
        workspace_id: profile.workspace_id,
        report_id: id,
        export_type: format === 'xlsx' ? 'Excel' : 'PowerPoint',
        template_id: template.id,
        template_version: template.version,
        actor_id: profile.id,
      });
    if (auditError)
      return Response.json(
        { error: 'Export audit could not be recorded.' },
        { status: 500 },
      );
    const filename = safeReportFilename(
      [report.name, report.marketplace, report.period_start, report.period_end],
      format,
    );
    return new Response(buffer, {
      headers: {
        'Content-Type':
          format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed.';
    return Response.json(
      { error: message },
      { status: message === 'Unauthenticated' ? 401 : 400 },
    );
  }
}
