import { recordCreatorStage } from '../operations/mutations.ts';
import type { WorkspaceData, ImportJob, Performance, TikTokPerformance, ShopeePerformance } from '../../types/domain.ts';
import { validateRows, type RawRow } from './validation.ts';
export async function fileFingerprint(file:Blob){const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
export function normalizeReport(data:WorkspaceData,market:'TikTok'|'Shopee',rows:RawRow[],mapping:Record<string,string>,job:ImportJob){
 if(data.imports.some(j=>j.marketplace===market&&j.file_hash&&j.file_hash===job.file_hash))throw Error('Duplicate file: this payment order report has already been imported.');
 const result=validateRows(rows,mapping,market);if(result.errors.length)throw Error(result.errors.slice(0,10).join('\n'));
 if(mapping.order_id){const previousOrders=new Set(data.imports.filter(j=>j.marketplace===market&&j.mapping?.order_id).flatMap(j=>(j.raw_rows||[]).map(r=>r[j.mapping!.order_id])));if(result.valid.some(r=>previousOrders.has(String(r.order_id))))throw Error('A payment order in this file has already been imported.');}
 const accounts=market==='TikTok'?data.tiktok_accounts:data.shopee_accounts,existing=market==='TikTok'?data.tiktok_performance:data.shopee_performance;
 const key=(r:Performance)=>[r.date,r.account_id,r.campaign_id,r.product_id||''].join('|');
 const seen=new Set(existing.map(key));const normalized: (TikTokPerformance|ShopeePerformance)[]=[];
 const groups=new Map<string,TikTokPerformance|ShopeePerformance>();
 for(const [index,r] of result.valid.entries()){
 const account=accounts.find(a=>a.username.replace(/^@/,'').toLowerCase()===String(r.username).replace(/^@/,'').toLowerCase());
 if(!account)throw Error(`Row ${index+2}: unknown ${market} account ${r.username}. Add it to the creator profile first.`);
 const campaign=data.entities.campaigns.find(c=>c.id===r.campaign_id);if(!campaign||![market,'Multi-platform'].includes(String(campaign.marketplace)))throw Error(`Row ${index+2}: choose a campaign belonging to ${market}.`);
 if(r.product_id&&!data.entities.products.some(p=>p.id===r.product_id))throw Error(`Row ${index+2}: product ID is not in this workspace.`);
 const common:Performance={id:crypto.randomUUID(),date:String(r.date),account_id:account.id,campaign_id:campaign.id,...(r.product_id?{product_id:String(r.product_id)}:{}),gmv:Number(r.gmv),orders:Number(r.orders),units_sold:Number(r.units_sold||0),commission:Number(r.commission||0),source_import_id:job.id};
 if(seen.has(key(common)))throw Error(`Row ${index+2}: performance for this account/date/campaign/product already exists. No data was changed.`);
 const row=market==='TikTok'?{...common,video_count:Number(r.video_count||0),live_count:Number(r.live_count||0)}:{...common,clicks:Number(r.clicks||0),conversion_rate:Number(r.conversion_rate||0)};
 const grouped=groups.get(key(common));
 if(grouped){for(const field of ['gmv','orders','units_sold','commission'] as const)grouped[field]+=row[field];if('video_count' in grouped&&'video_count' in row){grouped.video_count+=row.video_count;grouped.live_count+=row.live_count;}if('clicks' in grouped&&'clicks' in row){const clicks=grouped.clicks+row.clicks;grouped.conversion_rate=clicks?(grouped.conversion_rate*grouped.clicks+row.conversion_rate*row.clicks)/clicks:0;grouped.clicks=clicks;}}
 else {groups.set(key(common),row);normalized.push(row);}
 
 }
 return normalized;
}
export function applyImportedRows(data:WorkspaceData,job:ImportJob,rows:(TikTokPerformance|ShopeePerformance)[]):WorkspaceData{
 let next:WorkspaceData={...data,imports:[job,...data.imports],tiktok_performance:job.marketplace==='TikTok'?[...data.tiktok_performance,...rows as TikTokPerformance[]]:data.tiktok_performance,shopee_performance:job.marketplace==='Shopee'?[...data.shopee_performance,...rows as ShopeePerformance[]]:data.shopee_performance};
 const accounts=job.marketplace==='TikTok'?data.tiktok_accounts:data.shopee_accounts,creatorIds=new Set(rows.filter(r=>r.orders>0).map(r=>accounts.find(a=>a.id===r.account_id)?.creator_id));
 for(const c of data.entities.creators.filter(c=>creatorIds.has(c.id)))next=recordCreatorStage(next,{...c,acquisition_stage:'Affiliate With Sales'},'Import',job.created_at);
 return next;
}
