import type { Resume } from '@/lib/resume-model';
import { layoutResume } from '@/lib/resume-layout';

export function ResumeThumbnail({ resume }: { resume: Resume }) {
  const l=layoutResume(resume);
  return <svg className={`resume-thumbnail accent-${resume.format.accent}`} viewBox={`0 0 ${l.width} ${l.height}`} role="img" aria-label={`${resume.format.template} resume preview`}>
    <rect className="sheet-background" width={l.width} height={l.height}/>
    {l.decorations[0]?.map((d,i)=><rect key={`d${i}`} className={`sheet-${d.tone}`} x={d.x} y={d.y} width={d.width} height={d.height}/>)}
    {resume.format.border==='page'&&<rect className="sheet-frame" x={l.margin/2} y={l.margin/2} width={l.width-l.margin} height={l.height-l.margin} strokeWidth={resume.format.borderWidth}/>}
    {l.pages[0]?.map((line,i)=><text key={i} className={`sheet-text-${line.tone}`} x={line.x} y={line.y+line.size*0.3528} fontSize={line.size*0.3528} fontFamily={resume.format.font==='Courier'?'Courier New':resume.format.font} fontWeight={line.bold?700:400} fontStyle={line.italic?'italic':'normal'}>{line.text}</text>)}
  </svg>;
}