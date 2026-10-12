import { jsPDF } from 'jspdf';
import { resumeBlocks, type Resume } from './resume-model';
export type Line = { text: string; x: number; y: number; size: number; bold: boolean; key: string; sectionId?: string | undefined; entryId?: string | undefined };
export function layoutResume(r: Resume) {
  const width = r.format.pageSize === 'A4' ? 210 : 215.9;
  const height = r.format.pageSize === 'A4' ? 297 : 279.4;
  const pdf = new jsPDF({ unit: 'mm', format: r.format.pageSize === 'A4' ? 'a4' : 'letter' });
  const font = r.format.font === 'Courier' ? 'courier' : ['Georgia','Times New Roman'].includes(r.format.font) ? 'times' : 'helvetica';
  const margin = r.format.margin;
  const pages: Line[][] = [[]];
  let y = margin;
  for (const block of resumeBlocks(r)) {
    const size = block.kind === 'name' ? r.format.fontSize + 10 : block.kind === 'heading' ? r.format.fontSize + 2 : block.kind === 'contact' ? r.format.fontSize - 1 : r.format.fontSize;
    const bold = block.kind === 'name' || block.kind === 'heading' || r.format.fontWeight === 'bold';
    pdf.setFont(font, bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    const lines: string[] = block.lines.flatMap(text => pdf.splitTextToSize(r.format.template==='technical' && (block.kind==='heading'||block.kind==='name')?text.toUpperCase():text, width - margin * 2) as string[]);
    const step = size * 0.3528 * 1.35;
    if (y + Math.min(lines.length, block.kind === 'heading' ? 4 : 2) * step > height - margin - 8) { pages.push([]); y = margin; }
    for (const text of lines) {
      if (y + step > height - margin - 8) { pages.push([]); y = margin; }
      const alignment = block.kind==='name' && ['classic','executive'].includes(r.format.template) ? 'center' : r.format.alignment;
      const x=alignment==='center'?(width-pdf.getTextWidth(text))/2:alignment==='right'?width-margin-pdf.getTextWidth(text):margin;
      pages[pages.length-1]?.push({ text, x, y, size, bold, key: block.key, sectionId: block.sectionId, entryId: block.entryId });
      y += step;
    }
    y += r.format.template === 'compact' ? 2 : r.format.spacing;
  }
  return { pages, width, height, margin, font };
}
export async function exportPDF(r: Resume, title: string) {
  const { pages, margin, width, height, font } = layoutResume(r);
  const pdf = new jsPDF({ unit: 'mm', format: r.format.pageSize === 'A4' ? 'a4' : 'letter' });
  pages.forEach((lines,i) => {
    if (i) pdf.addPage();
    const accent=({charcoal:[42,42,42],green:[38,86,60],blue:[41,75,106]} as const)[r.format.accent];
    pdf.setDrawColor(accent[0],accent[1],accent[2]); pdf.setLineWidth(r.format.borderWidth);
    if(r.format.border==='page') pdf.rect(margin/2,margin/2,width-margin,height-margin);
    if(r.format.border==='headings') for(const l of lines){if(r.sections.some(s=>s.id===l.key))pdf.line(margin,l.y+l.size*0.3528+1,width-margin,l.y+l.size*0.3528+1);}
    lines.forEach(l => { pdf.setFont(font, l.bold ? 'bold' : 'normal'); pdf.setFontSize(l.size); const accent=({charcoal:[42,42,42],green:[38,86,60],blue:[41,75,106]} as const)[r.format.accent]; const color=l.bold?accent:[42,42,42]; pdf.setTextColor(color[0]??42,color[1]??42,color[2]??42); pdf.text(l.text, l.x, l.y + l.size * 0.3528); });
    pdf.setFontSize(8); pdf.text(`${i+1} / ${pages.length}`, margin, height-8);
  });
  pdf.save(`${title || 'resume'}.pdf`);
}
export async function exportDOCX(r: Resume, title: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType, BorderStyle } = await import('docx');
  const { width,height } = layoutResume(r);
  const children = resumeBlocks(r).flatMap(b => b.lines.map((text, i) => new Paragraph({
    ...(b.kind === 'heading' ? { heading: HeadingLevel.HEADING_1 } : {}),
    ...(text.startsWith('• ') ? { numbering: { reference: 'bullets', level: 0 } } : {}),
    alignment: b.kind==='name'&&['classic','executive'].includes(r.format.template)?AlignmentType.CENTER:r.format.alignment==='center'?AlignmentType.CENTER:r.format.alignment==='right'?AlignmentType.RIGHT:AlignmentType.LEFT,
    ...(r.format.border==='headings'&&b.kind==='heading'?{border:{bottom:{style:BorderStyle.SINGLE,size:Math.round(r.format.borderWidth*8),color:({charcoal:'2A2A2A',green:'26563C',blue:'294B6A'})[r.format.accent]}}}:{}),
    spacing: { after: Math.round((r.format.template==='compact'?2:r.format.spacing) * 56.7), line: 276 },
    keepNext: b.kind === 'heading',
    children: [new TextRun({ text: r.format.template==='technical'&&(b.kind==='name'||b.kind==='heading')?text.replace(/^• /,'').toUpperCase():text.replace(/^• /,''), font: r.format.font === 'Courier' ? 'Courier New' : r.format.font, size: (b.kind === 'name' ? r.format.fontSize + 10 : b.kind==='heading'?r.format.fontSize+2:b.kind==='contact'?r.format.fontSize-1:r.format.fontSize) * 2, color:b.kind==='name'||b.kind==='heading'?({charcoal:'2A2A2A',green:'26563C',blue:'294B6A'})[r.format.accent]:'2A2A2A', bold: b.kind === 'name' || b.kind === 'heading' || r.format.fontWeight === 'bold' })],
  })));
  const pageBorder={style:BorderStyle.SINGLE,size:Math.round(r.format.borderWidth*8),color:({charcoal:'2A2A2A',green:'26563C',blue:'294B6A'})[r.format.accent],space:12};
  const doc = new Document({ numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', style: { paragraph: { indent: { left: 360, hanging: 180 } } } }] }] }, sections: [{ properties: { page: { ...(r.format.border==='page'?{borders:{top:pageBorder,bottom:pageBorder,left:pageBorder,right:pageBorder}}:{}), size: { width: Math.round(width*56.7), height: Math.round(height*56.7) }, margin: { top: r.format.margin*56.7, right: r.format.margin*56.7, bottom: r.format.margin*56.7, left: r.format.margin*56.7 } } }, children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`${title || 'resume'}.docx`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
}