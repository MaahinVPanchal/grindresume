import { AlignLeft, AlignCenter, AlignRight, Bold } from 'lucide-react';
import { templates, type Resume, type Format } from '@/lib/resume-model';
import { Button } from './Button';
import { Icon } from './ResumeEditor';
import { layoutResume } from '@/lib/resume-layout';

export function ResumeFormatting({resume,change}:{resume:Resume;change:(r:Resume)=>void}) {
  const set=(format:Partial<Format>)=>change({...resume,format:{...resume.format,...format}});
  return <>
    <div className="grid grid-cols-2 gap-3 border-t py-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Resume templates">
      {templates.map(t=>{
        const sample={...resume,format:{...resume.format,...t.format,template:t.id}};
        const layout=layoutResume(sample);
        return <Button key={t.id} aria-label={`${t.id} template`} aria-pressed={resume.format.template===t.id} onClick={()=>set({...t.format,template:t.id})} className={`min-w-0 rounded-md border p-2 text-left ${resume.format.template===t.id?'ring-2 ring-ring':'bg-glass'}`}>
          <div className={`template-thumbnail accent-${resume.format.accent} border-${sample.format.border}`}>
            {layout.pages[0]?.slice(0,32).map((l,i)=><span key={i} className={l.bold?'template-bold':''} style={{left:`${l.x/layout.width*100}%`,top:`${l.y/layout.height*100}%`,width:`${Math.max(0,Math.min(93-l.x/layout.width*100,l.text.length*l.size*0.045))}%`}}/>)}
          </div>
          <span className="mt-2 block text-xs font-medium">{t.name}</span>
        </Button>;
      })}
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-4 border-b pb-3 text-xs">
      <label>Font family <select aria-label="Font family" value={resume.format.font} onChange={e=>set({font:e.target.value as Format['font']})} className="rounded border bg-glass-strong p-1">{['Arial','Helvetica','Times New Roman','Georgia','Courier'].map(f=><option key={f}>{f}</option>)}</select></label>
      <div className="flex items-center gap-1" role="group" aria-label="Alignment">{(['left','center','right'] as const).map((a,i)=>{const Glyph=[AlignLeft,AlignCenter,AlignRight][i]||AlignLeft;return <Icon key={a} label={`Align ${a}`} aria-pressed={resume.format.alignment===a} onClick={()=>set({alignment:a})}><Glyph/></Icon>;})}</div>
      <Button aria-label="Bold body text" title="Bold body text" aria-pressed={resume.format.fontWeight==='bold'} className={`grid h-8 w-8 place-items-center rounded-md ${resume.format.fontWeight==='bold'?'bg-primary text-primary-foreground':'bg-muted'}`} onClick={()=>set({fontWeight:resume.format.fontWeight==='bold'?'regular':'bold'})}><Bold className="h-4 w-4"/></Button>
      <label>Border <select aria-label="Border" value={resume.format.border} onChange={e=>set({border:e.target.value as Format['border']})} className="rounded border bg-glass-strong p-1"><option value="none">None</option><option value="page">Page frame</option><option value="headings">Section rules</option></select></label>
      <label className="flex items-center gap-2">Border width<input aria-label="Border width" type="number" min={0.25} max={2} step={0.25} value={resume.format.borderWidth} onChange={e=>set({borderWidth:Math.max(0.25,Math.min(2,Number(e.target.value)))})} className="w-14 rounded border bg-glass-strong p-1"/>mm</label>
    </div>
    <p className="mb-3 text-xs text-muted-foreground">PDF uses standard Helvetica, Times or Courier equivalents; Word retains your selected font family.</p>
  </>;
}