import { fileFingerprint, normalizeReport } from '@/lib/imports/normalize';
import { loadWorkspace } from '@/lib/queries/workspace';
import { readReport } from '@/lib/imports/read-file';
import { identity } from '@/lib/supabase/server';
import { validateRows } from '@/lib/imports/validation';
export async function POST(req: Request) {
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
      file.size > 5 * 1024 * 1024 ||
      !/^.+\.(csv|xlsx)$/i.test(file.name)
    )
      return Response.json(
        { error: 'Choose a CSV or XLSX report smaller than 5 MB.' },
        { status: 400 },
      );
    const rows = await readReport(file);
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
    if(result.errors.length) throw Error(result.errors.slice(0,10).join(" · "));
    const file_hash = await fileFingerprint(file);
    const {initialData}=await loadWorkspace();
    const id = crypto.randomUUID();
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
      status: 'Completed',
      file_hash,
      rows: rows.length,
      successful_rows: rows.length,
      failed_rows: rows.length - result.valid.length,
      mapping,
      created_at: new Date().toISOString(),
    };
    let normalized;
    try { normalized=normalizeReport(initialData,market as 'TikTok'|'Shopee',rows,mapping,job); } catch(e) { await db.storage.from('workspace-files').remove([path]); throw e; }
    const { error } = await db.rpc('process_import', {
      normalized_rows: normalized,
      job,
      file_metadata: { path, size: file.size, type },
      raw_rows: rows,
      validation_errors: result.errors,
    });
    if (error) {
      await db.storage.from('workspace-files').remove([path]);
      throw Error('Import could not be saved. No analytics were changed.');
    }
    return Response.json({ job });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Import failed.' },
      { status: 400 },
    );
  }
}
