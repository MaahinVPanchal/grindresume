import { useMemo, useState } from 'react';
import { layoutResume } from '@/lib/resume-layout';
import type { Resume } from '@/lib/resume-model';
import { Icon } from './ResumeEditor';
import { Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
export function ResumePreview({ resume, select }: { resume: Resume; select: (id: string) => void }) {
  const layout=useMemo(()=>layoutResume(resume),[resume]);
  const [zoom,setZoom]=useState(75); const [page,setPage]=useState(0);
  const current=Math.min(page,layout.pages.length-1);
  return <div className="flex h-full min-w-0 flex-col">
    <div className="flex h-12 shrink-0 items-center justify-between border-b px-4"><span className="text-xs font-semibold">LIVE PREVIEW</span><div className="flex items-center gap-1"><Icon label="Zoom out" disabled={zoom<=40} onClick={()=>setZoom(zoom-5)}><Minus/></Icon><span className="w-9 text-center text-xs">{zoom}%</span><Icon label="Zoom in" disabled={zoom>=110} onClick={()=>setZoom(zoom+5)}><Plus/></Icon><Icon label="Previous page" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft/></Icon><span className="text-xs">{current+1} / {layout.pages.length}</span><Icon label="Next page" disabled={current===layout.pages.length-1} onClick={()=>setPage(current+1)}><ChevronRight/></Icon></div></div>
    <div className="min-h-0 flex-1 overflow-auto bg-muted/40 p-5">
      <div className={`resume-paper template-${resume.format.template} accent-${resume.format.accent} border-${resume.format.border}`} style={{width:`${layout.width*zoom/100*3.78}px`,height:`${layout.height*zoom/100*3.78}px`,'--resume-border-width':`${resume.format.borderWidth*zoom/100*3.78}px`,'--resume-frame-inset':`${layout.margin/2*zoom/100*3.78}px`,fontFamily:resume.format.font==='Courier'?'Courier New':resume.format.font} as React.CSSProperties}>
        {layout.decorations[current]?.map((d,i)=><div key={`d${i}`} className={`resume-decoration decoration-${d.tone}`} style={{left:`${d.x/layout.width*100}%`,top:`${d.y/layout.height*100}%`,width:`${d.width/layout.width*100}%`,height:`${d.height/layout.height*100}%`}}/>)}
        {layout.pages[current]?.map((l,i)=><Button key={`${l.key}-${i}`} title="Edit this section" aria-label={`Edit ${l.text}`} onClick={()=>select(l.sectionId||'personal')} className={`resume-line tone-${l.tone}`} style={{left:`${l.x/layout.width*100}%`,top:`${l.y/layout.height*100}%`,maxWidth:`${l.width/layout.width*100}%`,fontSize:`${l.size*zoom/100*1.333}px`,fontWeight:l.bold?700:400,fontStyle:l.italic?'italic':'normal'}}>{l.text}</Button>)}
        <span className="resume-page-number">{current+1} / {layout.pages.length}</span>
      </div>
    </div>
  </div>;
}