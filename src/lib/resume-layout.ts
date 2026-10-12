import { jsPDF } from 'jspdf';
import type { Resume, Section, Format } from './resume-model';

export type Line = { text: string; x: number; y: number; size: number; bold: boolean; italic: boolean; width: number; tone: 'ink' | 'accent' | 'paper'; region: 'header' | 'main' | 'aside'; heading: boolean; key: string; sectionId?: string | undefined; entryId?: string | undefined };
export type Decoration = { kind: 'rule' | 'panel'; x: number; y: number; width: number; height: number; tone: 'accent' | 'soft' };
type Region = Line['region'];
type Item = { text: string; kind: 'name' | 'headline' | 'contact' | 'heading' | 'title' | 'meta' | 'body'; key: string; sectionId?: string | undefined; entryId?: string | undefined };
const palette = { charcoal: [42,42,42], green: [38,86,60], blue: [41,75,106] } as const;
const ink = [42,42,42] as const;

export function layoutResume(r: Resume) {
  const width = r.format.pageSize === 'A4' ? 210 : 215.9;
  const height = r.format.pageSize === 'A4' ? 297 : 279.4;
  const { margin, template, fontSize, spacing } = r.format;
  const pdf = new jsPDF({ unit: 'mm', format: r.format.pageSize === 'A4' ? 'a4' : 'letter' });
  const font = r.format.font === 'Courier' ? 'courier' : ['Georgia','Times New Roman'].includes(r.format.font) ? 'times' : 'helvetica';
  const columns = template === 'modern' || template === 'technical';
  const sidebar = template === 'technical';
  const pages: Line[][] = [[]];
  const decorations: Decoration[][] = [[]];
  const columnWidth = (width - margin * 2) * 0.29;
  const gutter = 9;
  const asideX = margin;
  const mainX = columns ? margin + columnWidth + gutter : margin;
  const mainWidth = width - margin - mainX;
  const headerStart = sidebar ? margin + 3 : margin;
  const ensurePage = (page: number) => { while (pages.length <= page) { pages.push([]); decorations.push([]); } };
  const cursor: Record<Region, { page: number; y: number }> = { header: {page:0,y:headerStart}, main: {page:0,y:margin}, aside: {page:0,y:margin} };
  const place = (item: Item, region: Region, x: number, available: number) => {
    const heading = item.kind === 'heading';
    const size = item.kind === 'name' ? fontSize + (template === 'executive' ? 18 : 12) : item.kind === 'headline' ? fontSize + 1 : heading ? fontSize + 1 : item.kind === 'contact' || item.kind === 'meta' ? fontSize - 1 : fontSize;
    const bold = ['name','heading','title'].includes(item.kind) || r.format.fontWeight === 'bold';
    const italic = item.kind === 'meta' && template === 'classic';
    const tone: Line['tone'] = sidebar && region === 'aside' ? 'paper' : ['name','heading'].includes(item.kind) ? 'accent' : 'ink';
    pdf.setFont(font, bold ? 'bold' : italic ? 'italic' : 'normal'); pdf.setFontSize(size);
    const text = heading && ['classic','technical','compact','executive'].includes(template) ? item.text.toUpperCase() : item.text;
    const wrapped = pdf.splitTextToSize(text, available) as string[];
    const step = size * 0.3528 * 1.3;
    const c = cursor[region];
    if (heading) c.y += 2;
    const reserve = heading || item.kind === 'title' ? step * 3 : step;
    if (c.y + reserve > height - margin - 5) { c.page++; c.y = margin; }
    for (const line of wrapped) {
      if (c.y + step > height - margin - 5) { c.page++; c.y = margin; }
      ensurePage(c.page);
      const centered = region === 'header' && template === 'classic' && r.format.alignment === 'left';
      const alignment = centered ? 'center' : r.format.alignment;
      const textWidth = pdf.getTextWidth(line);
      const lx = alignment === 'center' ? x + (available-textWidth)/2 : alignment === 'right' ? x+available-textWidth : x;
      pages[c.page]?.push({text:line,x:lx,y:c.y,size,bold,italic,width:available,tone,region,heading,key:item.key,sectionId:item.sectionId,entryId:item.entryId});
      c.y += step;
    }
    if (heading && r.format.border === 'headings') {
      decorations[c.page]?.push({ kind:'rule',x,y:c.y+0.5,width:available,height:r.format.borderWidth,tone:'accent' });
      c.y += 2;
    }
    c.y += heading ? spacing : item.kind === 'body' ? 0.8 : 1;
  };
  const p=r.personal;
  place({text:p.name || 'Your name',kind:'name',key:'name'},'header',margin,width-margin*2);
  if (p.headline) place({text:p.headline,kind:'headline',key:'headline'},'header',margin,width-margin*2);
  for (const text of [[p.email,p.phone,p.location].filter(Boolean).join(' · '),[p.linkedin,p.github,p.website,p.otherLinks].filter(Boolean).join(' · ')].filter(Boolean)) place({text,kind:'contact',key:'contact'},'header',margin,width-margin*2);
  const bodyStart=cursor.header.y+spacing+3;
  cursor.main.y=bodyStart; cursor.aside.y=bodyStart;
  if (['modern','executive','technical'].includes(template)) decorations[0]?.push({kind:'rule',x:margin,y:bodyStart-4,width:width-margin*2,height:template==='executive'?1.1:0.5,tone:'accent'});
  const renderSection = (section: Section, region: Region) => {
    const x=region==='aside'?asideX:mainX;
    const available=region==='aside'?columnWidth:mainWidth;
    const base={key:section.id,sectionId:section.id};
    place({...base,text:section.heading,kind:'heading'},region,x,available);
    for (const e of section.entries) {
      const entry={key:e.id,sectionId:section.id,entryId:e.id};
      if(e.title) place({...entry,text:e.title,kind:'title'},region,x,available);
      const meta=[e.subtitle,e.location,[e.start,e.current?'Present':e.end].filter(Boolean).join(' – ')].filter(Boolean).join(' | ');
      if(meta) place({...entry,text:meta,kind:'meta'},region,x,available);
      if(e.link) place({...entry,text:e.link,kind:'meta'},region,x,available);
      for(const text of e.details.split('\n').filter(Boolean)) place({...entry,text,kind:'body'},region,x,available);
      for(const bullet of e.bullets.filter(Boolean)) place({...entry,text:`• ${bullet}`,kind:'body'},region,x,available);
      cursor[region].y+=spacing;
    }
  };
  for(const section of r.sections) renderSection(section,columns && ['skills','education','certifications'].includes(section.kind)?'aside':'main');
  pages.forEach((_,index)=>{
    if(sidebar) decorations[index]?.unshift({kind:'panel',x:margin-5,y:index===0?bodyStart-1:margin-4,width:columnWidth+10,height:height-margin-(index===0?bodyStart-1:margin-4),tone:'accent'});
    else if(columns) decorations[index]?.unshift({kind:'rule',x:mainX-gutter/2,y:index===0?bodyStart:margin,width:0.25,height:height-margin-(index===0?bodyStart:margin),tone:'soft'});
  });
  return {pages,decorations,width,height,margin,font,columns,sidebar,bodyStart,mainX,mainWidth,columnWidth,gutter};
}

export async function exportPDF(r: Resume,title: string) {
  const layout=layoutResume(r);
  const {pages,decorations,margin,width,height,font}=layout;
  const pdf=new jsPDF({unit:'mm',format:r.format.pageSize==='A4'?'a4':'letter'});
  const accent=palette[r.format.accent];
  pages.forEach((lines,i)=>{
    if(i)pdf.addPage();
    for(const d of decorations[i] || []) {
      const color=d.tone==='soft'?[210,210,210]:accent;
      pdf.setFillColor(color[0] ?? 42,color[1] ?? 42,color[2] ?? 42);
      pdf.rect(d.x,d.y,d.width,d.height,'F');
    }
    pdf.setDrawColor(...accent);pdf.setLineWidth(r.format.borderWidth);
    if(r.format.border==='page')pdf.rect(margin/2,margin/2,width-margin,height-margin);
    for(const l of lines){pdf.setFont(font,l.bold?'bold':l.italic?'italic':'normal');pdf.setFontSize(l.size);const color=l.tone==='paper'?[255,255,255]:l.tone==='accent'?accent:ink;pdf.setTextColor(color[0] ?? 42,color[1] ?? 42,color[2] ?? 42);pdf.text(l.text,l.x,l.y+l.size*0.3528);}
    pdf.setTextColor(...ink);pdf.setFontSize(8);pdf.text(`${i+1} / ${pages.length}`,width-margin-10,height-8);
  });
  pdf.save(`${title || 'resume'}.pdf`);
}

export async function exportDOCX(r: Resume,title: string) {
  const {Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle,Table,TableRow,TableCell,WidthType,VerticalAlign,PageBreak,ShadingType}=await import('docx');
  const l=layoutResume(r);const tw=(mm:number)=>Math.round(mm*56.7);
  const color=({charcoal:'2A2A2A',green:'26563C',blue:'294B6A'} as const)[r.format.accent];
  const noBorder={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
  const paragraphs=(lines:Line[],origin:number)=>lines.map((line,i)=>{
    const previous=lines[i-1];
    const before=previous?Math.max(0,line.y-previous.y-previous.size*0.3528*1.3):Math.max(0,line.y-origin);
    return new Paragraph({
      alignment:r.format.alignment==='center'||(line.region==='header'&&r.format.template==='classic'&&r.format.alignment==='left')?AlignmentType.CENTER:r.format.alignment==='right'?AlignmentType.RIGHT:AlignmentType.LEFT,
      spacing:{before:tw(before),after:0,line:tw(line.size*0.3528*1.3)},
      keepNext:line.heading,
      ...(line.heading&&r.format.border==='headings'?{border:{bottom:{style:BorderStyle.SINGLE,size:Math.max(1,Math.round(r.format.borderWidth*8)),color}}}:{}),
      children:[new TextRun({text:line.text,font:r.format.font==='Courier'?'Courier New':r.format.font,size:line.size*2,bold:line.bold,italics:line.italic,color:line.tone==='paper'?'FFFFFF':line.tone==='accent'?color:'2A2A2A'})],
    });
  });
  const children:(InstanceType<typeof Paragraph>|InstanceType<typeof Table>)[]=[];
  l.pages.forEach((lines,index)=>{
    if(index)children.push(new Paragraph({children:[new PageBreak()]}));
    const header=lines.filter(line=>line.region==='header');
    children.push(...paragraphs(header,r.format.margin));
    const origin=index===0?l.bodyStart:r.format.margin;
    if(l.columns){
      const cell=(region:Region,width:number)=>new TableCell({width:{size:tw(width),type:WidthType.DXA},verticalAlign:VerticalAlign.TOP,margins:{top:0,bottom:0,left:0,right:0},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},...(l.sidebar&&region==='aside'?{shading:{type:ShadingType.CLEAR,fill:color}}:{}),children:paragraphs(lines.filter(line=>line.region===region),origin)});
      children.push(new Table({width:{size:tw(l.width-r.format.margin*2),type:WidthType.DXA},columnWidths:[tw(l.columnWidth),tw(l.gutter),tw(l.mainWidth)],borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[cell('aside',l.columnWidth),new TableCell({width:{size:tw(l.gutter),type:WidthType.DXA},children:[new Paragraph('')],borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder}}),cell('main',l.mainWidth)]})]}));
    }else children.push(...paragraphs(lines.filter(line=>line.region==='main'),header.length?header.at(-1)?.y || origin:origin));
  });
  const border={style:BorderStyle.SINGLE,size:Math.round(r.format.borderWidth*8),color,space:12};
  const doc=new Document({sections:[{properties:{page:{size:{width:tw(l.width),height:tw(l.height)},margin:{top:tw(r.format.margin),right:tw(r.format.margin),bottom:tw(r.format.margin),left:tw(r.format.margin)},...(r.format.border==='page'?{borders:{pageBorderTop:border,pageBorderBottom:border,pageBorderLeft:border,pageBorderRight:border}}:{})}},children}]});
  const blob=await Packer.toBlob(doc);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${title || 'resume'}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}