export type ParsedResume = { text: string; pages: number; columns: 1 | 2 };
type Piece = { str: string; x: number; y: number; width: number };
type Segment = { text: string; minX: number; maxX: number };

function joinPieces(pieces: Piece[]): string {
  let text = '';
  for (const piece of pieces) {
    if (!text) text = piece.str;
    else if (text.endsWith('-') && /^[a-z]/.test(piece.str)) text = text.slice(0, -1) + piece.str;
    else text += ' ' + piece.str;
  }
  return text.replace(/\s+/g, ' ').trim();
}

/** Rebuilds reading order from positioned PDF fragments: bands of shared baseline split into
 *  segments at column-sized horizontal gaps, so single lines never interleave two columns and
 *  dehyphenated words rejoin. Two-column pages emit the full-width header, then the left
 *  column top-to-bottom, then the right column. */
export function buildPageText(items: Piece[], pageWidth: number): { text: string; twoColumn: boolean } {
  const bands: Piece[][] = [];
  for (const item of [...items.filter(i => i.str.trim())].sort((a, b) => b.y - a.y)) {
    const band = bands.at(-1);
    if (band && band.length && Math.abs(band[0]!.y - item.y) <= 2.5) band.push(item);
    else bands.push([item]);
  }
  const segments: (Segment & { y: number })[] = [];
  for (const band of bands) {
    band.sort((a, b) => a.x - b.x);
    let current: Piece[] = [];
    const flush = () => { if (current.length) { const first = current[0]!; const last = current.at(-1)!; segments.push({ text: joinPieces(current), minX: first.x, maxX: last.x + last.width, y: first.y }); current = []; } };
    for (const item of band) {
      const previous = current.at(-1);
      if (previous && item.x - (previous.x + previous.width) > pageWidth * 0.06) flush();
      current.push(item);
    }
    flush();
  }
  const middle = pageWidth / 2;
  const spans = segments.filter(s => s.minX < middle && s.maxX > middle);
  const left = segments.filter(s => !(s.minX < middle && s.maxX > middle) && (s.minX + s.maxX) / 2 < middle);
  const right = segments.filter(s => !(s.minX < middle && s.maxX > middle) && (s.minX + s.maxX) / 2 >= middle);
  const twoColumn = left.length >= 3 && right.length >= 3 && spans.length <= Math.max(3, segments.length * 0.2);
  const ordered = twoColumn ? [...spans, ...left, ...right] : segments;
  return { text: ordered.map(s => s.text).join('\n'), twoColumn };
}

export async function extractResume(file: File, progress: (n: number) => void): Promise<ParsedResume> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a resume smaller than 20 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'pdf' && extension !== 'docx') throw new Error('Choose a PDF or DOCX resume.');
  progress(10);
  const buffer = await file.arrayBuffer();
  progress(25);
  let text = '';
  let pages = 0;
  let twoColumnPages = 0;
  if (extension === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    text = result.value;
  } else {
    const pdf = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdf.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdf.getDocument({ data: buffer });
    const doc = await task.promise;
    try {
      if (doc.numPages > 50) throw new Error('Please upload a resume with 50 pages or fewer.');
      pages = doc.numPages;
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        const [left,, right] = page.view;
        const items: Piece[] = [];
        for (const item of content.items) if ('str' in item) items.push({ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width ?? 0 });
        const built = buildPageText(items, right! - left!);
        if (built.twoColumn) twoColumnPages++;
        text += built.text + '\n\n';
        progress(25 + Math.round(n / doc.numPages * 35));
      }
    } finally { await task.destroy(); }
  }
  if (text.trim().length < 30) throw new Error('No readable text was found. Scanned resumes need OCR first; upload a text-based PDF or DOCX.');
  if (text.length > 100000) throw new Error('This document is too long. Please upload only the resume pages.');
  progress(65);
  return { text: text.trim(), pages, columns: twoColumnPages >= Math.max(1, Math.ceil(pages / 2)) ? 2 : 1 };
}
