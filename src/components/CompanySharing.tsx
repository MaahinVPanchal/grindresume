import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import type { Resume } from '@/lib/resume-model';
import { employersFrom, getSharing, setSharing, shareEmployers } from '@/lib/community';

export function CompanySharing({ resume, userId }: { resume: Resume; userId: string }) {
  const [share, setShare] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const employers = employersFrom(resume);
  const signature = employers.map((e) => e.key).join('|');

  useEffect(() => { getSharing().then(setShare).catch(() => setShare(false)); }, []);
  useEffect(() => {
    if (!share) return;
    const t = setTimeout(() => { void shareEmployers(userId, resume); }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share, signature, userId]);

  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 rounded-md border bg-glass-strong px-4 py-3 text-sm">
      <Users className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" aria-label="Share my past employers" disabled={share === null} checked={!!share} onChange={async (e) => {
            const next = e.target.checked; setError(''); setShare(next);
            try { await setSharing(userId, next, resume); } catch { setShare(!next); setError('Could not update sharing. Please retry.'); }
          }} />
          Add my past employers to “Where our users have worked”
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Only company names are shared, as an anonymous count — never your name, job titles or dates. Turn it off any time to remove them.
          {employers.length > 0 && <> Found: {employers.map((e) => e.name).join(', ')}.</>}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Tip: on LinkedIn, open your profile → More → Save to PDF, then import that PDF here to bring in your work history.</p>
        {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
