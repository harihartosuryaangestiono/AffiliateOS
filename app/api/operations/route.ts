import { identity } from '@/lib/supabase/server';
import { loadWorkspace } from '@/lib/queries/workspace';
import { applyChanges, freezeReport, type Change } from '@/lib/operations/mutations';
import { canOperate } from '@/lib/operations/config';
import type { Role } from '@/types/domain';
export async function POST(request:Request){
 try {
  const {db,profile}=await identity();
  const body=await request.json() as {finalize?:string;changes?:Change[]};
  const {initialData}=await loadWorkspace();
  let changes:Change[];
  if(body.finalize){if(!canOperate(profile.role as Role,'reports'))return Response.json({error:'Read-only access.'},{status:403});changes=freezeReport(initialData,String(body.finalize),profile.name).changes;}
  else {if(!Array.isArray(body.changes)||body.changes.length>200)throw Error('Invalid changes.');changes=applyChanges(initialData,body.changes,profile.role as Role,profile.id).changes;}
  const payload=changes.map(c=>{const record:Record<string,unknown>={...c.record};if(c.table==='campaign_creators')delete record.name;delete record.contacted_by;return {...c,record};});
  const {error}=await db.rpc('mutate_operations',{changes:payload});
  if(error)throw Error(error.code==='23503'?'Select valid linked workspace records.':error.code==='23505'?'This relationship already exists.':'Could not save changes. Check migration and permissions.');
  if(body.finalize)console.info('AffiliateOS report finalized',{reportId:String(body.finalize),workspaceId:profile.workspace_id});
  return Response.json({data:(await loadWorkspace()).initialData});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Operation failed.'},{status:400});}
}
