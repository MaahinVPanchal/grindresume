import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import type { Resume } from '@/lib/resume-model';
import { employersFrom, getSharing, setSharing } from '@/lib/community';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyProfile } from '@/lib/company-profile';
import { CompanyConfirmation } from './CompanyConfirmation';

export function CompanySharing({ resume, userId }: { resume: Resume; userId: string }) {
  const [share, setShare] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<CompanyProfile[]>([]);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const employers = employersFrom(resume);

  useEffect(() => { getSharing().then(setShare).catch(() => { setShare(false); setError('Could not load sharing preferences. Please refresh.'); }); }, [userId]);
  useEffect(() => {
    if (!share) { setLoaded(false); return; }
    let active = true;
    supabase.from('shared_companies').select('*').eq('user_id',userId).then(({data,error: e}) => {
      if (!active) return;
      if (e) { setError('Could not load confirmed companies. Please refresh.'); return; }
      setSaved((data || []).filter(c => c.website && c.confirmed_at).map(c => ({ key: c.name_key, name: c.display_name, website: c.website || '', oneLiner: c.one_liner, industry: c.industry, location: c.location })));
      setLoaded(true);
    });
    return () => { active = false; };
  }, [share, userId, revision]);
  const all = [...employers, ...saved.filter(c => !employers.some(e => e.key === c.key)).map(c => ({key:c.key,name:c.name}))];

  return (
    <section className="mb-4 border-y px-1 py-4 text-sm">
    <div className="flex items-start gap-3">
      <Users className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" aria-label="Share my past employers" disabled={share === null || pending} checked={!!share} onChange={async (e) => {
            const next = e.target.checked; setError(''); setPending(true);
            try { await setSharing(userId, next); setShare(next); if (!next) setSaved([]); } catch { setError('Could not update sharing. Please retry.'); } finally { setPending(false); }
          }} />
          Add my past employers to “Where our users have worked”
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Only approved company details are shared — never your name, job titles or dates. Confirm each official website before it appears. Turn sharing off to remove your contributions.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Tip: on LinkedIn, open your profile → More → Save to PDF, then import that PDF here to bring in your work history.</p>
        {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
    {share && (loaded ? <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">{all.length ? all.map(e => <CompanyConfirmation key={`${e.key}-${saved.find(c => c.key === e.key)?.website || 'new'}`} employer={e} saved={saved.find(c => c.key === e.key)} onSaved={() => setRevision(r => r+1)}/>) : <p className="text-xs text-muted-foreground">No employers found. Add company names in your experience section.</p>}</div> : <p className="mt-3 text-xs text-muted-foreground">Loading your companies…</p>)}
    </section>
  );
}
