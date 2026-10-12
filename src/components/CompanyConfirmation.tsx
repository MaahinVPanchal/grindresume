import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Check, Loader2, Search, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { CompanyCard } from './CompanyCard';
import { CompanyProfileSchema, officialWebsite, type CompanyProfile } from '@/lib/company-profile';
import { confirmCompany, inspectCompanyWebsite } from '@/lib/community.functions';
import { supabase } from '@/integrations/supabase/client';

export function CompanyConfirmation({ employer, saved, onSaved }: { employer: { key: string; name: string }; saved?: CompanyProfile | undefined; onSaved: () => void }) {
  const [draft, setDraft] = useState<CompanyProfile>(saved || { ...employer, website: '', oneLiner: '', industry: '', location: '' });
  const [confirmed, setConfirmed] = useState(Boolean(saved));
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const inspect = useServerFn(inspectCompanyWebsite);
  const confirm = useServerFn(confirmCompany);
  let website = '';
  try { website = officialWebsite(draft.website); } catch { /* Incomplete input has no preview. */ }
  const update = (field: keyof CompanyProfile, value: string) => { setDraft(d => ({ ...d, [field]: value })); setMessage(''); };
  const changed = !saved || ['website', 'name', 'oneLiner', 'industry', 'location'].some(k => draft[k as keyof CompanyProfile] !== saved[k as keyof CompanyProfile]);
  return <div className="border-b pb-4">
    <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-medium">{employer.name}</h3>{confirmed && <span className="flex items-center gap-1 text-xs"><Check className="h-3 w-3"/>Confirmed</span>}</div>
    <label className="block text-xs font-medium">Company name<input aria-label={`${employer.name} company name`} maxLength={80} value={draft.name} onChange={e => update('name', e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"/></label>
    <label className="mt-3 block text-xs font-medium">Official website<input aria-label={`${employer.name} official website`} maxLength={253} placeholder="company.com" value={draft.website} onChange={e => update('website', e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"/></label>
    <Button disabled={!!busy || !website} className="mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs" onClick={async () => {
      setBusy('lookup'); setMessage('');
      try { const r = await inspect({ data: { website } }); if (r.ok) { setDraft(d => ({ ...d, website: r.website, oneLiner: r.oneLiner || d.oneLiner })); setMessage(r.oneLiner ? 'Description found on the company website. Review it before confirming.' : 'No public description found. Enter a short description below.'); } else setMessage(r.error); }
      catch { setMessage('Could not look up this website. Enter its details below.'); } finally { setBusy(''); }
    }}>{busy === 'lookup' ? <Loader2 className="h-3 w-3 animate-spin"/> : <Search className="h-3 w-3"/>}Get website details</Button>
    <label className="mt-3 block text-xs font-medium">Short description<textarea aria-label={`${employer.name} short description`} value={draft.oneLiner} maxLength={300} onChange={e => update('oneLiner', e.target.value)} rows={2} className="mt-1 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"/></label>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{(['industry','location'] as const).map(field => <label key={field} className="block text-xs font-medium">{field === 'industry' ? 'Industry (optional)' : 'Location (optional)'}<input aria-label={`${employer.name} ${field}`} value={draft[field]} maxLength={field === 'industry' ? 80 : 100} onChange={e => update(field,e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"/></label>)}</div>
    {website && <div className="mt-4"><p className="mb-2 text-xs font-medium">Company preview</p><CompanyCard company={{ name: draft.name || employer.name, website, one_liner: draft.oneLiner, industry: draft.industry, location: draft.location, logo_url: '', people: 1 }}/></div>}
    {message && <p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p>}
    <div className="mt-3 flex flex-wrap gap-2"><Button disabled={!!busy || !website || (confirmed && !changed)} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground" onClick={async () => {
      setBusy('save'); setMessage('');
      try { const validated = CompanyProfileSchema.parse(draft); await confirm({ data: validated }); setDraft(validated); setConfirmed(true); setMessage('Company confirmed and shared.'); onSaved(); }
      catch (e) { setMessage(e instanceof Error ? e.message : 'Company could not be saved. Retry.'); } finally { setBusy(''); }
    }}>{busy === 'save' ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-3 w-3"/>}{confirmed ? 'Update confirmed company' : 'Confirm website & share'}</Button>
    {confirmed && <Button aria-label={`Remove ${employer.name} from catalog`} title="Remove from catalog" disabled={!!busy} className="rounded-md border px-3 py-2" onClick={async () => {
      setBusy('remove');
      try { const { error } = await supabase.from('shared_companies').delete().eq('name_key',employer.key); if (error) throw error; setConfirmed(false); setMessage('Removed from the catalog.'); onSaved(); } catch { setMessage('Could not remove company. Please retry.'); } finally { setBusy(''); }
    }}><Trash2 className="h-3 w-3"/></Button>}</div>
  </div>;
}