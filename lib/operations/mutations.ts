import { z } from 'zod';
import type { WorkspaceData, RecordData, Role } from '../../types/domain.ts';
import { acquisitionStages, operationConfig, records, canOperate } from './config.ts';
import { metrics, todayISO } from './engine.ts';
export type Change={table:string;record:RecordData;remove?:boolean};
export function parseOperation(table:string,input:RecordData){
 const cfg=operationConfig[table];if(!cfg)throw Error('Unknown operation.');
 const timestamp=z.iso.datetime({offset:true});
 const shape:Record<string,z.ZodType>={id:z.uuid(),name:z.string().max(500).optional(),status:z.string().max(80).optional(),created_at:timestamp.optional(),updated_at:timestamp.optional(),locked_at:z.string().nullable().optional(),locked_by:z.string().nullable().optional(),finalized_at:z.string().nullable().optional()};
 for(const f of cfg.fields){let field:z.ZodType=f.relation?z.uuid():f.type==='number'?z.number().min(f.min??0).max(f.max??Number.MAX_SAFE_INTEGER):f.type==='date'?z.iso.date():f.options?z.enum(f.options as [string,...string[]]):z.string().trim().max(10000);if(f.required&&f.type!=='number'&&f.type!=='date'&&!f.relation&&!f.options)field=z.string().trim().min(1).max(10000);if(!f.required)field=z.union([field,z.literal(''),z.null()]).optional();shape[f.key]=field;}
 const result=z.object(shape).safeParse(input);if(!result.success)throw Error(result.error.issues.map(i=>i.path.join('.')+': '+i.message).join(' · '));
 const r=result.data as RecordData;
 for(const field of cfg.fields)if(r[field.key]==='')r[field.key]=null;
 for(const [start,end] of [['start_date','end_date'],['period_start','period_end'],['shipped_at','received_at'],['received_at','activated_at']])if(r[start]&&r[end]&&String(r[start])>String(r[end]))throw Error(`${end.replaceAll('_',' ')} must be on or after ${start.replaceAll('_',' ')}.`);
 if(table==='workspace_preferences'&&(Number(r.critical_stock)>Number(r.low_stock)||Number(r.critical_threshold)>Number(r.decline_threshold)))throw Error('Critical thresholds must be at or below warning thresholds.');
 if(table==='reports'&&r.cutoff_date&&String(r.cutoff_date)>todayISO())throw Error('Report cutoff cannot be in the future.');
 if(table==='product_stock_snapshots'&&(!Number.isInteger(r.stock_quantity)||String(r.snapshot_at)>todayISO()))throw Error('Stock must be a whole number and snapshot date cannot be in the future.');
 return r;
}
export function putRecord(data:WorkspaceData,table:string,r:RecordData,remove=false):WorkspaceData{
 const rows=records(data,table),next=remove?rows.filter(x=>x.id!==r.id):rows.some(x=>x.id===r.id)?rows.map(x=>x.id===r.id?r:x):[r,...rows];
 if(table in data.entities)return {...data,entities:{...data.entities,[table]:next}};
 if(table==='campaign_creators')return {...data,campaign_creators:next.map(x=>({...x,campaign_id:String(x.campaign_id),creator_id:String(x.creator_id)}))};
 return {...data,operations:{...data.operations,[table]:next}};
}
export function applyChanges(data:WorkspaceData,changes:Change[],role:Role,actor:string,now=new Date().toISOString()){
 let next=data; const prepared:Change[]=[];
 for(const change of changes){const {table,remove}=change;if(!canOperate(role,table))throw Error('Your role cannot make this change.');
 if(['report_snapshots','operational_alerts'].includes(table))throw Error('This record is system managed.');
 const old=records(next,table).find(r=>r.id===change.record.id);
 if(operationConfig[table]?.immutable&&old)throw Error('Historical records are immutable. Add a new record instead.');
 let r=remove?change.record:parseOperation(table,{...change.record,created_at:old?.created_at||now,updated_at:now});
 if(remove){const all=[...Object.values(next.entities).flat(),...Object.values(next.operations||{}).flat(),...records(next,'campaign_creators')];if(all.some(x=>x.id!==r.id&&Object.entries(x).some(([k,v])=>k.endsWith('_id')&&v===r.id)))throw Error('Remove related records before deleting.');}
 if(table==='reports'&&old?.finalized_at){
   if(remove)throw Error('Finalized reports cannot be deleted.');
   const statuses=['Ready','Presented','Archived'];
   const previous=statuses.indexOf(String(old.status)),nextStatus=statuses.indexOf(String(r.status));
   if(nextStatus<0)throw Error('Finalized reports cannot be reopened.');
   if(previous>=0&&nextStatus<previous)throw Error('Finalized report status cannot move backwards.');
   r={...old,status:r.status,updated_at:now};
 }
 else if(table==='reports'){r.status='Draft';r.finalized_at=null;}
 if(!remove){for(const field of operationConfig[table].fields){const value=r[field.key];if(field.relation&&value&&!records(next,field.relation).some(x=>x.id===value))throw Error(`Choose a valid ${field.label.toLowerCase()}.`);}
 if(table==='hsl_activations'){if(records(next,'shopee_accounts').find(a=>a.id===r.shopee_account_id)?.creator_id!==r.creator_id)throw Error('Shopee account must belong to the selected creator.');if(next.entities.campaigns.find(c=>c.id===r.campaign_id)?.marketplace==='TikTok')throw Error('HSL requires a Shopee or multi-platform campaign.');}
 const uniqueKeys:Record<string,string[]>={campaign_creators:['campaign_id','creator_id'],hsl_creator_products:['hsl_activation_id','product_id'],peak_day_creators:['peak_day_id','creator_id'],workspace_preferences:[]};if(uniqueKeys[table]&&records(next,table).some(x=>x.id!==r.id&&uniqueKeys[table].every(k=>x[k]===r[k])))throw Error('This relationship already exists.');
 if(table==='campaign_creators'&&['Locked','Ready','Active','Completed'].includes(r.status)){r.locked_at=old?.locked_at||now;r.locked_by=old?.locked_by||actor;}
 if(table==='creator_outreach'&&r.contacted_at)r.contacted_by=actor;
 if(table==='sample_seedings'){const field:Record<string,string>={Approved:'approved_at',Shipped:'shipped_at',Received:'received_at',Activated:'activated_at','Generated Sales':'activated_at'};if(field[r.status]&&!r[field[r.status]])r[field[r.status]]=todayISO(new Date(now));}
 }
 next=putRecord(next,table,r,remove);
 if(!remove&&r.creator_id){
   let stage:string|undefined;
   if(table==='campaign_creators'&&['Locked','Ready','Active','Completed'].includes(r.status))stage=['Active','Completed'].includes(r.status)?'Activated':'Locked';
   if(table==='creator_outreach'){if(r.contacted_at)stage='Contacted';if(r.status==='Replied')stage='Responded';if(r.status==='Interested')stage='Interested';if(r.status==='Converted')stage='Activated';}
   if(stage){const creator=next.entities.creators.find(c=>c.id===r.creator_id);if(creator&&acquisitionStages.indexOf(stage)>acquisitionStages.indexOf(String(creator.acquisition_stage||'Prospect'))){next=recordCreatorStage(next,{...creator,acquisition_stage:stage},actor,now);}}
 }
 prepared.push({table,record:r,remove});
 next={...next,activity:[{id:crypto.randomUUID(),action:`${operationConfig[table].singular} ${remove?'deleted':old?'updated':'created'}${r.status?' · '+r.status:''}`,entity_type:table,entity_id:r.id,user:actor,created_at:now},...next.activity]};
 }
 return {data:next,changes:prepared};
}
export function freezeReport(data:WorkspaceData,id:string,actor:string,now=new Date().toISOString()){
 const report=records(data,'reports').find(r=>r.id===id);if(!report)throw Error('Report not found.');if(report.finalized_at)throw Error('Report is already finalized.');
 const end=String(report.period_end)<String(report.cutoff_date)?String(report.period_end):String(report.cutoff_date),period={start:String(report.period_start),end,cutoff:String(report.cutoff_date)};
 if(end<period.start)throw Error('No report dates before cutoff.');
 const filter={campaign_id:report.campaign_id?String(report.campaign_id):undefined,client_id:report.client_id?String(report.client_id):undefined};
 const reportMetrics=metrics(data,period,String(report.marketplace),filter),sources=data.imports.filter(job=>reportMetrics.sourceImportIds.includes(job.id)).map(job=>({id:job.id,marketplace:job.marketplace,filename:job.filename,source_type:job.source_type,sales_metric:job.sales_metric,period_start:job.period_start,period_end:job.period_end,status:job.status}));
 const snapshot={id:crypto.randomUUID(),name:report.name,status:'Final',created_at:now,report_id:report.id,snapshot_json:JSON.stringify({period,marketplace:report.marketplace,metrics:reportMetrics,TikTok:metrics(data,period,'TikTok',filter),Shopee:metrics(data,period,'Shopee',filter),sources,narrative:{what_went_well:report.what_went_well,issues:report.issues,next_action:report.next_action},finalized_by:actor})};
 const finalized={...report,status:'Ready',finalized_at:now};
 return {data:putRecord(putRecord(data,'report_snapshots',snapshot),'reports',finalized),changes:[{table:'report_snapshots',record:snapshot},{table:'reports',record:finalized}]};
}

export function recordCreatorStage(data:WorkspaceData,creator:RecordData,actor:string,now=new Date().toISOString()):WorkspaceData {
 const old=data.entities.creators.find(c=>c.id===creator.id);
 const next=putRecord(data,'creators',creator);
 if(old?.acquisition_stage===creator.acquisition_stage)return next;
 return putRecord(next,'creator_acquisition_events',{id:crypto.randomUUID(),name:creator.name,status:String(creator.acquisition_stage||'Prospect'),creator_id:creator.id,source:String(creator.acquisition_source||'Manual'),created_at:now,created_by:actor});
}
