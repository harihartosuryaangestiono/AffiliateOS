import type { WorkspaceData, Performance, RecordData } from '../../types/domain.ts';
import { records, thresholds } from './config.ts';
export function todayISO(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function shiftDate(date:string,days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function formatDateID(date:string){return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(date+'T12:00:00+07:00'));}
export type Period={start:string;end:string;cutoff:string};
export function periodRange(mode='MTD',now=new Date(),lag=2,custom?:{start:string;end:string}):Period{
 const today=todayISO(now),cutoff=shiftDate(today,-lag),year=Number(today.slice(0,4)),month=Number(today.slice(5,7));
 const prevEnd=new Date(Date.UTC(year,month-1,0)).toISOString().slice(0,10),prevStart=prevEnd.slice(0,8)+'01';
 if(mode==='Custom'&&custom)return {start:custom.start,end:custom.end<cutoff?custom.end:cutoff,cutoff};
 if(mode==='Full Previous Month')return {start:prevStart,end:prevEnd<cutoff?prevEnd:cutoff,cutoff};
 if(mode==='Previous MTD'){const day=cutoff.slice(0,7)===today.slice(0,7)?Number(cutoff.slice(8)):0;return {start:prevStart,end:day?prevStart.slice(0,8)+String(Math.min(day,Number(prevEnd.slice(8)))).padStart(2,'0'):shiftDate(prevStart,-1),cutoff};}
 return {start:today.slice(0,8)+'01',end:cutoff,cutoff};
}
export function comparable(period:Period):Period{
 const d=new Date(period.start+'T12:00:00Z'),last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),0)).toISOString().slice(0,10);
 const start=last.slice(0,8)+'01',days=Math.max(0,Math.round((Date.parse(period.end)-Date.parse(period.start))/86400000)+1);
 return {start,end:days?shiftDate(start,Math.min(days,Number(last.slice(8)))-1):shiftDate(start,-1),cutoff:period.cutoff};
}
export function performanceRows(data:WorkspaceData,market='Multi-platform',filter:{creator_id?:string;campaign_id?:string;product_id?:string;client_id?:string}={}){
 const get=(m:'TikTok'|'Shopee')=>{
 const accounts=m==='TikTok'?data.tiktok_accounts:data.shopee_accounts;
 const ids=new Set(accounts.filter(a=>!filter.creator_id||a.creator_id===filter.creator_id).map(a=>a.id));
 const brands=new Set(data.entities.brands.filter(b=>!filter.client_id||b.client_id===filter.client_id).map(b=>b.id));
 const campaigns=new Set(data.entities.campaigns.filter(c=>brands.has(String(c.brand_id))).map(c=>c.id));
 return (m==='TikTok'?data.tiktok_performance:data.shopee_performance).filter(r=>(!filter.creator_id||ids.has(r.account_id))&&(!filter.campaign_id||r.campaign_id===filter.campaign_id)&&(!filter.product_id||r.product_id===filter.product_id)&&(!filter.client_id||campaigns.has(r.campaign_id))).map(r=>({...r,marketplace:m,creator_id:accounts.find(a=>a.id===r.account_id)?.creator_id}));
 };
 return [...(market!=='Shopee'?get('TikTok'):[]),...(market!=='TikTok'?get('Shopee'):[])];
}
export function metrics(data:WorkspaceData,period:Period,market='Multi-platform',filter:{creator_id?:string;campaign_id?:string;product_id?:string;client_id?:string}={}){
 const all=performanceRows(data,market,filter),rows=all.filter(r=>r.date>=period.start&&r.date<=period.end),prev=comparable(period),previous=all.filter(r=>r.date>=prev.start&&r.date<=prev.end);
 const total=(r:Performance[],k:'gmv'|'orders'|'units_sold'|'commission'='gmv')=>r.reduce((a,b)=>a+Number(b[k]||0),0);
 const gmv=total(rows),previousGmv=total(previous),campaigns=data.entities.campaigns.filter(c=>(!filter.campaign_id||c.id===filter.campaign_id)&&(!filter.client_id||data.entities.brands.some(b=>b.id===c.brand_id&&b.client_id===filter.client_id))&&(market==='Multi-platform'||c.marketplace===market||c.marketplace==='Multi-platform')&&String(c.start_date)<=period.end&&String(c.end_date)>=period.start);
 const configuredTargets=records(data,'metric_targets').filter(t=>(t.marketplace===market||t.marketplace==='Multi-platform')&&String(t.period_start)<=period.start&&String(t.period_end)>=period.end&&(!filter.client_id||t.client_id===filter.client_id)&&(!filter.campaign_id||t.campaign_id===filter.campaign_id));
 const targetRows=configuredTargets.filter(t=>t.metric==='Affiliate GMV'),affiliateTargetRows=configuredTargets.filter(t=>t.metric==='Affiliates With Sales');
 const target=filter.creator_id||filter.product_id?null:targetRows.length?targetRows.reduce((a,t)=>a+Number(t.target_value||0),0):campaigns.some(c=>c.target_gmv!==null&&c.target_gmv!==undefined&&c.target_gmv!=='')?campaigns.reduce((a,c)=>a+Number(c.target_gmv||0),0):null;
 const affiliatesTarget=filter.creator_id||filter.product_id?null:affiliateTargetRows.length?affiliateTargetRows.reduce((a,t)=>a+Number(t.target_value||0),0):campaigns.some(c=>c.target_affiliates!==null&&c.target_affiliates!==undefined&&c.target_affiliates!=='')?campaigns.reduce((a,c)=>a+Number(c.target_affiliates||0),0):null;
 return {gmv,previousGmv,growth:previousGmv?(gmv-previousGmv)/previousGmv*100:null,target,achievement:target?gmv/target*100:null,affiliates:new Set(rows.filter(r=>r.orders>0).map(r=>r.creator_id||r.account_id)).size,affiliatesTarget,orders:total(rows,'orders'),units:total(rows,'units_sold'),records:rows.length,activeCreators:new Set(rows.map(r=>r.creator_id||r.account_id)).size,asp:total(rows,'units_sold')?gmv/total(rows,'units_sold'):null,abs:total(rows,'orders')?gmv/total(rows,'orders'):null,sourceImportIds:[...new Set(rows.map(r=>r.source_import_id).filter(Boolean))]};
}
export function performanceStatus(gmv:number,growth:number|null,data:WorkspaceData){const t=thresholds(data);return gmv===0?'No Activity':growth===null?'New baseline':growth<t.critical_threshold?'Critical':growth<t.decline_threshold?'Declining':growth>t.growth_threshold?'Growing':'Stable';}
export function latestStock(data:WorkspaceData,product:string,market='Shopee',asOf=todayISO()){
 return records(data,'product_stock_snapshots').filter(s=>s.product_id===product&&s.marketplace===market&&String(s.snapshot_at)<=asOf).sort((a,b)=>String(b.snapshot_at).localeCompare(String(a.snapshot_at))||b.created_at.localeCompare(a.created_at))[0];
}
export function stockStatus(data:WorkspaceData,quantity:number|null){const t=thresholds(data);return quantity===null?'Unknown':quantity===0?'OOS':quantity<=t.critical_stock?'Critical':quantity<=t.low_stock?'Low':'Healthy';}
export function stockImpact(data:WorkspaceData,product:string){
 const ids=new Set(records(data,'hsl_creator_products').filter(r=>r.product_id===product).map(r=>r.hsl_activation_id));
 const hsl=records(data,'hsl_activations').filter(r=>ids.has(r.id)&&!['Completed','Paused'].includes(r.status));
 const creators=[...new Set(hsl.map(r=>String(r.creator_id)))],campaigns=[...new Set(hsl.map(r=>String(r.campaign_id)))];
 const peaks=records(data,'peak_days').filter(p=>campaigns.includes(String(p.campaign_id))&&String(p.event_date)>=todayISO());
 return {creators,campaigns,peaks};
}
export function readiness(data:WorkspaceData,peak:RecordData){
 const members=records(data,'peak_day_creators').filter(r=>r.peak_day_id===peak.id),ids=new Set(members.map(m=>m.creator_id));
 const locked=records(data,'campaign_creators').filter(r=>r.campaign_id===peak.campaign_id&&ids.has(r.creator_id)&&['Locked','Ready','Active','Completed'].includes(r.status));
 const hsl=records(data,'hsl_activations').filter(r=>r.campaign_id===peak.campaign_id&&ids.has(r.creator_id)&&!['Completed','Paused'].includes(r.status)),hslIds=new Set(hsl.map(h=>h.id));
 const skus=records(data,'hsl_creator_products').filter(r=>hslIds.has(String(r.hsl_activation_id))),products=[...new Set(skus.map(r=>String(r.product_id)))];
 const samples=records(data,'sample_seedings').filter(s=>s.campaign_id===peak.campaign_id&&ids.has(s.creator_id));
 const pair=(ready:number,total:number)=>({ready,total,percent:total?Math.min(100,Math.round(ready/total*100)):null});
 return {members,locked:locked.length,gap:peak.target_creators==null?null:Math.max(0,Number(peak.target_creators)-locked.length),live:members.filter(m=>['Live','Both'].includes(String(m.format))).length,video:members.filter(m=>['Video','Both'].includes(String(m.format))).length,
 checks:{'Creator locking':pair(locked.length,Number(peak.target_creators||0)),'HSL readiness':pair(hsl.filter(h=>['Ready','Active'].includes(h.status)).length,hsl.length),'SKU assignment':pair(hsl.filter(h=>skus.some(s=>s.hsl_activation_id===h.id)).length,hsl.length),'Stock readiness':pair(products.filter(p=>stockStatus(data,latestStock(data,p)?.stock_quantity as number??null)==='Healthy').length,products.length),'Sample readiness':pair(samples.filter(s=>['Received','Activation Pending','Activated','Generated Sales'].includes(s.status)).length,samples.length),'Schedule confirmed':pair(members.filter(m=>['Confirmed','Completed'].includes(m.status)).length,members.length)},strategy:!!String(peak.strategy||'').trim(),stockRisks:products.filter(p=>stockStatus(data,latestStock(data,p)?.stock_quantity as number??null)!=='Healthy'),pendingSamples:samples.filter(s=>!['Received','Activation Pending','Activated','Generated Sales'].includes(s.status)).length};
}
export type Alert={id:string;type:string;severity:'Info'|'Warning'|'Critical';entity_id:string;message:string;href:string;};
export function operationalAlerts(data:WorkspaceData,now=new Date()):Alert[]{
 const alerts:Alert[]=[],today=todayISO(now),t=thresholds(data),period=periodRange('MTD',now,t.cutoff_days);
 const push=(type:string,severity:Alert['severity'],id:string,message:string,href:string)=>alerts.push({id:type+':'+id,type,severity,entity_id:id,message,href});
 for(const p of data.entities.products){const stock=latestStock(data,p.id),status=stockStatus(data,stock?Number(stock.stock_quantity):null),impact=stockImpact(data,p.id);if(['Low','Critical','OOS'].includes(status))push(status==='OOS'?'OUT_OF_STOCK':'LOW_STOCK',status==='Low'?'Warning':'Critical',p.id,`${p.name}: ${status} · ${impact.creators.length} HSL creators affected`,`/hsl/stock?product_id=${p.id}`);}
 for(const r of records(data,'creator_outreach'))if(r.follow_up_at&&String(r.follow_up_at)<=today&&!['Declined','Converted'].includes(r.status))push('FOLLOWUP_OVERDUE','Warning',r.id,'Follow up: '+(data.entities.creators.find(c=>c.id===r.creator_id)?.name||'Creator'),`/creators/outreach?id=${r.id}`);
 for(const s of records(data,'sample_seedings')){if(['Activated','Generated Sales'].includes(s.status))continue;const overdue=(s.expected_activation_at&&String(s.expected_activation_at)<=shiftDate(today,2))||(s.received_at&&String(s.received_at)<=shiftDate(today,-t.sample_days))||(['Approved','Preparing'].includes(s.status)&&s.requested_at&&String(s.requested_at)<shiftDate(today,-t.sample_days));if(overdue)push('SAMPLE_DELAY','Warning',s.id,'Sample needs action: '+(data.entities.creators.find(c=>c.id===s.creator_id)?.name||''),`/samples?id=${s.id}`);}
 for(const creator of data.entities.creators){for(const market of ['Shopee','TikTok']){const m=metrics(data,period,market,{creator_id:creator.id});if(m.growth!==null&&m.growth<t.decline_threshold)push('CREATOR_DECLINE',m.growth<t.critical_threshold?'Critical':'Warning',creator.id+market,`${creator.name} · ${market} GMV ${m.growth.toFixed(1)}%`,`/creators/performance?creator_id=${creator.id}&marketplace=${market}`);}
 const last=performanceRows(data,'Multi-platform',{creator_id:creator.id}).filter(p=>p.orders>0&&p.date<=period.end).map(p=>p.date).sort().at(-1);if(last&&last<shiftDate(period.end,-t.inactivity_days)&&creator.status==='Active')push('CREATOR_INACTIVE','Warning',creator.id,creator.name+': no recent sales',`/creators/performance?creator_id=${creator.id}`);}
 for(const peak of records(data,'peak_days').filter(p=>String(p.event_date)>=today&&String(p.event_date)<=shiftDate(today,14)&&p.status!=='Completed')){const r=readiness(data,peak);if(r.gap||r.stockRisks.length||r.pendingSamples||!r.strategy||Object.values(r.checks).some(c=>c.total>0&&c.ready<c.total))push('PEAKDAY_NOT_READY','Warning',peak.id,peak.name+': review readiness gaps',`/peak-days/${peak.id}`);}
 for(const c of data.entities.campaigns.filter(c=>c.status==='Active')){const m=metrics(data,period,'Multi-platform',{campaign_id:c.id}),locked=records(data,'campaign_creators').filter(r=>r.campaign_id===c.id&&['Locked','Ready','Active','Completed'].includes(r.status)).length;if(c.target_creators!=null&&locked<Number(c.target_creators))push('CREATOR_TARGET_GAP','Warning',c.id,`${c.name}: ${Number(c.target_creators)-locked} creators still needed`,`/campaigns/${c.id}?tab=Creator%20Activation`);if(m.target&&m.gmv<m.target&&String(c.end_date)<=shiftDate(today,7))push('CAMPAIGN_TARGET_RISK','Warning',c.id,c.name+': target at risk',`/campaigns/${c.id}`);}
 for(const job of data.imports.filter(j=>j.failed_rows>0))push('IMPORT_ERROR','Warning',job.id,job.filename+': review validation errors',`/imports/${job.marketplace.toLowerCase()}`);
 return alerts.sort((a,b)=>Number(b.severity==='Critical')-Number(a.severity==='Critical'));
}
export function renderMessage(template:string,variables:Record<string,string>){return template.replace(/\{([a-z_]+)\}/g,(match,key)=>variables[key]??match);}
export function whatsappLink(phone:string,message:string){const digits=phone.replace(/[+\s()-]/g,'');if(!/^[1-9]\d{7,14}$/.test(digits))throw Error('Add a valid international WhatsApp number to the creator profile first.');if(/\{[a-z_]+\}/.test(message))throw Error('Fill all template variables before opening WhatsApp.');return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;}
