import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { communityCompanies } from '@/lib/community';
import type { CommunityCompany } from '@/lib/company-profile';
import { CompanyCard } from './CompanyCard';

export function CommunityCatalog({ query = '' }: { query?: string }) {
  const [companies, setCompanies] = useState<CommunityCompany[]>([]);
  const [status, setStatus] = useState('loading');
  useEffect(() => { let active = true; communityCompanies().then(rows => { if (active) { setCompanies(rows); setStatus('ready'); } }).catch(() => { if (active) setStatus('error'); }); return () => { active = false; }; }, []);
  const q = query.trim().toLowerCase();
  const shown = companies.filter(c => !q || `${c.name} ${c.industry} ${c.one_liner} ${c.location}`.toLowerCase().includes(q));
  return <section className="mx-auto mt-8 max-w-6xl"><h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-4 w-4"/>Where our users have worked</h2><p className="mt-1 text-xs text-muted-foreground">Official websites confirmed by members. No employment identities are shared.</p>
    {status === 'loading' ? <p className="mt-3 text-sm text-muted-foreground">Loading companies…</p> : status === 'error' ? <p role="alert" className="mt-3 text-sm text-muted-foreground">Company catalog is unavailable. Please refresh to retry.</p> : shown.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shown.slice(0,60).map(c => <CompanyCard key={c.website} company={c}/>)}</div> : <p className="mt-3 text-sm text-muted-foreground">{companies.length ? 'No matching community companies.' : <>No confirmed companies yet. <Link to="/resume" className="underline">Confirm your employers</Link> to include them.</>}</p>}
  </section>;
}