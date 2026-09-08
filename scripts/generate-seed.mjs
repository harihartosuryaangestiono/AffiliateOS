import fs from 'node:fs/promises';
import ts from 'typescript';
const source = (await fs.readFile(new URL('../lib/data/seed.ts',import.meta.url),'utf8')).replace('@/types/domain',new URL('../types/domain.ts',import.meta.url).href);
const javascript = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {seed}=await import('data:text/javascript;base64,'+Buffer.from(javascript).toString('base64'));
const scope="current_setting('affiliateos.seed_workspace')::uuid";
const quote=v=>v===null||v===undefined?'null':typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
let sql="-- Optional realistic demo fixtures. Apply the schema and create an Admin membership first.\n-- Set the target workspace for this SQL session before executing:\n-- select set_config('affiliateos.seed_workspace','YOUR_WORKSPACE_UUID',false);\nbegin;\n";
function insert(table,rows){for(const row of rows){const fields=Object.keys(row);sql+=`insert into public.${table}(workspace_id,${fields.join(',')}) values (${scope},${fields.map(k=>quote(row[k])).join(',')}) on conflict(id) do nothing;\n`;}}
for(const e of ['clients','brands','products','campaigns','creators','tasks'])insert(e,seed.entities[e]);
insert('tiktok_accounts',seed.tiktok_accounts);insert('shopee_accounts',seed.shopee_accounts);insert('campaign_creators',seed.campaign_creators);
for(const j of seed.imports){sql+=`insert into public.import_jobs(id,workspace_id,marketplace,original_filename,uploaded_by,status,row_count,successful_rows,failed_rows,created_at) values (${quote(j.id)},${scope},${quote(j.marketplace)},${quote(j.filename)},(select id from public.profiles where workspace_id=${scope} and role='Admin' limit 1),${quote(j.status)},${j.rows},${j.successful_rows},${j.failed_rows},${quote(j.created_at)}) on conflict(id) do nothing;\n`;}
insert('tiktok_performance_daily',seed.tiktok_performance);insert('shopee_performance_daily',seed.shopee_performance);
sql+='commit;\n';await fs.writeFile(new URL('../supabase/seed.sql',import.meta.url),sql);console.log('Generated workspace-scoped demo SQL from the application fixtures.');
