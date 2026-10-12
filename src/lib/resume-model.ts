import { z } from 'zod';

export const EntrySchema = z.object({ id: z.string(), title: z.string(), subtitle: z.string(), location: z.string(), start: z.string(), end: z.string(), current: z.boolean(), details: z.string(), bullets: z.array(z.string()), link: z.string() });
export const SectionSchema = z.object({ id: z.string(), heading: z.string(), kind: z.enum(['summary','experience','projects','skills','education','certifications','additional']), entries: z.array(EntrySchema) });
export const ProfileSchema = z.object({ name: z.string(), headline: z.string(), email: z.string(), phone: z.string(), location: z.string(), linkedin: z.string(), github: z.string(), website: z.string(), otherLinks: z.string() });
export const ResumeContentSchema = z.object({ personal: ProfileSchema, sections: z.array(SectionSchema), reviewNotes: z.array(z.string()) });
export type Entry = z.infer<typeof EntrySchema>;
export type Section = z.infer<typeof SectionSchema>;
export type ResumeContent = z.infer<typeof ResumeContentSchema>;
export const FormatSchema = z.object({ template: z.enum(['classic','modern','technical','compact','executive']), pageSize: z.enum(['A4','Letter']), font: z.enum(['Arial','Georgia','Courier','Times New Roman','Helvetica']), fontSize: z.number().min(8).max(14), margin: z.number().min(10).max(25), spacing: z.number().min(2).max(10), accent: z.enum(['charcoal','green','blue']), alignment: z.enum(['left','center','right']), fontWeight: z.enum(['regular','bold']), border: z.enum(['none','page','headings']), borderWidth: z.number().min(0.25).max(2) });
export type Format = z.infer<typeof FormatSchema>;
export type Resume = ResumeContent & { format: Format };
export const defaultFormat: Format = { template: 'modern', pageSize: 'A4', font: 'Arial', fontSize: 10, margin: 15, spacing: 5, accent: 'charcoal', alignment: 'left', fontWeight: 'regular', border: 'none', borderWidth: 0.5 };
export const templates: { id: Format['template']; name: string; format: Partial<Format> }[] = [
  {id:'classic',name:'Classic · traditional',format:{font:'Times New Roman',spacing:5,border:'none'}},
  {id:'modern',name:'Modern · professional',format:{font:'Arial',spacing:5,border:'headings'}},
  {id:'technical',name:'Technical · engineering',format:{font:'Courier',spacing:4,border:'headings'}},
  {id:'compact',name:'Compact · concise',format:{font:'Helvetica',spacing:2,fontSize:9,border:'none'}},
  {id:'executive',name:'Executive · leadership',format:{font:'Georgia',spacing:6,border:'page'}},
];
export const uid = () => crypto.randomUUID();
export const blankEntry = (): Entry => ({ id: uid(), title: '', subtitle: '', location: '', start: '', end: '', current: false, details: '', bullets: [], link: '' });
export function blankResume(): Resume {
  return { personal: { name: '', headline: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '', otherLinks: '' }, sections: [], reviewNotes: [], format: { ...defaultFormat } };
}
export function normalizeResume(content: ResumeContent): Resume {
  return { ...content, sections: content.sections.map(s => ({ ...s, id: uid(), entries: s.entries.map(e => ({ ...e, id: uid() })) })), format: { ...defaultFormat } };
}
export type Block = { key: string; kind: 'name' | 'contact' | 'heading' | 'entry'; lines: string[]; sectionId?: string; entryId?: string };
export function resumeBlocks(r: Resume): Block[] {
  const p = r.personal;
  const blocks: Block[] = [{ key: 'name', kind: 'name', lines: [p.name || 'Your name', p.headline].filter(Boolean) }, { key: 'contact', kind: 'contact', lines: [[p.email,p.phone,p.location].filter(Boolean).join(' · '),[p.linkedin,p.github,p.website,p.otherLinks].filter(Boolean).join(' · ')].filter(Boolean) }];
  for (const s of r.sections) {
    blocks.push({ key: s.id, kind: 'heading', lines: [s.heading], sectionId: s.id });
    for (const e of s.entries) {
      blocks.push({ key: e.id, kind: 'entry', sectionId: s.id, entryId: e.id, lines: [e.title, [e.subtitle,e.location,[e.start,e.current ? 'Present' : e.end].filter(Boolean).join(' – ')].filter(Boolean).join(' | '), e.link, ...e.details.split('\n'), ...e.bullets.map(b => `• ${b}`)].filter(Boolean) });
    }
  }
  return blocks;
}
export function validateSaved(value: unknown): Resume | null {
  const result = ResumeContentSchema.safeParse(value);
  if (!result.success) return null;
  const f = (value as { format?: Partial<Format> }).format;
  const format = FormatSchema.safeParse({ ...defaultFormat, ...f });
  return { ...result.data, format: format.success ? format.data : { ...defaultFormat } };
}