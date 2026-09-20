import { fileFingerprint, normalizeReportDetailed } from '@/lib/imports/normalize';
import { loadWorkspace } from '@/lib/queries/workspace';
import { readReport } from '@/lib/imports/read-file';
import { identity } from '@/lib/supabase/server';
import { validateRows } from '@/lib/imports/validation';
export async function POST(req: Request) {
  let audit: { id?: string; marketplace?: string; rows?: number } = {};
  try {
    const { db, profile } = await identity();
    if (!['Admin', 'Affiliate Manager', 'Analyst'].includes(profile.role))
      return Response.json({ error: 'Insufficient access' }, { status: 403 });
    const form = await req.formData();
    const file = form.get('file');
    const market = form.get('marketplace');
    if (
      !(file instanceof File) ||
      typeof market !== 'string' ||
      !['TikTok', 'Shopee'].includes(market) ||
      !file.size ||
      file.size > 50 * 1024 * 1024 ||
      !/^.+\.(csv|xlsx)$/i.test(file.name)
    )
      return Response.json(
        { error: 'Choose a CSV or XLSX report smaller than 50 MB.' },
        { status: 400 },
      );
    const rows = await readReport(file, market as 'TikTok'|'Shopee');
    audit = { marketplace: market, rows: rows.length };
    const mapping = JSON.parse(
      typeof form.get('mapping') === 'string'
        ? (form.get('mapping') as string)
        : '{}',
    ) as Record<string, string>;
    if (
      !mapping ||
      Array.isArray(mapping) ||
      Object.values(mapping).some((v) => typeof v !== 'string')
    )
      throw Error('Invalid column mapping.');
    const result = validateRows(rows, mapping, market as 'TikTok' | 'Shopee');
    if(result.issues.some(i=>i.row===1&&i.severity==='ERROR')) throw Error(result.errors.slice(0,10).join(" · "));
    const file_hash = await fileFingerprint(file);
    const {initialData}=await loadWorkspace();
    const id = crypto.randomUUID();
    audit.id = id;
    const path = `${profile.workspace_id}/imports/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const type = file.name.endsWith('.csv')
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const { error: uploadError } = await db.storage
      .from('workspace-files')
      .upload(path, file, { contentType: type, upsert: false });
    if (uploadError)
      throw Error(
        'Could not preserve the original file. Check workspace storage configuration.',
      );
    const job = {
      id,
      marketplace: market as 'TikTok' | 'Shopee',
      filename: file.name,
      status: result.issues.length?'Completed With Warnings':'Completed',
      file_hash,
      rows: rows.length,
      successful_rows: result.valid.length,
      failed_rows: rows.length-result.valid.length,
      mapping,
      source_type: market+' Payment Order',
      sales_metric: market==='TikTok'?'Payment Amount from TikTok Payment Order':'Purchase Value less Refund Amount from Shopee Payment Order',
      created_at: new Date().toISOString(),
    };
    let detail;
    try { detail=normalizeReportDetailed(initialData,market as 'TikTok'|'Shopee',rows,mapping,job);if(!detail.normalized.length)throw Error('No matched valid rows are ready to process.'); } catch(e) { await db.storage.from('workspace-files').remove([path]); throw e; }
    job.successful_rows=detail.validRows;job.failed_rows=detail.skippedRows;job.status=detail.issues.length?'Completed With Warnings':'Completed';
    const { error } = await db.rpc('process_import_v16', {
      normalized_rows: detail.normalized,
      job,
      file_metadata: { path, size: file.size, type },
      raw_rows: rows,
      validation_results: detail.issues,
      normalization_results: detail.lineage,
    });
    if (error) {
      await db.storage.from('workspace-files').remove([path]);
      throw Error('Import could not be saved. No analytics were changed.');
    }
    console.info('AffiliateOS import completed', { ...audit, successfulRows: job.successful_rows, failedRows: job.failed_rows, status: job.status });
    return Response.json({ job });
  } catch (e) {
    console.error('AffiliateOS import failed', { ...audit, error: e instanceof Error ? e.message : 'Import failed' });
    return Response.json(
      { error: e instanceof Error ? e.message : 'Import failed.' },
      { status: 400 },
    );
  }
}
