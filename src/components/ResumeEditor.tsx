import { Button } from './Button';
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { blankEntry, uid, type Resume, type Section, type Entry } from '@/lib/resume-model';
import { useEffect } from 'react';
export type AssistantTarget = {
  sectionId: string;
  sectionKind: string;
  sectionHeading: string;
  entryId?: string;
  entryTitle?: string;
  field?: 'details' | 'bullets' | 'heading';
  bulletIndex?: number;
  text: string;
  request?: string;
};

export function ResumeField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const props = { value, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value), className: 'w-full rounded-md border bg-glass-strong px-3 py-2 text-sm outline-none', 'aria-label': label };
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{multiline ? <textarea {...props} rows={4} /> : <input {...props} />}</label>;
}
export function ResumeEditor({ resume, change, selected, onOpenAssistant }: { resume: Resume; change: (r: Resume) => void; selected: string; onOpenAssistant?: (target: AssistantTarget) => void }) {
  useEffect(()=>{if(selected)document.getElementById(`resume-section-${selected}`)?.scrollIntoView({block:'nearest',behavior:'smooth'});},[selected]);
  const sectionChange = (s: Section) => change({ ...resume, sections: resume.sections.map(old => old.id === s.id ? s : old) });
  const moveSection = (index: number, delta: number) => { const arr = [...resume.sections]; const other = arr[index+delta]; const current=arr[index]; if (!other || !current) return; arr[index]=other; arr[index+delta]=current; change({ ...resume, sections: arr }); };
  return <div className="space-y-4 p-5">
    <details id="resume-section-personal" key={`personal-${selected === 'personal'}`} open={selected === 'personal' || !selected} className="resume-section"><summary>Personal information</summary><div className="grid gap-3 pt-4 sm:grid-cols-2">{Object.entries(resume.personal).map(([key,value]) => <ResumeField key={key} label={ ({ name:'Full name', headline:'Professional headline', email:'Email', phone:'Phone', location:'City & country', linkedin:'LinkedIn URL', github:'GitHub URL', website:'Portfolio / website', otherLinks:'Other professional links' } as Record<string,string>)[key] || key} value={value} onChange={v => change({ ...resume, personal: { ...resume.personal, [key]:v } })} />)}</div></details>
    {resume.sections.map((s,index) => <details id={`resume-section-${s.id}`} key={`${s.id}-${selected === s.id}`} open={selected === s.id || !selected} className="resume-section">
      <summary><span>{s.heading || 'Untitled section'}</span><span className="text-xs font-normal text-muted-foreground">{s.entries.length}</span></summary>
      <div className="space-y-4 pt-4">
        <div className="flex items-end gap-2"><div className="flex-1"><ResumeField label="Section heading" value={s.heading} onChange={heading=>sectionChange({ ...s,heading })}/></div>{onOpenAssistant && <Icon label="Tailor section with AI assistance" onClick={()=>onOpenAssistant({ sectionId: s.id, sectionKind: s.kind, sectionHeading: s.heading, field: 'heading', text: s.heading, request: `How should a top recruiter format and curate this ${s.heading} section? Tell me what to include, what to cut, and structure.` })}><Sparkles className="text-amber-500"/></Icon>}<Icon label="Move section up" disabled={index===0} onClick={()=>moveSection(index,-1)}><ArrowUp/></Icon><Icon label="Move section down" disabled={index===resume.sections.length-1} onClick={()=>moveSection(index,1)}><ArrowDown/></Icon><Icon label="Remove section" onClick={()=>change({ ...resume,sections:resume.sections.filter(x=>x.id!==s.id) })}><Trash2/></Icon></div>
        {s.entries.map((e, ei) => <div key={e.id} className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold">{e.title || `Entry ${ei+1}`}</span><div className="flex gap-1">{onOpenAssistant && <Icon label="Tailor entry with AI assistance" onClick={()=>onOpenAssistant({ sectionId: s.id, sectionKind: s.kind, sectionHeading: s.heading, entryId: e.id, entryTitle: e.title || `${s.heading} ${ei+1}`, field: e.bullets?.length ? 'bullets' : 'details', bulletIndex: e.bullets?.length ? 0 : undefined, text: e.bullets?.length ? e.bullets.join('\n') : e.details, request: `How should a top recruiter format and curate this entry (${e.title || s.heading})? Tell me high-signal points to include, what to cut (e.g. if many items, top 3 + summary), and provide an exact revision.` })}><Sparkles className="text-amber-500"/></Icon>}{[-1,1].map(delta=><Icon key={delta} label={delta===-1?'Move entry up':'Move entry down'} disabled={ei+delta<0||ei+delta>=s.entries.length} onClick={()=>{ const entries=[...s.entries]; const a=entries[ei]; const b=entries[ei+delta]; if(a&&b){entries[ei]=b;entries[ei+delta]=a;sectionChange({...s,entries});} }}>{delta===-1?<ArrowUp/>:<ArrowDown/>}</Icon>)}<Icon label="Remove entry" onClick={()=>sectionChange({...s,entries:s.entries.filter(x=>x.id!==e.id)})}><Trash2/></Icon></div></div>
          <EntryFields entry={e} section={s} update={next=>sectionChange({...s,entries:s.entries.map(x=>x.id===e.id?next:x)})} onOpenAssistant={onOpenAssistant}/>
        </div>)}
        <Button onClick={()=>sectionChange({...s,entries:[...s.entries,blankEntry()]})} className="flex items-center gap-2 text-sm font-medium"><Plus className="h-4 w-4"/>Add {s.kind==='experience'?'position':'entry'}</Button>
      </div>
    </details>)}
    <label className="flex items-center gap-3 border-t pt-4 text-sm"><Plus className="h-4 w-4"/><select aria-label="Add section" value="" onChange={e=>{const kind=e.target.value as Section['kind']; if(!kind)return; change({...resume,sections:[...resume.sections,{id:uid(),kind,heading:({summary:'Professional summary',experience:'Work experience',projects:'Projects',skills:'Skills',education:'Education',certifications:'Certifications & awards',additional:'Additional section'})[kind],entries:[blankEntry()]}]});}} className="min-w-0 flex-1 rounded-md border bg-glass-strong p-2"><option value="">Add a section…</option>{['summary','experience','projects','skills','education','certifications','additional'].map(k=><option key={k} value={k}>{k[0]?.toUpperCase()}{k.slice(1)}</option>)}</select></label>
  </div>;
}
function EntryFields({entry:e,section:s,update,onOpenAssistant}:{entry:Entry;section:Section;update:(e:Entry)=>void;onOpenAssistant?:(target:AssistantTarget)=>void}) {
  const textOnly=s.kind==='summary'||s.kind==='skills';
  const hasBullets = e.bullets.length > 0;
  const hasDetails = !!e.details.trim();

  function mergeBulletsToDescription() {
    const combined = [e.details.trim(), ...e.bullets.map(b => b.trim())].filter(Boolean).join('\n\n');
    update({ ...e, details: combined, bullets: [] });
  }

  function splitDescriptionToBullets() {
    const raw = e.details.trim();
    if (!raw) return;
    const split = raw
      .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map(x => x.replace(/^[•\-\*]\s*/, '').trim())
      .filter(Boolean);
    update({ ...e, details: '', bullets: split.length ? split : [raw] });
  }

  return <>
    {!textOnly && <div className="grid grid-cols-2 gap-3"><ResumeField label={s.kind==='experience'?'Job title':s.kind==='education'?'Degree / field':'Title / project name'} value={e.title} onChange={title=>update({...e,title})}/><ResumeField label={s.kind==='experience'?'Employer / employment type':s.kind==='education'?'Institution':'Organization / technologies'} value={e.subtitle} onChange={subtitle=>update({...e,subtitle})}/><ResumeField label="Location" value={e.location} onChange={location=>update({...e,location})}/><ResumeField label="Link" value={e.link} onChange={link=>update({...e,link})}/><ResumeField label="Start date" value={e.start} onChange={start=>update({...e,start})}/><ResumeField label="End date" value={e.end} onChange={end=>update({...e,end})}/>{s.kind==='experience'&&<label className="col-span-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={e.current} onChange={event=>update({...e,current:event.target.checked})}/>Current role</label>}</div>}
    {textOnly && <ResumeField label={s.kind==='skills'?'Skill category':'Subheading (optional)'} value={e.title} onChange={title=>update({...e,title})}/>}
    
    {!textOnly && (hasBullets || hasDetails) && (
      <div className="flex flex-wrap items-center justify-between gap-2 border-y py-1.5 text-xs">
        <span className="text-[11px] font-medium text-muted-foreground">
          Format: {hasBullets ? `${e.bullets.length} bullet points` : 'Single role description (paragraph)'}
        </span>
        <div className="flex items-center gap-2">
          {hasBullets && (
            <Button
              className="text-[11px] text-primary hover:underline font-medium"
              onClick={mergeBulletsToDescription}
              title="Combine all bullets into a single role description paragraph"
            >
              ⇄ Convert to role description (remove bullet points)
            </Button>
          )}
          {!hasBullets && hasDetails && (
            <Button
              className="text-[11px] text-primary hover:underline font-medium"
              onClick={splitDescriptionToBullets}
              title="Split this description into bullet points"
            >
              ⇄ Split into bullet points
            </Button>
          )}
        </div>
      </div>
    )}

    {(textOnly || hasDetails || !hasBullets) && (
      <div className="space-y-1">
        <ResumeField label={s.kind==='skills'?'Skills':s.kind==='summary'?'Summary':s.kind==='experience'?'Role description':'Description / coursework'} value={e.details} multiline onChange={details=>update({...e,details})}/>
        {onOpenAssistant && e.details && (
          <Button className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1" onClick={()=>onOpenAssistant({ sectionId: s.id, sectionKind: s.kind, sectionHeading: s.heading, entryId: e.id, entryTitle: e.title || s.heading, field: 'details', text: e.details, request: `Format and curate this role description as a top recruiter: highlight top flagship wins with metrics, what to cut, and provide an exact revision.` })}>
            <Sparkles className="h-3 w-3 text-amber-500" /> Tailor with AI assistance & Tavily
          </Button>
        )}
      </div>
    )}

    {e.bullets.map((b,i)=><div key={i} className="flex items-end gap-1"><div className="flex-1"><ResumeField label={`Bullet point ${i+1}`} value={b} multiline onChange={v=>update({...e,bullets:e.bullets.map((old,n)=>n===i?v:old)})}/></div>{onOpenAssistant && <Icon label="Tailor bullet with AI assistance" onClick={()=>onOpenAssistant({ sectionId: s.id, sectionKind: s.kind, sectionHeading: s.heading, entryId: e.id, entryTitle: e.title || s.heading, field: 'bullets', bulletIndex: i, text: b, request: `Rewrite this bullet using Google XYZ impact format (Accomplished [X] by [Y] with [Z]). Suggest high-signal metrics and eliminate passive phrasing.` })}><Sparkles className="text-amber-500"/></Icon>}<Icon label="Move bullet up" disabled={i===0} onClick={()=>{const bullets=[...e.bullets];const a=bullets[i];const b=bullets[i-1];if(a!==undefined&&b!==undefined){bullets[i]=b;bullets[i-1]=a;update({...e,bullets});}}}><ArrowUp/></Icon><Icon label="Remove bullet" onClick={()=>update({...e,bullets:e.bullets.filter((_,n)=>n!==i)})}><Trash2/></Icon></div>)}

    {!textOnly && (
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button className="text-xs text-muted-foreground hover:text-foreground" onClick={()=>update({...e,bullets:[...e.bullets,'']})}>
          + Add bullet point
        </Button>
        {!hasDetails && hasBullets && (
          <Button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={()=>update({...e,details:' '})}>
            + Add role description
          </Button>
        )}
      </div>
    )}
  </>;
}
export function Icon({label,children,...props}:{label:string;children:React.ReactNode}&React.ButtonHTMLAttributes<HTMLButtonElement>){return <Button {...props} aria-label={label} title={label} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30 [&_svg]:h-4 [&_svg]:w-4">{children}</Button>;}