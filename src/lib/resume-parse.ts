export async function extractResume(file: File, progress: (n: number) => void): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a resume smaller than 20 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'pdf' && extension !== 'docx') throw new Error('Choose a PDF or DOCX resume.');
  progress(10);
  const buffer = await file.arrayBuffer();
  progress(25);
  let text = '';
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
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        let previousY: number | undefined;
        let pageText = '';
        for (const item of content.items) {
          if (!('str' in item)) continue;
          const y = item.transform[5];
          if (previousY !== undefined && y !== previousY) pageText += '\n';
          pageText += item.str + (item.hasEOL ? '\n' : ' ');
          previousY = y;
        }
        text += pageText + '\n\n';
        progress(25 + Math.round(n / doc.numPages * 35));
      }
    } finally { await task.destroy(); }
  }
  if (text.trim().length < 30) throw new Error('No readable text was found. Scanned resumes need OCR first; upload a text-based PDF or DOCX.');
  if (text.length > 100000) throw new Error('This document is too long. Please upload only the resume pages.');
  progress(65);
  return text.trim();
}