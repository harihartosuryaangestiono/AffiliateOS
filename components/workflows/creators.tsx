'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { EntityForm } from '@/components/operations/entity-form';
import { Status } from '@/components/operations/shared';
import { Heading, OperationsTable, OpForm, PeriodControl, usePeriod } from './primitives';
import { acquisitionStages, canOperate, records, thresholds } from '@/lib/operations/config';
import { metrics, periodRange, performanceRows, performanceStatus, renderMessage, whatsappLink, todayISO } from '@/lib/operations/engine';
import { money } from '@/lib/data/metrics';
import type { RecordData } from '@/types/domain';
import { toast } from 'sonner';
export function Acquisition(){
 const {data,save,canEdit,mutate}=useWorkspace(),[stage,setStage]=useState(''),[search,setSearch]=useState(''),[form,setForm]=useState(false),[selected,setSelected]=useState<string[]>([]),[campaign,setCampaign]=useState(''),[page,setPage]=useState(0),[sort,setSort]=useState('name'),[taskForm,setTaskForm]=useState(false),[taskTitle,setTaskTitle]=useState('Follow up creator activation'),[taskDate,setTaskDate]=useState(todayISO());
 const stageOf=(r:RecordData)=>String(r.acquisition_stage||'Prospect');
 const rows=data.entities.creators.filter(c=>(!stage||stageOf(c)===stage)&&[c.name,c.acquisition_source,c.relationship_status].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b)=>String(a[sort]||'').localeCompare(String(b[sort]||'')));
 const visible=rows.slice(page*10,page*10+10),counts=acquisitionStages.map(s=>data.entities.creators.filter(c=>stageOf(c)===s).length);
 async function bulk(action:'outreach'|'campaign'|'lock'){try{if(action!=='outreach'&&!campaign)throw Error('Select a campaign first.');await mutate(selected.map(id=>{const old=records(data,'campaign_creators').find(r=>r.creator_id===id&&r.campaign_id===campaign);return action==='outreach'?{table:'creator_outreach',record:{id:crypto.randomUUID(),name:'Creator outreach',status:'No Response',created_at:new Date().toISOString(),creator_id:id,channel:'WhatsApp',reason:'Acquisition',follow_up_at:todayISO()}}:{table:'campaign_creators',record:{...old,id:old?.id||crypto.randomUUID(),name:'Campaign creator',created_at:old?.created_at||new Date().toISOString(),creator_id:id,campaign_id:campaign,format:old?.format||'Live',status:action==='lock'?'Locked':'Target'}};}));setSelected([]);}catch(e){toast.error(e instanceof Error?e.message:'Action failed.');}}
 return <><Heading title="Creator acquisition" description="Move prospects into active, revenue-generating partnerships."><Button disabled={!canEdit('creators')} onClick={()=>setForm(true)}><Plus size={15}/>Add prospect</Button></Heading><div className="ops-funnel">{acquisitionStages.map((s,i)=><button key={s} className={stage===s?'active':''} onClick={()=>{setStage(stage===s?'':s);setPage(0);}}><small>{s}</small><b>{counts[i]}</b><span>{data.entities.creators.length?(counts[i]/data.entities.creators.length*100).toFixed(0):0}% of database</span></button>)}</div><section className="panel ops-table-panel"><div className="ops-toolbar"><Input aria-label="Search creators" placeholder="Search name, relationship, source" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/><select aria-label="Acquisition stage" value={stage} onChange={e=>{setStage(e.target.value);setPage(0);}}><option value="">All stages</option>{acquisitionStages.map(s=><option key={s}>{s}</option>)}</select><select aria-label="Sort creators" value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Sort by name</option><option value="acquisition_stage">Sort by stage</option><option value="created_at">Sort by created date</option></select></div>{selected.length>0&&<div className="ops-bulk"><span>{selected.length} selected</span><select aria-label="Bulk campaign" value={campaign} onChange={e=>setCampaign(e.target.value)}><option value="">Choose campaign</option>{data.entities.campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><Button size="sm" onClick={()=>bulk('campaign')}>Add to campaign</Button><Button size="sm" onClick={()=>bulk('lock')}>Lock for activation</Button><Button size="sm" variant="outline" onClick={()=>bulk('outreach')}>Add to outreach</Button><Button size="sm" variant="outline" onClick={()=>setTaskForm(true)}>Assign task</Button><Button size="sm" variant="ghost" onClick={()=>setSelected([])}>Clear</Button></div>}<div className="ops-scroll"><table className="ops-table"><thead><tr><th>Select</th><th>Creator</th><th>Relationship</th><th>Source</th><th>Acquisition stage</th><th>Actions</th></tr></thead><tbody>{visible.map(c=><tr key={c.id}><td><input aria-label={'Select '+c.name} type="checkbox" disabled={!canEdit('creators')} checked={selected.includes(c.id)} onChange={e=>setSelected(e.target.checked?[...selected,c.id]:selected.filter(id=>id!==c.id))}/></td><td><Link href={'/creators/'+c.id}>{c.name}</Link></td><td>{String(c.relationship_status||'Prospect')}</td><td>{String(c.acquisition_source||'Manual')}</td><td><select aria-label={'Stage for '+c.name} disabled={!canEdit('creators')} value={stageOf(c)} onChange={e=>save('creators',{...c,acquisition_stage:e.target.value}).catch(e=>toast.error(e.message))}>{acquisitionStages.map(s=><option key={s}>{s}</option>)}</select></td><td><Link href={'/creators/outreach?create=1&creator_id='+c.id}>Contact →</Link></td></tr>)}</tbody></table>{!rows.length&&<div className="ops-empty">No creators in this view.</div>}</div><div className="ops-pagination"><span>{rows.length} creators</span><Button variant="ghost" disabled={page===0} onClick={()=>setPage(page-1)}>Previous</Button><Button variant="ghost" disabled={(page+1)*10>=rows.length} onClick={()=>setPage(page+1)}>Next</Button></div></section>{taskForm&&<Sheet open onOpenChange={setTaskForm}><SheetContent><SheetHeader><SheetTitle>Assign tasks to {selected.length} creators</SheetTitle><SheetDescription>One linked task will be created for each selected creator.</SheetDescription></SheetHeader><form className="entity-form" onSubmit={async e=>{e.preventDefault();try{await mutate(selected.map(id=>({table:'tasks',record:{id:crypto.randomUUID(),name:taskTitle,status:'To Do',created_at:new Date().toISOString(),creator_id:id,due_date:taskDate,priority:'Medium'}})));setTaskForm(false);setSelected([]);}catch(e){toast.error(e instanceof Error?e.message:'Could not create tasks');}}}><label htmlFor="bulk-task-title">Task title</label><Input id="bulk-task-title" required value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}/><label htmlFor="bulk-task-date">Due date</label><Input id="bulk-task-date" type="date" required value={taskDate} onChange={e=>setTaskDate(e.target.value)}/><Button type="submit">Create linked tasks</Button></form></SheetContent></Sheet>}{form&&<EntityForm entity="creators" record={{relationship_status:'Prospect',acquisition_stage:'Prospect'}} onClose={()=>setForm(false)}/>}</>;
}
export function Outreach({creatorId}:{creatorId?:string}){
 const {data,role,mutate}=useWorkspace(),params=useSearchParams(),[tab,setTab]=useState(params.get('id')||creatorId?'All':'Need Contact'),[preview,setPreview]=useState<RecordData|null>(null),[templates,setTemplates]=useState(false),today=todayISO();
 const rows=records(data,'creator_outreach').filter(r=>!creatorId||r.creator_id===creatorId).filter(r=>tab==='All'||(tab==='Need Contact'?!r.contacted_at:tab==='Follow-up Today'?r.follow_up_at&&String(r.follow_up_at)<=today&&!['Declined','Converted'].includes(r.status):tab==='Waiting Response'?r.contacted_at&&['No Response','Follow Up'].includes(r.status):r.contacted_at&&String(r.contacted_at)>=today.slice(0,8)+'01'));
 const canEdit=canOperate(role,'creator_outreach');
 return <>{!creatorId&&<Heading title="Outreach center" description="Preview a message, contact intentionally, and record the next step."><Button variant="outline" onClick={()=>setTemplates(!templates)}>{templates?'Back to outreach':'Message templates'}</Button></Heading>}{templates?<OperationsTable table="outreach_templates"/>:<><div className="ops-tabs">{['Need Contact','Follow-up Today','Waiting Response','Recently Contacted','All'].map(s=><button key={s} onClick={()=>setTab(s)} className={tab===s?'active':''}>{s}</button>)}</div><OperationsTable table="creator_outreach" rows={rows} createValues={creatorId?{creator_id:creatorId}:{}} where={creatorId?{creator_id:creatorId}:{}} actions={r=>canEdit?<><Button size="sm" variant="outline" onClick={()=>setPreview(r)}><MessageCircle size={14}/>Preview message</Button><Button size="sm" variant="ghost" onClick={()=>mutate([{table:'creator_outreach',record:{...r,contacted_at:today}}]).catch(e=>toast.error(e.message))}>Mark contacted</Button></>:null}/></>}{preview&&<MessagePreview outreach={preview} onClose={()=>setPreview(null)}/>}</>;
}
function MessagePreview({outreach,onClose}:{outreach:RecordData;onClose:()=>void}){
 const {data}=useWorkspace(),creator=data.entities.creators.find(c=>c.id===outreach.creator_id),campaign=data.entities.campaigns.find(c=>c.id===outreach.campaign_id),brand=data.entities.brands.find(b=>b.id===campaign?.brand_id);
 const templates=records(data,'outreach_templates'),[template,setTemplate]=useState(String(outreach.template_id||templates[0]?.id||'')),[product,setProduct]=useState(''),[peak,setPeak]=useState(''),[custom,setCustom]=useState<string|null>(null),[error,setError]=useState('');
 const message=custom??renderMessage(String(templates.find(t=>t.id===template)?.message||'Hi {creator_name}, would you be available to discuss an upcoming activation?'),{creator_name:creator?.name||'',campaign_name:campaign?.name||'{campaign_name}',brand_name:brand?.name||'{brand_name}',product_name:product||'{product_name}',peak_day:peak||'{peak_day}'});
 return <Sheet open onOpenChange={v=>!v&&onClose()}><SheetContent className="entity-sheet sm:max-w-[540px]"><SheetHeader><SheetTitle>Message preview</SheetTitle><SheetDescription>Review and edit before opening WhatsApp. Nothing is sent automatically.</SheetDescription></SheetHeader><div className="entity-form"><label htmlFor="message-creator">Creator<Input id="message-creator" readOnly value={creator?.name||''}/></label><label>Template<select value={template} onChange={e=>{setTemplate(e.target.value);setCustom(null);}}>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label htmlFor="message-product">Product name (if used)<Input id="message-product" value={product} onChange={e=>{setProduct(e.target.value);setCustom(null);}}/></label><label htmlFor="message-peak">Peak Day (if used)<Input id="message-peak" value={peak} onChange={e=>{setPeak(e.target.value);setCustom(null);}}/></label><label htmlFor="message-text">Message<Textarea id="message-text" rows={8} value={message} onChange={e=>setCustom(e.target.value)}/></label>{!creator?.phone&&<p className="ops-help">Add an international WhatsApp number in the creator profile before contacting.</p>}{error&&<p role="alert" className="error-banner">{error}</p>}<div className="form-footer"><Link className="button-outline" href={'/creators/'+creator?.id}>Creator profile</Link><Button disabled={!creator?.phone} onClick={()=>{try{const link=whatsappLink(String(creator?.phone||''),message);window.open(link,'_blank','noopener,noreferrer');}catch(e){setError(e instanceof Error?e.message:'Invalid phone number');}}}>Open WhatsApp</Button></div></div></SheetContent></Sheet>;
}
export function PerformanceWatch({creatorId}:{creatorId?:string}){
 const {data}=useWorkspace(),params=useSearchParams(),{mode,setMode,custom,setCustom}=usePeriod(),[market,setMarket]=useState(params.get('marketplace')||'Shopee'),[search,setSearch]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(0),[sort,setSort]=useState('growth');
 const period=periodRange(mode,new Date(),thresholds(data).cutoff_days,custom),rows=data.entities.creators.filter(c=>(!creatorId||c.id===creatorId)&&(!params.get('creator_id')||c.id===params.get('creator_id'))&&c.name.toLowerCase().includes(search.toLowerCase())).map(c=>{const m=metrics(data,period,market,{creator_id:c.id});return {c,m,status:performanceStatus(m.gmv,m.growth,data),last:performanceRows(data,market,{creator_id:c.id}).filter(r=>r.date<=period.end&&r.orders>0).map(r=>r.date).sort().at(-1)};}).filter(r=>!status||r.status===status).sort((a,b)=>sort==='gmv'?b.m.gmv-a.m.gmv:(a.m.growth??0)-(b.m.growth??0));
 return <>{!creatorId&&<Heading title="Creator performance watch" description="Compare equivalent reporting periods and act on meaningful changes."/>}<div className="ops-filter-bar"><PeriodControl mode={mode} onMode={setMode} custom={custom} onCustom={setCustom} period={period}/><select aria-label="Marketplace" value={market} onChange={e=>setMarket(e.target.value)}><option>Shopee</option><option>TikTok</option></select></div><section className="panel ops-table-panel"><div className="ops-toolbar"><Input placeholder="Search creators" aria-label="Search creators" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/><select aria-label="Performance status" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">All performance</option>{['Growing','Stable','Declining','Critical','No Activity','New baseline'].map(s=><option key={s}>{s}</option>)}</select><select aria-label="Sort performance" value={sort} onChange={e=>setSort(e.target.value)}><option value="growth">Growth: lowest first</option><option value="gmv">GMV: highest first</option></select></div><div className="ops-scroll"><table className="ops-table"><thead><tr>{['Creator','GMV','Previous comparable','Growth','Orders / units','Last sales activity','Status','Action'].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{rows.slice(page*10,page*10+10).map(({c,m,status,last})=><tr key={c.id}><td><Link href={'/creators/'+c.id}>{c.name}</Link></td><td>{money(m.gmv,true)}</td><td>{money(m.previousGmv,true)}</td><td>{m.growth===null?'No baseline':m.growth.toFixed(1)+'%'}</td><td>{m.orders} / {m.units}</td><td>{last||'No activity'}</td><td><Status value={status}/></td><td><Link href={'/creators/outreach?create=1&creator_id='+c.id}>Follow up →</Link></td></tr>)}</tbody></table>{!rows.length&&<div className="ops-empty">No matching creators.</div>}</div><div className="ops-pagination"><span>{rows.length} creators · thresholds adjustable in Settings</span><Button variant="ghost" disabled={page===0} onClick={()=>setPage(page-1)}>Previous</Button><Button variant="ghost" disabled={(page+1)*10>=rows.length} onClick={()=>setPage(page+1)}>Next</Button></div></section></>;
}
export function ActivationTable({campaignId,creatorId}:{campaignId?:string;creatorId?:string}){
 const {mutate}=useWorkspace();return <OperationsTable table="campaign_creators" where={{...(campaignId?{campaign_id:campaignId}:{}),...(creatorId?{creator_id:creatorId}:{})}} createValues={{...(campaignId?{campaign_id:campaignId}:{}),...(creatorId?{creator_id:creatorId}:{})}} bulk={(selected,clear)=><Button size="sm" onClick={()=>mutate(selected.map(r=>({table:'campaign_creators',record:{...r,status:'Locked'}}))).then(clear).catch(e=>toast.error(e.message))}>Lock selected creators</Button>}/>;
}
export function CreatorQuickActions({id}:{id:string}){const {canEdit}=useWorkspace(),[action,setAction]=useState('');if(!canEdit('creators'))return null;return <><div className="ops-actions"><Link href={'/creators/communication?creator_id='+id}><Button size="sm" variant="outline"><MessageCircle size={14} className="mr-1.5"/>Communication Workspace</Button></Link><Button size="sm" variant="outline" onClick={()=>setAction('creator_outreach')}>Contact creator</Button><Button size="sm" variant="outline" onClick={()=>setAction('campaign_creators')}>Add / lock campaign</Button><Button size="sm" variant="outline" onClick={()=>setAction('sample_seedings')}>Seed sample</Button><Button size="sm" variant="outline" onClick={()=>setAction('tasks')}>Create task</Button></div>{action==='tasks'?<EntityForm entity="tasks" record={{creator_id:id}} onClose={()=>setAction('')}/>:action&&<OpForm table={action} record={{creator_id:id}} onClose={()=>setAction('')}/>}</>;}

export function CreatorOperationalTimeline({ creatorId }: { creatorId: string }) {
  const { data } = useWorkspace();
  const creator = data.entities.creators.find((c) => c.id === creatorId);
  if (!creator) return null;

  const outreachList = records(data, 'creator_outreach').filter((r) => r.creator_id === creatorId);
  const sampleList = records(data, 'sample_seedings').filter((r) => r.creator_id === creatorId);
  const hslList = records(data, 'hsl_activations').filter((r) => r.creator_id === creatorId);
  const campaignList = data.campaign_creators.filter((r) => r.creator_id === creatorId);

  const isImported = true;
  const isAcquisition = Boolean(creator.acquisition_stage || creator.relationship_status);
  const isContacted = outreachList.some((r) => r.contacted_at);
  const isFollowUp = outreachList.some((r) => r.follow_up_at || r.status === 'Follow Up');
  const isResponded = outreachList.some((r) => ['Interested', 'Converted', 'Negotiating', 'Agreed', 'Declined'].includes(String(r.status)));
  const isSample = sampleList.length > 0;
  const isHsl = hslList.length > 0;
  const isCampaign = campaignList.length > 0;
  const isDeal = campaignList.some((r) => r.status === 'Locked' || r.status === 'Confirmed');

  const stages = [
    { key: 'imported', label: 'Imported', done: isImported },
    { key: 'acquisition', label: 'Acquisition', done: isAcquisition },
    { key: 'contacted', label: 'Contacted', done: isContacted },
    { key: 'follow_up', label: 'Follow-Up', done: isFollowUp },
    { key: 'responded', label: 'Responded', done: isResponded },
    { key: 'sample', label: 'Sample', done: isSample },
    { key: 'hsl', label: 'HSL', done: isHsl },
    { key: 'campaign', label: 'Campaign', done: isCampaign },
    { key: 'deal', label: 'Deal', done: isDeal },
  ];

  return (
    <div className="panel detail-panel mb-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Creator Operational Timeline</h3>
          <p className="text-xs text-muted-foreground">Full lifecycle from lead import to active campaign deal</p>
        </div>
        <Link href={`/creators/communication?creator_id=${creatorId}`}>
          <Button size="sm" variant="outline" className="gap-2">
            <MessageCircle size={14} />
            Open Communication Workspace →
          </Button>
        </Link>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto py-2">
        {stages.map((st, i) => (
          <div key={st.key} className="flex items-center gap-1 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                st.done
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-muted text-muted-foreground border border-transparent'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${st.done ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
              {st.label}
            </div>
            {i < stages.length - 1 && <span className="text-muted-foreground/40 text-xs">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CreatorPerformanceInsightCard({ creatorId }: { creatorId: string }) {
  const [insight, setInsight] = useState<{
    summary: string;
    positive_signals: string[];
    risk_signals: string[];
    suggested_next_steps: string[];
    data_limitations: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'HELPFUL' | 'NOT_HELPFUL' | null>(null);

  async function fetchInsight() {
    setLoading(true);
    setFeedbackGiven(null);
    try {
      const res = await fetch('/api/ai/creator-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, language: 'id' }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        data?: {
          summary: string;
          positive_signals: string[];
          risk_signals: string[];
          suggested_next_steps: string[];
          data_limitations: string[];
        };
      };
      if (!res.ok) throw new Error(json.error || 'Failed to fetch AI insight');
      if (json.data) setInsight(json.data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(rating: 'HELPFUL' | 'NOT_HELPFUL') {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'CREATOR_INSIGHT', rating }),
      });
      setFeedbackGiven(rating);
      toast.success(rating === 'HELPFUL' ? 'Terima kasih atas feedback Anda!' : 'Feedback tercatat.');
    } catch {
      // silent fallback
    }
  }

  return (
    <div className="panel detail-panel mb-5 border-blue-900/30 bg-blue-950/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold flex items-center gap-1.5 text-blue-200">
            <span>✨</span> Gemini AI Performance Insight
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/60 text-blue-300 border border-blue-800">
            AI Insight
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchInsight}
          disabled={loading}
          className="text-xs h-7 gap-1"
        >
          {loading ? 'Analyzing...' : insight ? 'Regenerate' : 'Generate Insight'}
        </Button>
      </div>

      {!insight && !loading && (
        <div className="text-xs text-muted-foreground py-2 flex items-center justify-between">
          <span>Dapatkan ringkasan performa 7-hari, sinyal pertumbuhan/penurunan, dan saran langkah selanjutnya dari data deterministik AffiliateOS.</span>
        </div>
      )}

      {insight && (
        <div className="space-y-3 text-xs">
          <p className="text-slate-200 leading-relaxed font-normal bg-slate-900/60 p-2.5 rounded border border-slate-800">
            {insight.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insight.positive_signals.length > 0 && (
              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/40 space-y-1">
                <span className="font-semibold text-emerald-400 text-[11px] block">📈 Sinyal Positif</span>
                <ul className="list-disc list-inside text-emerald-200/90 space-y-0.5">
                  {insight.positive_signals.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {insight.risk_signals.length > 0 && (
              <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 space-y-1">
                <span className="font-semibold text-amber-400 text-[11px] block">⚠️ Sinyal Perhatian / Risiko</span>
                <ul className="list-disc list-inside text-amber-200/90 space-y-0.5">
                  {insight.risk_signals.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {insight.suggested_next_steps.length > 0 && (
            <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="font-semibold text-slate-300 text-[11px] block">🎯 Saran Langkah Operasional</span>
              <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                {insight.suggested_next_steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span className="italic">
              {insight.data_limitations.join(' · ') || 'Berdasarkan data performa harian resmi'}
            </span>
            <div className="flex items-center gap-1.5">
              <span>Helpful?</span>
              <button
                type="button"
                onClick={() => sendFeedback('HELPFUL')}
                disabled={feedbackGiven !== null}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  feedbackGiven === 'HELPFUL' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                👍 Yes
              </button>
              <button
                type="button"
                onClick={() => sendFeedback('NOT_HELPFUL')}
                disabled={feedbackGiven !== null}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  feedbackGiven === 'NOT_HELPFUL' ? 'bg-red-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                👎 No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

