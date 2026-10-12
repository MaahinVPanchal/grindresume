import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Building2, Loader2, Search } from 'lucide-react';
import { Button } from './Button';
import { CompanyCard } from './CompanyCard';
import type { Resume } from '@/lib/resume-model';
import { employersFrom, setSharing } from '@/lib/community';
import { CompanyProfileSchema, officialWebsite } from '@/lib/company-profile';
import { confirmCompany, inspectCompanyWebsite } from '@/lib/community.functions';

type Row = { key: string; original: string; name: string; website: string; oneLiner: string; share: boolean; note: string };

/** Shown right after extraction: clean employer names, confirm websites, opt in to sharing. */
export function EmployerReview({ resume, userId, onDone }: { resume: Resume; userId: string; onDone: (next: Resume | null) => void }) {
  const [rows, setRows] = useState<Row[]>(() => employersFrom(resume).map(e => ({ key: e.key, original: e.name, name: e.name, website: '', oneLiner: '', share: false, note: '' })));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const inspect = useServerFn(inspectCompanyWebsite);
  const confirm = useServerFn(confirmCompany);
  const set = (i: number, p: Partial<Row>) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const site = (w: string) => { try { return officialWebsite(w); } catch { return ''; } };

  async function finish() {
    setBusy('save'); setError('');
    try {
      const renamed = rows.filter(r => r.name.trim() && r.name.trim() !== r.original);
      const next: Resume = renamed.length ? { ...resume, sections: resume.sections.map(s => s.kind !== 'experience' ? s : { ...s, entries: s.entries.map(e => { const hit = renamed.find(r => (e.subtitle || '').startsWith(r.original)); return hit ? { ...e, subtitle: hit.name.trim() + (e.subtitle || '').slice(hit.original.length) } : e; }) }) } : resume;
      const shared = rows.filter(r => r.share);
      for (const r of shared) if (!site(r.website)) throw new Error(`Add the official website for ${r.name} or untick sharing.`);
      if (shared.length) {
        await setSharing(userId, true);
        for (const r of shared) await confirm({ data: CompanyProfileSchema.parse({ key: r.key, name: r.name.trim(), website: r.website, oneLiner: r.oneLiner, industry: '', location: '' }) });
      }
      onDone(renamed.length ? next : null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Please retry.'); } finally { setBusy(''); }
  }

  return <div role="dialog" aria-modal="true" aria-labelledby="employer-review-title" className="fixed inset-0 z-50 grid place-items-center bg-background/60 p-4 backdrop-blur-sm">
    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg glass-strong">
      <div className="border-b px-5 py-4">
        <h2 id="employer-review-title" className="flex items-center gap-2 text-lg font-semibold"><Building2 className="h-5 w-5"/>Check your companies</h2>
        <p className="mt-1 text-xs text-muted-foreground">We found these employers in your resume. Fix any names, add official websites, and choose which to share in “Where our users have worked” — only company details, never your name, titles or dates.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No employers were detected. You can add them in the editor.</p>}
        {rows.map((r, i) => { const w = site(r.website); return <div key={r.key} className="grid gap-3 border-b pb-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-medium">Company name<input aria-label={`Company name for ${r.original}`} maxLength={80} value={r.name} onChange={e => set(i, { name: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"/></label>
            {r.name.trim() !== r.original && <p className="text-xs text-muted-foreground">Was: {r.original}</p>}
            <label className="block text-xs font-medium">Official website<input aria-label={`Website for ${r.original}`} placeholder="company.com" value={r.website} onChange={e => set(i, { website: e.target.value, note: '' })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"/></label>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!w || !!busy} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs" onClick={async () => { setBusy(r.key); try { const res = await inspect({ data: { website: w } }); set(i, res.ok ? { website: res.website, oneLiner: res.oneLiner || r.oneLiner, note: res.oneLiner ? 'Description found — review it.' : 'No description found; add one.' } : { note: res.error }); } catch { set(i, { note: 'Lookup failed; enter details yourself.' }); } finally { setBusy(''); } }}>{busy === r.key ? <Loader2 className="h-3 w-3 animate-spin"/> : <Search className="h-3 w-3"/>}Get website details</Button>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.share} onChange={e => set(i, { share: e.target.checked })}/>Share in community</label>
            </div>
            <textarea aria-label={`Description for ${r.original}`} rows={2} maxLength={300} placeholder="Short description (optional)" value={r.oneLiner} onChange={e => set(i, { oneLiner: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-xs"/>
            {r.note && <p role="status" className="text-xs text-muted-foreground">{r.note}</p>}
          </div>
          {w ? <CompanyCard company={{ name: r.name || r.original, website: w, one_liner: r.oneLiner, industry: '', location: '', logo_url: '', people: 1 }}/> : <p className="self-center text-xs text-muted-foreground">Add a website to preview the logo and card.</p>}
        </div>; })}
      </div>
      {error && <p role="alert" className="px-5 pt-2 text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
        <Button disabled={!!busy} className="rounded-md border px-3 py-2 text-sm" onClick={() => onDone(null)}>Skip for now</Button>
        <Button disabled={!!busy} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={finish}>{busy === 'save' && <Loader2 className="h-4 w-4 animate-spin"/>}Confirm & continue to tailoring</Button>
      </div>
    </div>
  </div>;
}
