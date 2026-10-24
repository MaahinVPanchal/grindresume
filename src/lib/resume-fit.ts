import { layoutResume } from './resume-layout';
import { templates, type Format, type Resume } from './resume-model';

const pageCount = (r: Resume) => layoutResume(r).pages.length;

/** Matches an imported resume's template to its source layout (single-column sources keep a
 *  single-column template instead of the two-column default) and densifies spacing, margins and
 *  font size — in that order of last resort — until it fits the source page count. Content is
 *  never touched; when the target cannot be met even at the densest allowed format, the layout
 *  with the fewest pages wins. */
export function autoFitFormat(resume: Resume, targetPages: number, sourceColumns: 1 | 2): Resume {
  const templateId: Format['template'] = sourceColumns === 2 ? 'modern' : 'compact';
  const preset = templates.find(t => t.id === templateId)!.format;
  const base: Format = { ...resume.format, ...preset, template: templateId, pageSize: resume.format.pageSize };
  const start = { ...resume, format: base };
  const startPages = pageCount(start);
  if (targetPages < 1 || startPages <= targetPages) return start;
  let densest = start;
  let densestPages = startPages;
  for (let fontSize = base.fontSize; fontSize >= 8; fontSize = Math.round((fontSize - 0.5) * 2) / 2) {
    for (let margin = base.margin; margin >= 10; margin--) {
      for (let spacing = base.spacing; spacing >= 2; spacing--) {
        const candidate = { ...resume, format: { ...base, fontSize, margin, spacing } };
        const pages = pageCount(candidate);
        if (pages < densestPages) { densest = candidate; densestPages = pages; }
        if (pages <= targetPages) return candidate;
      }
    }
  }
  return densest;
}
