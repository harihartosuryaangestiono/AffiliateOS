import { identity } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { db, profile } = await identity();
    const { data: file, error: fileError } = await db
      .from('import_files')
      .select('storage_path,original_filename,mime_type')
      .eq('import_job_id', id)
      .eq('workspace_id', profile.workspace_id)
      .single();
    if (fileError || !file)
      return Response.json({ error: 'Import source file not found.' }, { status: 404 });

    const { data, error } = await db.storage
      .from('workspace-files')
      .download(file.storage_path);
    if (error || !data)
      return Response.json({ error: 'Import source file could not be read.' }, { status: 404 });

    const filename = encodeURIComponent(file.original_filename);
    return new Response(data, {
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  }
}
