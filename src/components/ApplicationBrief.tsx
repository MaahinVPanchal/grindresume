import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Loader2, FileText, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { createApplicationBrief } from '@/lib/application.functions';
import { useKeys } from '@/lib/keys';
import { Button } from './Button';

export function ApplicationBrief({company,role,job,onContext}:{company:string;role:string;job:string;onContext?:(text:string)=>void}){
  const keys=useKeys(); const generate=useServerFn(createApplicationBrief);
  const [resumes,setResumes]=useState<{id:string;title:string}[]>([]);const [resumeId,setResumeId]=useState('');
  const [signedIn,setSignedIn]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [motivation,setMotivation]=useState('');const [research,setResearch]=useState(!!keys.tavily);const [refresh,setRefresh]=useState(false);
  const [description,setDescription]=useState(job);const [draft,setDraft]=useState('');
  const [result,setResult]=useState<Awaited<ReturnType<typeof createApplicationBrief>>|null>(null);
  useEffect(()=>{let cancelled=false;supabase.auth.getSession().then(async({data})=>{if(cancelled)return;setSignedIn(!!data.session);if(!data.session)return;const r=await supabase.from('resumes').select('id,title').order('updated_at',{ascending:false});if(cancelled)return;if(r.error)setError('Your resumes could not load.');else{setResumes(r.data||[]);setResumeId(r.data?.[0]?.id||'');}});return()=>{cancelled=true;};},[]);
  return <section className="space-y-4 border-t py-5">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5"/>Application brief</h2>
    {!signedIn?<Link to="/resume" className="text-sm underline">Sign in to use your resume</Link>:<>
      <label className="block text-xs">Your resume<select aria-label="Brief resume" value={resumeId} onChange={e=>setResumeId(e.target.value)} className="mt-1 w-full rounded-md border bg-glass-strong p-2 text-sm"><option value="">Choose resume</option>{resumes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      {!resumes.length&&<Link to="/resume" className="text-sm underline">Upload a resume</Link>}
      <label className="block text-xs">Job description or URL<textarea aria-label="Brief job description" rows={3} value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full rounded-md border bg-glass-strong p-2 text-sm"/></label>
      <label className="block text-xs">Why this company interests you (optional)<textarea aria-label="Personal motivation" rows={2} value={motivation} onChange={e=>setMotivation(e.target.value)} className="mt-1 w-full rounded-md border bg-glass-strong p-2 text-sm"/></label>
      <div className="flex flex-wrap gap-4 text-xs"><label><input type="checkbox" checked={research} onChange={e=>setResearch(e.target.checked)}/> Live Tavily research</label><label><input type="checkbox" checked={refresh} onChange={e=>setRefresh(e.target.checked)}/> Refresh saved research</label></div>
      <Button disabled={busy||!resumeId||!description.trim()} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50" onClick={async()=>{setBusy(true);setError('');setResult(null);try{const r=await generate({data:{resumeId,company,role,job:description,motivation,research,refresh,tavilyKey:keys.tavily||undefined,apiKey:keys.nebius||undefined,model:keys.model||undefined}});setResult(r);if(r.ok){setDraft(r.brief.coverLetter);onContext?.(JSON.stringify({role,company,brief:r.brief,sources:r.sources}));}else setError(r.error);}catch{setError('Application guidance could not finish. Your resume is unchanged.');}finally{setBusy(false);}}}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<FileText className="h-4 w-4"/>}{busy?'Preparing brief…':'Prepare application brief'}</Button>
    </>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {result?.ok&&<div className="space-y-5">
      <p className="text-xs text-muted-foreground">{result.cached?'Saved research':'Checked'} · {new Date(result.checkedAt).toLocaleString()}</p>
      <div><h3 className="font-semibold">What the employer needs</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{result.brief.requirements.map((r,i)=><li key={i}>{r}</li>)}</ul></div>
      <div><h3 className="font-semibold">Your experience → the role</h3>{result.brief.evidence.map((e,i)=><div key={i} className="border-b py-3 text-sm"><p className="font-medium">{e.requirement}</p><p className="mt-1">{e.resumeEvidence}</p><div className="prose-chat text-muted-foreground"><ReactMarkdown>{e.recommendation}</ReactMarkdown></div></div>)}</div>
      {!!result.brief.gaps.length&&<div><h3 className="font-semibold">Gaps & questions</h3><ul className="list-disc pl-5 text-sm">{result.brief.gaps.map((g,i)=><li key={i}>{g}</li>)}</ul></div>}
      <div><h3 className="font-semibold">Recommended approach</h3><div className="prose-chat text-sm"><ReactMarkdown>{result.brief.approach}</ReactMarkdown></div></div>
      <div><h3 className="font-semibold">Suggested resume changes</h3><ul className="list-disc pl-5 text-sm">{result.brief.suggestedChanges.map((s,i)=><li key={i}>{s}</li>)}</ul><Link to="/resume" search={{job:description.startsWith('http')?description:undefined,target:`${role} at ${company}`.slice(0,200)}} className="mt-2 inline-block text-xs underline">Review changes in my resume</Link></div>
      <label className="block text-sm font-semibold">Cover-letter draft<textarea aria-label="Cover letter draft" value={draft} onChange={e=>setDraft(e.target.value)} rows={12} className="mt-2 w-full rounded-md border bg-glass-strong p-3 text-sm font-normal"/></label>
      <Button className="flex items-center gap-2 text-sm" onClick={()=>{const url=URL.createObjectURL(new Blob([draft],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='cover-letter.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}><Download className="h-4 w-4"/>Download draft</Button>
      {result.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="block break-words text-xs underline">{s.title}</a>)}
    </div>}
  </section>;
}