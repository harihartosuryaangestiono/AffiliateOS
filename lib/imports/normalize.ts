import {recordCreatorStage} from '../operations/mutations.ts';
import {normalizedUsername,type ImportIssue,type RawRow} from './shared.ts';
import type {WorkspaceData,ImportJob,Performance,TikTokPerformance,ShopeePerformance} from '../../types/domain.ts';
import {validateRows} from './validation.ts';
export async function fileFingerprint(file:Blob){const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
export type NormalizationResult={normalized:(TikTokPerformance|ShopeePerformance)[];issues:ImportIssue[];validRows:number;skippedRows:number;lineage:{normalized_id:string;raw_row_number:number;source_order_id:string;source_product_id:string;status:string}[]};
export function normalizeReportDetailed(data:WorkspaceData,market:'TikTok'|'Shopee',rows:RawRow[],mapping:Record<string,string>,job:ImportJob):NormalizationResult{
 if(data.imports.some(j=>j.marketplace===market&&j.file_hash&&j.file_hash===job.file_hash))throw Error('Duplicate file: this payment order report has already been imported.');
 const result=validateRows(rows,mapping,market),issues=[...result.issues];
 const globalErrors=issues.filter(i=>i.row===1&&i.severity==='ERROR');if(globalErrors.length)throw Error(globalErrors.map(i=>i.message).join('\n'));
 const previousOrders=mapping.order_id?new Set(data.imports.filter(j=>j.marketplace===market&&j.mapping?.order_id).flatMap(j=>(j.raw_rows||[]).map(r=>[r[j.mapping!.order_id],j.mapping!.source_product_id?r[j.mapping!.source_product_id]:'',j.mapping!.source_item_id?r[j.mapping!.source_item_id]:''].join('|')))):new Set<string>();
 const accounts=market==='TikTok'?data.tiktok_accounts:data.shopee_accounts,existing=market==='TikTok'?data.tiktok_performance:data.shopee_performance;
 const perfKey=(r:Performance)=>[r.date,r.account_id,r.campaign_id||'',r.product_id||''].join('|'),seen=new Set(existing.map(perfKey)),groups=new Map<string,TikTokPerformance|ShopeePerformance>(),normalized:(TikTokPerformance|ShopeePerformance)[]=[],lineage:NormalizationResult['lineage']=[];
 for(const [index,row] of result.valid.entries()){
  const rawRow=row.source_row_number||index+2,orderKey=[row.order_id,row.source_product_id,row.source_item_id].join('|');
  if(row.order_id&&previousOrders.has(orderKey)){issues.push({row:rawRow,field:'order_id',sourceValue:row.order_id,severity:'ERROR',message:'This order item was processed by an earlier import.',suggestedAction:'Do not reprocess the same transaction item.'});continue;}
  const account=accounts.find(a=>normalizedUsername(a.username)===normalizedUsername(row.username));
  if(!account){issues.push({row:rawRow,field:'username',sourceValue:row.username,severity:'WARNING',message:`Unmatched ${market} account.`,suggestedAction:'Map this marketplace username to a creator account.'});continue;}
  const fallbackCampaign=mapping.__campaign_id||row.campaign_id;
  const campaign=data.entities.campaigns.find(c=>c.id===fallbackCampaign&&[market,'Multi-platform'].includes(String(c.marketplace)));
  if(!campaign){issues.push({row:rawRow,field:'campaign_id',sourceValue:fallbackCampaign,severity:'WARNING',message:`No ${market} campaign mapping.`,suggestedAction:'Choose a default internal campaign before processing.'});continue;}
  let productId=row.product_id;
  if(!productId&&row.source_product_id)productId=data.entities.products.find(p=>String(market==='TikTok'?p.tiktok_product_id:p.shopee_item_id)===row.source_product_id)?.id||'';
  if(row.source_product_id&&!productId)issues.push({row:rawRow,field:'source_product_id',sourceValue:row.source_product_id,severity:'WARNING',message:'Unmatched marketplace product.',suggestedAction:'Map this marketplace product ID to an internal product.'});
  const common:Performance={id:crypto.randomUUID(),date:row.date,account_id:account.id,campaign_id:campaign.id,...(productId?{product_id:productId}:{}),gmv:row.gmv,orders:row.orders,units_sold:row.units_sold,commission:row.commission,source_import_id:job.id};
  const key=perfKey(common);if(seen.has(key)){issues.push({row:rawRow,field:'date',sourceValue:row.date,severity:'ERROR',message:'This daily account/campaign/product performance already exists.',suggestedAction:'Review overlapping import periods.'});continue;}
  const value=market==='TikTok'?{...common,video_count:row.video_count||0,live_count:row.live_count||0}:{...common,clicks:row.clicks||0,conversion_rate:row.conversion_rate||0};
  const grouped=groups.get(key);
  if(grouped){for(const field of ['gmv','orders','units_sold','commission'] as const)grouped[field]+=value[field];if('video_count'in grouped&&'video_count'in value){grouped.video_count+=value.video_count;grouped.live_count+=value.live_count;}if('clicks'in grouped&&'clicks'in value){const clicks=grouped.clicks+value.clicks;grouped.conversion_rate=clicks?(grouped.conversion_rate*grouped.clicks+value.conversion_rate*value.clicks)/clicks:0;grouped.clicks=clicks;}lineage.push({normalized_id:grouped.id,raw_row_number:rawRow,source_order_id:row.order_id,source_product_id:row.source_product_id,status:'Normalized'});}
  else{groups.set(key,value);normalized.push(value);lineage.push({normalized_id:value.id,raw_row_number:rawRow,source_order_id:row.order_id,source_product_id:row.source_product_id,status:'Normalized'});}
 }
 return {normalized,issues,validRows:lineage.length,skippedRows:rows.length-lineage.length,lineage};
}
export function normalizeReport(data:WorkspaceData,market:'TikTok'|'Shopee',rows:RawRow[],mapping:Record<string,string>,job:ImportJob){const result=normalizeReportDetailed(data,market,rows,mapping,job);const errors=result.issues.filter(i=>i.severity==='ERROR');if(errors.length)throw Error(errors.slice(0,10).map(i=>`Row ${i.row}: ${i.message}`).join('\n'));if(!result.normalized.length)throw Error('No matched valid rows are ready to process.');return result.normalized;}
export function applyImportedRows(data:WorkspaceData,job:ImportJob,rows:(TikTokPerformance|ShopeePerformance)[]):WorkspaceData{let next:WorkspaceData={...data,imports:[job,...data.imports],tiktok_performance:job.marketplace==='TikTok'?[...data.tiktok_performance,...rows as TikTokPerformance[]]:data.tiktok_performance,shopee_performance:job.marketplace==='Shopee'?[...data.shopee_performance,...rows as ShopeePerformance[]]:data.shopee_performance};const accounts=job.marketplace==='TikTok'?data.tiktok_accounts:data.shopee_accounts,creatorIds=new Set(rows.filter(r=>r.orders>0).map(r=>accounts.find(a=>a.id===r.account_id)?.creator_id));for(const c of data.entities.creators.filter(c=>creatorIds.has(c.id)))next=recordCreatorStage(next,{...c,acquisition_stage:'Affiliate With Sales'},'Import',job.created_at);return next;}
