import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../lib/data/seed.ts';
import { upgradeDemo } from '../lib/operations/demo.ts';
import { metrics, periodRange, comparable, latestStock, stockStatus, stockImpact, readiness, operationalAlerts, whatsappLink, renderMessage } from '../lib/operations/engine.ts';
import { records } from '../lib/operations/config.ts';
import { applyChanges, freezeReport } from '../lib/operations/mutations.ts';
import { normalizeReport, normalizeReportDetailed, applyImportedRows, fileFingerprint } from '../lib/imports/normalize.ts';
import { uid, type ImportJob, type RecordData } from '../types/domain.ts';
const now=new Date('2026-09-19T08:00:00Z'),data=upgradeDemo(structuredClone(seed));
const record=(n:number,values:Partial<RecordData>):RecordData=>({id:uid(n),name:'QA record',status:'Draft',created_at:now.toISOString(),...values});
await test('H-2 reporting uses Jakarta dates, handles month boundaries and comparable month lengths',()=>{
 assert.deepEqual(periodRange('MTD',now),{start:'2026-09-01',end:'2026-09-17',cutoff:'2026-09-17'});
 assert.equal(periodRange('MTD',new Date('2026-09-18T18:00:00Z')).end,'2026-09-17');
 assert.equal(periodRange('Full Previous Month',now).end,'2026-08-31');
 assert.equal(periodRange('Previous MTD',now).end,'2026-08-17');
 assert.equal(comparable({start:'2026-03-01',end:'2026-03-31',cutoff:'2026-03-31'}).end,'2026-02-28');
 assert.equal(periodRange('MTD',new Date('2026-10-01T08:00:00Z')).end,'2026-09-29');
});
await test('Monday import changes only selected marketplace and rejects identical files/overlap; finalized report never changes',async()=>{
 const job:ImportJob={id:uid(9990),marketplace:'Shopee',filename:'qa.csv',created_at:now.toISOString(),rows:1,successful_rows:1,failed_rows:0,status:'Completed',file_hash:await fileFingerprint(new Blob(['qa']))};
 const account=data.shopee_accounts[0],campaign=data.entities.campaigns.find(c=>c.marketplace==='Shopee')!;
 const raw=[{date:'2026-09-17',username:account.username,campaign_id:campaign.id,product_id:data.entities.products[0].id,gmv:'50000',orders:'2'}],mapping=Object.fromEntries(Object.keys(raw[0]).map(k=>[k,k]));
 const normalized=normalizeReport(data,'Shopee',raw,mapping,job),before=metrics(data,periodRange('MTD',now),'Shopee'),updated=applyImportedRows(data,job,normalized);
 assert.equal(metrics(updated,periodRange('MTD',now),'Shopee').gmv,before.gmv+50000);assert.deepEqual(updated.tiktok_performance,data.tiktok_performance);
 assert.throws(()=>normalizeReport(updated,'Shopee',raw,mapping,job),/Duplicate file/);
 assert.throws(()=>normalizeReport(updated,'Shopee',raw,mapping,{...job,file_hash:'different'}),/already exists/);
 const draft=record(9991,{name:'QA Weekly',marketplace:'Shopee',report_type:'Internal Weekly',period_start:'2026-09-01',period_end:'2026-09-17',cutoff_date:'2026-09-17',what_went_well:'New acquisition',issues:'Low stock',next_action:'Follow up'});
 const saved=applyChanges(updated,[{table:'reports',record:draft}],'Analyst','QA',now.toISOString()).data;
 const frozen=freezeReport(saved,draft.id,'QA',now.toISOString()).data,snapshot=records(frozen,'report_snapshots')[0].snapshot_json;
 const changed=applyImportedRows(frozen,{...job,id:uid(9992),file_hash:'new'},normalized.map(r=>({...r,id:uid(9993),date:'2026-09-16',gmv:999999})));
 assert.equal(records(changed,'report_snapshots')[0].snapshot_json,snapshot);
 assert.equal(JSON.parse(String(snapshot)).metrics.gmv,before.gmv+50000);
 assert.ok(JSON.parse(String(snapshot)).metrics.sourceImportIds.includes(job.id));
 assert.equal(JSON.parse(String(snapshot)).sources.find((s:{id:string})=>s.id===job.id).filename,'qa.csv');
 assert.throws(()=>applyChanges(frozen,[{table:'reports',record:{...draft,status:'Draft'}}],'Admin','QA'),/cannot be reopened/);
});
await test('HSL rejects mismatched account and campaign and supports stock impact through Peak Day',()=>{
 const hsl=records(data,'hsl_activations')[0];assert.ok(hsl);
 assert.throws(()=>applyChanges(data,[{table:'hsl_activations',record:{...hsl,creator_id:data.entities.creators[2].id}}],'Admin','QA'),/belong/);
 const product=String(records(data,'hsl_creator_products')[0].product_id),stock=latestStock(data,product,'Shopee','2026-09-19');assert.equal(stock?.stock_quantity,8);assert.equal(stockStatus(data,8),'Critical');assert.equal(stockImpact(data,product).creators.length,1);
 assert.ok(operationalAlerts(data,now).some(a=>a.type==='LOW_STOCK'));
 const peak=records(data,'peak_days')[0],before=readiness(data,peak);assert.equal(before.gap,6);
 const membership=record(9980,{campaign_id:peak.campaign_id,creator_id:hsl.creator_id,status:'Locked',format:'Live'}),updated=applyChanges(data,[{table:'campaign_creators',record:membership}],'Affiliate Manager','QA',now.toISOString()).data;
 assert.equal(readiness(updated,peak).gap,5);assert.equal(records(updated,'campaign_creators').find(r=>r.id===membership.id)?.locked_at,now.toISOString());
});
await test('Sample transitions persist timestamps and resolve overdue alerts on activation',()=>{
 const sample=records(data,'sample_seedings')[0];assert.ok(operationalAlerts(data,now).some(a=>a.entity_id===sample.id&&a.type==='SAMPLE_DELAY'));
 const updated=applyChanges(data,[{table:'sample_seedings',record:{...sample,status:'Activated'}}],'Affiliate Manager','QA',now.toISOString()).data;
 assert.equal(records(updated,'sample_seedings')[0].activated_at,'2026-09-19');assert.ok(!operationalAlerts(updated,now).some(a=>a.entity_id===sample.id&&a.type==='SAMPLE_DELAY'));
});
await test('Production timestamp offsets remain valid during workflow updates',()=>{
 const sample=records(data,'sample_seedings')[0],withOffset={...sample,created_at:'2026-09-19T08:00:00+00:00',status:'Approved'};
 assert.doesNotThrow(()=>applyChanges({...data,operations:{...data.operations,sample_seedings:[withOffset]}},[{table:'sample_seedings',record:withOffset}],'Affiliate Manager','QA',now.toISOString()));
});
await test('Read-only roles, relationship duplicates, invalid values and immutable stock history are rejected',()=>{
 const stock=records(data,'product_stock_snapshots')[0];assert.throws(()=>applyChanges(data,[{table:'product_stock_snapshots',record:stock}],'Viewer','QA'),/role/);assert.throws(()=>applyChanges(data,[{table:'product_stock_snapshots',record:stock}],'Admin','QA'),/immutable/);
 assert.throws(()=>applyChanges(data,[{table:'product_stock_snapshots',record:{...stock,id:uid(9970),stock_quantity:-1}}],'Admin','QA'),/stock_quantity/);
 assert.throws(()=>applyChanges(data,[{table:'sample_seedings',record:{...records(data,'sample_seedings')[0],creator_id:uid(99999)}}],'Admin','QA'),/valid creator/);
});
await test('WhatsApp URL is encoded and cannot be opened with missing number or unresolved variables',()=>{
 const message=renderMessage('Hi {creator_name}: {campaign_name}',{creator_name:'Demo & Test',campaign_name:'Payday'});
 const link=whatsappLink('12345678901',message);assert.equal(new URL(link).searchParams.get('text'),message);assert.throws(()=>whatsappLink('',message),/valid international/);assert.throws(()=>whatsappLink('12345678901','Hi {creator_name}'),/variables/);
});
await test('Payment-order rows aggregate at daily grain while preserving unique order evidence',()=>{
 const job:ImportJob={id:uid(9960),marketplace:'Shopee',filename:'orders.csv',created_at:now.toISOString(),rows:2,successful_rows:2,failed_rows:0,status:'Completed'};
 const raw=[{date:'2026-09-17',order_id:'QA-order-1',username:data.shopee_accounts[0].username,campaign_id:data.entities.campaigns.find(c=>c.marketplace==='Shopee')!.id,product_id:data.entities.products[0].id,gmv:'100'}, {date:'2026-09-17',order_id:'QA-order-2',username:data.shopee_accounts[0].username,campaign_id:data.entities.campaigns.find(c=>c.marketplace==='Shopee')!.id,product_id:data.entities.products[0].id,gmv:'250'}];
 const mapping=Object.fromEntries(Object.keys(raw[0]).map(k=>[k,k]));
 const normalized=normalizeReport(data,'Shopee',raw,mapping,job);assert.equal(normalized.length,1);assert.equal(normalized[0].gmv,350);assert.equal(normalized[0].orders,2);assert.equal(normalized[0].source_import_id,job.id);
 assert.throws(()=>normalizeReport(data,'Shopee',[raw[0],raw[0]],mapping,job),/Duplicate payment order/);
});
await test('normalization lineage preserves original row numbers after invalid rows are skipped',()=>{
 const job:ImportJob={id:uid(9950),marketplace:'Shopee',filename:'lineage.csv',created_at:now.toISOString(),rows:2,successful_rows:1,failed_rows:1,status:'Completed With Warnings'};
 const campaign=data.entities.campaigns.find(c=>c.marketplace==='Shopee')!;
 const raw=[{date:'invalid',order_id:'BAD-1',username:data.shopee_accounts[0].username,gmv:'100'},{date:'2026-09-16',order_id:'GOOD-1',username:data.shopee_accounts[0].username,gmv:'200'}];
 const mapping={date:'date',order_id:'order_id',username:'username',gmv:'gmv',__campaign_id:campaign.id};
 const result=normalizeReportDetailed(data,'Shopee',raw,mapping,job);
 assert.equal(result.normalized.length,1);
 assert.equal(result.lineage[0].raw_row_number,3);
});
