import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Upload, FileText, Undo2, Redo2, Download, Sparkles, History, ArrowLeft, Loader2, Check, X, Award, CheckCircle2, AlertCircle, Copy, ExternalLink, Globe, Gauge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import type { Json } from '@/integrations/supabase/types';
import { blankEntry, blankResume, normalizeResume, uid, validateSaved, type Resume, type Format } from '@/lib/resume-model';
import { extractResume } from '@/lib/resume-parse';
import { autoFitFormat } from '@/lib/resume-fit';
import { structureResume, improveResume } from '@/lib/resume.functions';
import { reserveResumeUpload } from '@/lib/allowances.functions';
import { exportPDF, exportDOCX } from '@/lib/resume-layout';
import { useKeys } from '@/lib/keys';
import { Button } from './Button';
import { Icon, ResumeEditor, ResumeField, type AssistantTarget } from './ResumeEditor';
import { ResumePreview } from './ResumePreview';
import { ResumeFormatting } from './ResumeFormatting';
import { CompanySharing } from './CompanySharing';
import { EmployerReview } from './EmployerReview';
import { AtsCheck } from './AtsCheck';
import type { Session as AuthSession } from '@supabase/supabase-js';

type Row = { id: string; title: string; data: Json; original_path: string | null; extracted_text: string; updated_at: string };
type Version = { id: string; data: Json; label: string; created_at: string };
const primary='inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50';
const secondary='inline-flex items-center justify-center gap-2 rounded-md border bg-glass-strong px-3 py-2 text-sm disabled:opacity-50';

export function ResumeWorkspace({ jobURL='', target='' }: { jobURL?: string; target?: string }) {
  const [session,setSession]=useState<AuthSession|null>(null);
  const [authReady,setAuthReady]=useState(false);
  const [rows,setRows]=useState<Row[]>([]);
  const [loadingRows,setLoadingRows]=useState(false);
  const [resume,setResume]=useState<Resume|null>(null);
  const [active,setActive]=useState<Row|null>(null);
  const [title,setTitle]=useState('My resume');
  const [selected,setSelected]=useState('');
  const [past,setPast]=useState<Resume[]>([]); const [future,setFuture]=useState<Resume[]>([]);
  const [busy,setBusy]=useState(''); const [progress,setProgress]=useState(0);
  const [error,setError]=useState(''); const [saveStatus,setSaveStatus]=useState('Saved');
  const [tab,setTab]=useState('editor');
  const [modal,setModal]=useState<'ai'|'history'|'source'|'ats'|null>(null);
  const [assistantTarget, setAssistantTarget] = useState<AssistantTarget | null>(null);
  const [versions,setVersions]=useState<Version[]>([]);
  const [extracted,setExtracted]=useState('');
  const [reviewEmployers,setReviewEmployers]=useState(false);
  const [dragging,setDragging]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const revision=useRef(0);
  const keys=useKeys(); const parse=useServerFn(structureResume);
  const reserveUpload=useServerFn(reserveResumeUpload);

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true);});
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setAuthReady(true);});
    return ()=>data.subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    if(!session){setRows([]);setResume(null);setActive(null);return;}
    let cancelled=false; setLoadingRows(true);
    supabase.from('resumes').select('*').order('updated_at',{ascending:false}).then(({data,error})=>{if(cancelled)return;if(error)setError('Saved resumes could not load. Please retry.');else setRows(data||[]);setLoadingRows(false);});
    return ()=>{cancelled=true;};
  },[session?.user.id]);

  useEffect(()=>{
    if(!resume||!active||!session)return;
    const number=++revision.current;
    setSaveStatus('Unsaved changes');
    const timer=setTimeout(async()=>{
      setSaveStatus('Saving…');
      const updated_at=new Date().toISOString();
      const {error}=await supabase.from('resumes').update({data:resume as unknown as Json,title,updated_at}).eq('id',active.id);
      if(number!==revision.current)return;
      setSaveStatus(error?'Save failed — retry':'Saved');
      if(!error)setRows(old=>old.map(r=>r.id===active.id?{...r,data:resume as unknown as Json,title,updated_at}:r));
    },700);
    return ()=>clearTimeout(timer);
  },[resume,title,active?.id,session?.user.id]);

  useEffect(()=>{
    const guard=(event:BeforeUnloadEvent)=>{if(saveStatus==='Unsaved changes'||saveStatus==='Saving…'||saveStatus.startsWith('Save failed')){event.preventDefault();}};
    window.addEventListener('beforeunload',guard);
    return ()=>window.removeEventListener('beforeunload',guard);
  },[saveStatus]);

  function change(next:Resume){if(resume)setPast(old=>[...old.slice(-49),resume]);setFuture([]);setResume(next);}
  function open(row:Row){const data=validateSaved(row.data);if(!data){setError('This saved resume could not be read.');return;}setActive(row);setResume(data);setTitle(row.title);setExtracted(row.extracted_text);setPast([]);setFuture([]);setSelected('');setError('');}
  async function create(data:Resume,original_path:string|null=null,text=''){
    if(!session)throw new Error('Sign in to save your resume.');
    const {data:row,error}=await supabase.from('resumes').insert({user_id:session.user.id,title:original_path?original_path.split('/').pop()?.slice(37).replace(/\.(pdf|docx)$/i,'')||'My resume':'My resume',data:data as unknown as Json,original_path,extracted_text:text}).select().single();
    if(error||!row)throw new Error('The resume could not be saved. Please retry.');
    setRows(old=>[row,...old]);open(row);
    await supabase.from('resume_versions').insert({resume_id:row.id,user_id:session.user.id,data:data as unknown as Json,label:original_path?'Original import':'Initial resume'});
  }
  async function upload(file:File){
    if(!session)return;
    setError('');setBusy('Reading your resume');setProgress(0);
    let originalPath:string|null=null;
    try{
      const parsed=await extractResume(file,setProgress);setExtracted(parsed.text);
      const path=`${session.user.id}/${uid()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      await reserveUpload({data:{path,apiKey:keys.nebius||undefined}});
      window.dispatchEvent(new Event('grinder-usage-changed'));
      const {error:uploadError}=await supabase.storage.from('resumes').upload(path,file,{contentType:file.type||'application/octet-stream'});
      if(uploadError)throw new Error('The original file could not be saved privately. Please retry.');
      originalPath=path;setBusy('Organizing your resume');setProgress(75);
      const result=await parse({data:{text:parsed.text,uploadPath:path,apiKey:keys.nebius||undefined,model:keys.model||undefined}});
      if(result.ok){await create(autoFitFormat(normalizeResume(result.content),parsed.pages,parsed.columns),path,parsed.text);}
      else{
        const fallback=blankResume();fallback.sections=[{id:uid(),kind:'additional',heading:'Imported content — review and organize',entries:[{...blankEntry(),details:parsed.text}]}];fallback.reviewNotes=[result.error];await create(autoFitFormat(fallback,parsed.pages,parsed.columns),path,parsed.text);
      }
      setProgress(100);setReviewEmployers(true);
    }catch(e){setError(e instanceof Error?e.message:'This file could not be read. Try a text-based PDF or DOCX.');if(originalPath)await supabase.storage.from('resumes').remove([originalPath]);}
    finally{setBusy('');if(input.current)input.current.value='';}
  }
  async function snapshot(){if(!resume||!active||!session)return;setBusy('Saving version');const {error}=await supabase.from('resume_versions').insert({resume_id:active.id,user_id:session.user.id,data:resume as unknown as Json,label:`${title} · saved version`});setBusy('');if(error)setError('Version could not be saved.');else setSaveStatus('Version saved');}
  async function history(){if(!active)return;setModal('history');const {data,error}=await supabase.from('resume_versions').select('*').eq('resume_id',active.id).order('created_at',{ascending:false});if(error)setError('Version history could not load.');else setVersions(data||[]);}
  async function download(kind:'pdf'|'docx'){if(!resume)return;setBusy('Preparing download');setError('');try{if(kind==='pdf')await exportPDF(resume,title);else await exportDOCX(resume,title);}catch{setError('Download failed. Your resume is unchanged; please retry.');}finally{setBusy('');}}
  const fileInput=<input ref={input} type="file" accept=".pdf,.docx" className="hidden" aria-label="Upload resume file" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/>;
  if(!authReady)return <div className="flex justify-center py-24"><Loader2 className="animate-spin"/></div>;
  if(!session)return <div className="mx-auto max-w-xl py-8"><div className="mb-7 text-center"><h1 className="font-display text-5xl">Your resume, refined.</h1><p className="mt-3 text-muted-foreground">A private workspace for your next opportunity.</p></div><ResumeAuth onError={setError}/>{error&&<p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}</div>;
  return <>
    {reviewEmployers&&resume&&<EmployerReview resume={resume} userId={session.user.id} onDone={next=>{setReviewEmployers(false);if(next)change(next);}}/>}
    {fileInput}
    {error&&<div role="alert" className="mb-4 flex items-center justify-between rounded-md border bg-glass-strong p-3 text-sm text-destructive">{error}<Icon label="Dismiss error" onClick={()=>setError('')}><X/></Icon></div>}
    {busy&&resume&&<p role="status" className="mb-3 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin"/>{busy}{progress>0&&` · ${progress}%`}</p>}
    {saveStatus.startsWith('Save failed')&&resume&&<Button className={`${secondary} mb-3`} onClick={()=>setResume({...resume})}>Retry saving</Button>}
    {!resume?<>
      <div className="flex flex-wrap items-center justify-between gap-4 py-7"><div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Your next chapter</p><h1 className="font-display text-5xl">Resume workspace</h1><p className="mt-3 text-muted-foreground">Your experience. A stronger first impression.</p></div></div>
      <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f&&!busy)void upload(f);}} className={`resume-upload my-5 rounded-lg border-2 border-dashed glass py-12 text-center ${dragging?'ring-2 ring-ring':''}`}>
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-lg bg-sage/35"><Upload className="h-6 w-6"/></div><h2 className="font-display text-3xl">Start with your resume</h2><p className="mt-2 text-sm text-muted-foreground">Drop your PDF or DOCX here · up to 20 MB</p><Button disabled={!!busy} className={`${primary} mt-6`} onClick={()=>input.current?.click()}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4"/>}{busy||'Upload resume'}</Button>{busy&&<><progress max={100} value={progress} className="mx-auto mt-4 block h-2 w-56 accent-primary"/><p role="status" className="mt-2 text-xs text-muted-foreground">{progress}%</p></>}
      </div>
      <div className="flex items-center justify-between border-b py-5"><h2 className="text-lg font-semibold">Your resumes</h2><Button className="flex items-center gap-2 text-sm" disabled={!!busy} onClick={()=>{setBusy('Creating resume');create(blankResume()).catch(e=>setError(e.message)).finally(()=>setBusy(''));}}>+ Create from scratch</Button></div>
      {loadingRows?<p className="py-8 text-sm text-muted-foreground">Loading resumes…</p>:rows.length===0?<p className="py-8 text-sm text-muted-foreground">No resumes yet.</p>:<div className="grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map(row=><Button key={row.id} onClick={()=>open(row)} className="flex items-center gap-4 rounded-lg glass p-5 text-left"><FileText className="h-8 w-8 text-muted-foreground"/><div className="min-w-0"><div className="truncate font-medium">{row.title}</div><div className="mt-1 text-xs text-muted-foreground">Edited {new Date(row.updated_at).toLocaleDateString()}</div></div></Button>)}</div>}
    </>:<>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 pt-3"><div className="flex min-w-0 items-center gap-3"><Icon label="Back to resumes" disabled={saveStatus==='Saving…'||saveStatus==='Unsaved changes'} onClick={()=>{setResume(null);setActive(null);}}><ArrowLeft/></Icon><div><input aria-label="Resume title" value={title} onChange={e=>setTitle(e.target.value)} className="max-w-52 bg-transparent font-semibold outline-none"/><p role="status" className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3 w-3"/>{saveStatus}</p></div></div><div className="flex flex-wrap items-center gap-2"><Icon label="Undo" disabled={!past.length} onClick={()=>{const previous=past[past.length-1];if(!previous)return;setFuture(f=>[resume,...f]);setPast(p=>p.slice(0,-1));setResume(previous);}}><Undo2/></Icon><Icon label="Redo" disabled={!future.length} onClick={()=>{const next=future[0];if(!next)return;setPast(p=>[...p,resume]);setFuture(f=>f.slice(1));setResume(next);}}><Redo2/></Icon><Icon label="Version history" onClick={history}><History/></Icon><Button className={secondary} onClick={snapshot} disabled={!!busy}>Save version</Button><Button className={secondary} onClick={()=>{setAssistantTarget(null);setModal('ai');}}><Sparkles className="h-4 w-4 text-amber-500"/>AI assistance</Button><Button className={secondary} onClick={()=>setModal('ats')}><Gauge className="h-4 w-4"/>ATS check</Button><Button className={primary} disabled={!!busy} onClick={()=>download('pdf')}><Download className="h-4 w-4"/>PDF</Button><Button className={secondary} disabled={!!busy} onClick={()=>download('docx')}>DOCX</Button></div></div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-y py-3 text-xs">
        <Selector label="Page size" value={resume.format.pageSize} options={['A4','Letter']} onChange={v=>change({...resume,format:{...resume.format,pageSize:v as Format['pageSize']}})}/>
        <label className="flex items-center gap-2">Size<input aria-label="Font size" type="number" min={8} max={14} value={resume.format.fontSize} onChange={e=>change({...resume,format:{...resume.format,fontSize:Math.max(8,Math.min(14,Number(e.target.value)))}})} className="w-12 rounded border bg-glass-strong p-1"/></label>
        <label className="flex items-center gap-2">Margins<input aria-label="Margins" type="number" min={10} max={25} value={resume.format.margin} onChange={e=>change({...resume,format:{...resume.format,margin:Math.max(10,Math.min(25,Number(e.target.value)))}})} className="w-12 rounded border bg-glass-strong p-1"/>mm</label>
        <label className="flex items-center gap-2">Spacing<input aria-label="Section spacing" type="number" min={2} max={10} value={resume.format.spacing} onChange={e=>change({...resume,format:{...resume.format,spacing:Math.max(2,Math.min(10,Number(e.target.value)))}})} className="w-12 rounded border bg-glass-strong p-1"/></label>
        <div className="flex items-center gap-2">Accent{(['charcoal','green','blue'] as const).map(accent=><Button key={accent} aria-label={`${accent} accent`} title={`${accent} accent`} onClick={()=>change({...resume,format:{...resume.format,accent}})} className={`resume-swatch swatch-${accent} ${resume.format.accent===accent?'ring-2 ring-ring ring-offset-2':''}`}/>)}</div>
        <Button className="ml-auto underline" onClick={()=>setModal('source')}>Original resume</Button><Button disabled={!!busy} onClick={()=>input.current?.click()} className="underline">Import another</Button>
      </div>
      <ResumeFormatting resume={resume} change={change}/>
      <CompanySharing resume={resume} userId={session.user.id}/>
      {resume.reviewNotes.length>0&&<details className="mb-4 rounded-md bg-peach/25 px-4 py-3 text-sm"><summary className="cursor-pointer font-medium">Review imported information ({resume.reviewNotes.length})</summary><ul className="mt-2 list-disc space-y-1 pl-5">{resume.reviewNotes.map((note,i)=><li key={i}>{note}</li>)}</ul></details>}
      <div className="mb-3 flex border-b lg:hidden">{['editor','preview'].map(t=><Button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2 text-sm capitalize ${tab===t?'border-b-2 border-primary font-semibold':'text-muted-foreground'}`}>{t}</Button>)}</div>
      <div className="resume-workspace grid overflow-hidden rounded-lg border bg-glass-strong lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className={`min-w-0 overflow-y-auto border-r ${tab!=='editor'?'hidden lg:block':''}`}>
          <div className="flex h-12 items-center justify-between border-b px-5">
            <span className="text-xs font-semibold">RESUME EDITOR</span>
            <span className="text-xs text-muted-foreground">{resume.sections.length} sections</span>
          </div>
          <ResumeEditor
            resume={resume}
            selected={selected}
            change={change}
            onOpenAssistant={(target)=>{
              setAssistantTarget(target);
              setModal('ai');
            }}
          />
        </div>
        <div className={`min-h-0 min-w-0 ${tab!=='preview'?'hidden lg:block':''}`}>
          <ResumePreview resume={resume} select={id=>{setSelected(id);setTab('editor');}}/>
        </div>
      </div>
    </>}
    {modal&&modal!=='ats'&&resume&&<div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4" onClick={()=>setModal(null)}><div role="dialog" aria-modal="true" aria-label={modal==='ai'?'Resume assistance':modal==='history'?'Version history':'Original resume'} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-lg glass-strong p-6" onClick={e=>e.stopPropagation()}><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-3xl">{modal==='ai'?'A thoughtful second look':modal==='history'?'Version history':'Original resume'}</h2><Icon label="Close dialog" onClick={()=>setModal(null)}><X/></Icon></div>
      {modal==='ai'&&<ResumeAssistant resume={resume} change={change} initialTarget={target} initialJob={jobURL} selected={selected} targetItem={assistantTarget} onClose={()=>setModal(null)}/>}
      {modal==='history'&&<div className="space-y-3">{versions.length===0?<p className="text-sm text-muted-foreground">No saved versions yet.</p>:versions.map(v=><div key={v.id} className="flex items-center justify-between gap-4 border-b py-3"><div><p className="text-sm">{v.label}</p><p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p></div><Button className={secondary} onClick={()=>{const r=validateSaved(v.data);if(r){change(r);setModal(null);}}}>Restore</Button></div>)}</div>}
      {modal==='source'&&<><p className="mb-3 text-xs text-muted-foreground">Original extracted text</p><pre className="max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm">{extracted||'This resume was created from scratch.'}</pre>{active?.original_path&&<Button className={`${secondary} mt-4`} onClick={async()=>{if(!active.original_path)return;const {data,error}=await supabase.storage.from('resumes').download(active.original_path);if(error){setError('Original file could not download.');return;}const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=active.original_path.split('/').pop()||'original';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Download original</Button>}</>}
    </div></div>}
    {modal==='ats'&&resume&&<AtsCheck resume={resume} onClose={()=>setModal(null)}/>}
  </>;
}
function Selector({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(v:string)=>void}){return <label className="flex items-center gap-2">{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value)} className="rounded border bg-glass-strong px-2 py-1 capitalize">{options.map(o=><option key={o}>{o}</option>)}</select></label>;}
function ResumeAuth({onError}:{onError:(e:string)=>void}){
  const [signup,setSignup]=useState(false);const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  return <div className="rounded-lg glass p-6"><h2 className="mb-4 text-lg font-semibold">{signup?'Create your private workspace':'Sign in to your resume workspace'}</h2><Button className={`${secondary} w-full`} onClick={async()=>{const result=await lovable.auth.signInWithOAuth('google',{redirect_uri:window.location.origin+'/resume'});if(result.error)onError(result.error.message);}}>Continue with Google</Button><div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="flex-1 border-t"/>or<span className="flex-1 border-t"/></div><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);onError('');try{const result=signup?await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/resume'}}):await supabase.auth.signInWithPassword({email,password});if(result.error)onError(result.error.message);else if(signup&&!result.data.session)setMessage('Check your email to confirm your account, then sign in.');}finally{setBusy(false);}}}><label className="block text-xs">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} aria-label="Email" className="mt-1 w-full rounded-md border bg-glass-strong p-3 text-sm"/></label><label className="block text-xs">Password<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} aria-label="Password" className="mt-1 w-full rounded-md border bg-glass-strong p-3 text-sm"/></label><Button disabled={busy} type="submit" className={`${primary} w-full`}>{busy?'Please wait…':signup?'Create account':'Sign in'}</Button></form>{message&&<p role="status" className="mt-3 text-sm">{message}</p>}<div className="mt-4 flex flex-wrap justify-between gap-3 text-xs"><Button onClick={()=>setSignup(!signup)}>{signup?'Already have an account? Sign in':'New here? Create an account'}</Button><Button onClick={async()=>{if(!email){onError('Enter your email first.');return;}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset-password'});if(error)onError(error.message);else setMessage('Password reset email sent.');}}>Forgot password?</Button></div></div>;
}
function ResumeAssistant({
  resume,
  change,
  initialTarget,
  initialJob,
  selected,
  targetItem,
  onClose,
}: {
  resume: Resume;
  change: (r: Resume) => void;
  initialTarget: string;
  initialJob: string;
  selected: string;
  targetItem?: AssistantTarget | null;
  onClose?: () => void;
}) {
  const keys = useKeys();
  const improve = useServerFn(improveResume);

  const [sectionId, setSectionId] = useState(
    targetItem?.sectionId || resume.sections.find((s) => s.id === selected)?.id || resume.sections[0]?.id || ''
  );
  const section = resume.sections.find((s) => s.id === sectionId);

  const [entryId, setEntryId] = useState(
    targetItem?.entryId || section?.entries[0]?.id || ''
  );
  const entry = section?.entries.find((e) => e.id === entryId) || section?.entries[0];

  const [field, setField] = useState<'details' | 'bullets' | 'heading'>(
    targetItem?.field || 'details'
  );
  const [bulletIndex, setBulletIndex] = useState<number | undefined>(
    targetItem?.bulletIndex
  );

  const computeOriginal = () => {
    if (targetItem?.text !== undefined) return targetItem.text;
    if (field === 'heading') return section?.heading || '';
    if (!entry) return '';
    if (field === 'bullets') {
      if (bulletIndex !== undefined && entry.bullets[bulletIndex] !== undefined) {
        return entry.bullets[bulletIndex];
      }
      return entry.bullets.join('\n');
    }
    return entry.details;
  };

  const [original, setOriginal] = useState(computeOriginal());

  useEffect(() => {
    if (targetItem?.text && sectionId === targetItem.sectionId && entryId === targetItem.entryId) {
      return;
    }
    if (field === 'heading') {
      setOriginal(section?.heading || '');
    } else if (entry) {
      if (field === 'bullets') {
        if (bulletIndex !== undefined && entry.bullets[bulletIndex] !== undefined) {
          setOriginal(entry.bullets[bulletIndex]);
        } else {
          setOriginal(entry.bullets.join('\n'));
        }
      } else {
        setOriginal(entry.details);
      }
    }
  }, [sectionId, entryId, field, bulletIndex]);

  const defaultRequest =
    targetItem?.request ||
    'How should a top recruiter format and curate this? Tell me what to include, what to cut, and suggest an exact revision.';

  const [request, setRequest] = useState(defaultRequest);
  const [target, setTarget] = useState(initialTarget);
  const [job, setJob] = useState(initialJob);
  const [research, setResearch] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof improveResume>> | { ok: false; error: string } | null>(null);
  const [revision, setRevision] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const promptChips = [
    { label: '🏆 Recruiter format & curation', prompt: 'How should a top recruiter format and curate this? Tell me what to include, what to cut (e.g. if 18 items, top 3 + summary), and structure.' },
    { label: '✂️ What to include vs cut', prompt: 'Analyze high-signal accomplishments to highlight vs low-signal fluff to cut' },
    { label: '📊 Google XYZ impact format', prompt: 'Rewrite using Google formula: Accomplished [X] as measured by [Y] by doing [Z]' },
    { label: '🎯 Tailor to target employer', prompt: `Tailor this to align with ${target || 'the target employer'} requirements and tech stack` },
  ];

  async function handleGetRecommendation(customRequest?: string) {
    const activeReq = customRequest || request;
    if (!original.trim() || !activeReq.trim() || busy) return;
    setBusy(true);
    setResult(null);
    setApplied(false);
    setSourceText(original);
    try {
      const r = await improve({
        data: {
          text: original,
          request: activeReq,
          target,
          job,
          research,
          tavilyKey: keys.tavily || undefined,
          apiKey: keys.nebius || undefined,
          model: keys.model || undefined,
        },
      });
      setResult(r);
      if (r.ok) {
        setRevision(r.suggestion.revision);
      }
    } catch {
      setResult({ ok: false, error: 'Assistance could not finish. Your resume is unchanged.' });
    } finally {
      setBusy(false);
    }
  }

  function handleApply() {
    if (!section || !revision.trim()) return;
    const nextSections = resume.sections.map((s) => {
      if (s.id !== section.id) return s;
      if (field === 'heading') return { ...s, heading: revision };
      return {
        ...s,
        entries: s.entries.map((e) => {
          if (e.id !== entry?.id) return e;
          if (field === 'bullets') {
            if (bulletIndex !== undefined && bulletIndex >= 0) {
              const nextBullets = [...e.bullets];
              nextBullets[bulletIndex] = revision;
              return { ...e, bullets: nextBullets };
            }
            return { ...e, bullets: revision.split('\n').filter(Boolean) };
          }
          return { ...e, details: revision };
        }),
      };
    });

    change({ ...resume, sections: nextSections });
    setApplied(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 900);
  }

  function handleCopy() {
    if (!revision) return;
    navigator.clipboard.writeText(revision);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-xs">
        <span className="text-muted-foreground">
          {keys.nebius && keys.model ? `Nebius · ${keys.model}` : 'Lovable AI'}
        </span>
        <span className={`flex items-center gap-1 font-medium ${keys.tavily ? 'text-sage' : 'text-amber-600'}`}>
          <Globe className="h-3 w-3" />
          {keys.tavily ? 'Tavily web research connected' : 'AI mode (add Tavily key in header for live research)'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block space-y-1 text-xs">
          Section
          <select
            aria-label="Section"
            value={sectionId}
            onChange={(e) => {
              const id = e.target.value;
              setSectionId(id);
              const nextSec = resume.sections.find((s) => s.id === id);
              setEntryId(nextSec?.entries[0]?.id || '');
              setBulletIndex(undefined);
              setResult(null);
            }}
            className="w-full rounded-md border bg-glass-strong p-2 text-sm"
          >
            {resume.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.heading}
              </option>
            ))}
          </select>
        </label>

        {section && section.entries.length > 0 && field !== 'heading' && (
          <label className="block space-y-1 text-xs">
            Entry
            <select
              aria-label="Resume entry"
              value={entry?.id || ''}
              onChange={(e) => {
                setEntryId(e.target.value);
                setBulletIndex(undefined);
                setResult(null);
              }}
              className="w-full rounded-md border bg-glass-strong p-2 text-sm"
            >
              {section.entries.map((e, i) => (
                <option key={e.id} value={e.id}>
                  {e.title || `${section.heading} ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {field !== 'heading' && (
        <div className="flex items-center gap-3 text-xs">
          <Selector
            label="Target content"
            value={field}
            options={['details', 'bullets']}
            onChange={(v) => {
              setField(v as 'details' | 'bullets');
              setBulletIndex(undefined);
              setResult(null);
            }}
          />
          {field === 'bullets' && bulletIndex !== undefined && (
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Bullet #{bulletIndex + 1} selected
            </span>
          )}
        </div>
      )}

      {/* Current Text to Improve */}
      <div>
        <span className="text-xs font-medium text-muted-foreground block mb-1">
          Current text to improve
        </span>
        <p className="whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-xs leading-relaxed max-h-36 overflow-y-auto border">
          {original || <span className="italic text-muted-foreground">Add content to this section first.</span>}
        </p>
      </div>

      {/* Preset Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground">Recruiter Focus Presets</span>
        <div className="flex flex-wrap gap-1.5">
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setRequest(chip.prompt);
                void handleGetRecommendation(chip.prompt);
              }}
              className="rounded-full border border-border/70 bg-background/80 hover:bg-muted px-2.5 py-1 text-[11px] text-foreground/80 hover:text-foreground transition"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <ResumeField label="Your request or instructions" value={request} multiline onChange={setRequest} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ResumeField label="Target role / company" value={target} onChange={setTarget} />
        <ResumeField label="Job description or careers URL" value={job} multiline onChange={setJob} />
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} />
        Research hiring bar & requirements with Tavily
      </label>

      <Button
        className={primary}
        disabled={busy || !original.trim() || !request.trim()}
        onClick={() => void handleGetRecommendation()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Researching with Tavily & reviewing…' : 'Get recommended changes & exact revision'}
      </Button>

      {result && !result.ok && (
        <p role="alert" className="text-sm text-destructive rounded bg-destructive/10 p-3">
          {result.error}
        </p>
      )}

      {result?.ok && (
        <div className="space-y-3.5 border-t pt-4">
          {/* Recruiter Format Blueprint */}
          {result.suggestion.formatRecommendation && (
            <div className="rounded-lg border bg-primary/5 border-primary/20 p-3 space-y-1.5">
              <h3 className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                <Award className="h-3.5 w-3.5" /> Top Recruiter Format & Curation Blueprint
              </h3>
              <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                {result.suggestion.formatRecommendation}
              </p>
            </div>
          )}

          {/* What to Include vs What to Cut */}
          {((result.suggestion.whatToInclude && result.suggestion.whatToInclude.length > 0) ||
            (result.suggestion.whatToCut && result.suggestion.whatToCut.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {result.suggestion.whatToInclude && result.suggestion.whatToInclude.length > 0 && (
                <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3 space-y-1">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> What to Include (High-Signal)
                  </h4>
                  <ul className="space-y-1 text-xs text-foreground/85 pl-3">
                    {result.suggestion.whatToInclude.map((item, idx) => (
                      <li key={idx} className="list-disc leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestion.whatToCut && result.suggestion.whatToCut.length > 0 && (
                <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-3 space-y-1">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> What to Cut / Avoid
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground pl-3">
                    {result.suggestion.whatToCut.map((item, idx) => (
                      <li key={idx} className="list-disc leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recommended Revision */}
          <div className="space-y-2 rounded-lg border bg-background/80 p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Recommended Revision
              </h3>
              <Button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {copied ? <Check className="h-3 w-3 text-sage" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <ResumeField label="Edit suggestion before applying" value={revision} multiline onChange={setRevision} />

            {result.suggestion.explanation && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2.5 leading-relaxed">
                <span className="font-semibold text-foreground">Why it works: </span>
                {result.suggestion.explanation}
              </p>
            )}

            {result.suggestion.missingInformation.length > 0 && (
              <div className="rounded border bg-amber-500/10 border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <span className="font-semibold block">Facts or metrics to verify:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {result.suggestion.missingInformation.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.sources.length > 0 && (
              <div className="pt-1 space-y-1">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                  Tavily Research Sources
                </span>
                <div className="space-y-1">
                  {result.sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline truncate"
                    >
                      <span className="truncate">{s.title || s.url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                className={`${primary} flex-1`}
                onClick={handleApply}
                disabled={applied}
              >
                {applied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" /> Applied to Resume!
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Apply change
                  </>
                )}
              </Button>
              <Button className={secondary} onClick={() => setResult(null)}>
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}