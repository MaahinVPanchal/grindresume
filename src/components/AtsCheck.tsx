import { useEffect, useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Loader2, Gauge, Sparkles, X } from 'lucide-react';
import type { Resume } from '@/lib/resume-model';
import { resumeBlocks } from '@/lib/resume-model';
import { atsChecks, blendAts } from '@/lib/ats';
import { reviewResume } from '@/lib/ats.functions';
import { useKeys } from '@/lib/keys';
import { Button } from './Button';
import { Icon } from './ResumeEditor';

const CATEGORY_LABELS: Record<string, string> = { impact: 'Impact & results', keywordAlignment: 'Keyword alignment', clarity: 'Clarity & focus' };

export function AtsCheck({ resume, onClose }: { resume: Resume; onClose: () => void }) {
  const [jd, setJd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState<Awaited<ReturnType<typeof reviewResume>> | null>(null);
  const keys = useKeys();
  const run = useServerFn(reviewResume);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const result = useMemo(() => atsChecks(resume, jd), [resume, jd]);
  const resumeText = useMemo(() => resumeBlocks(resume).map(b => b.lines.join(' ')).join('\n').slice(0, 15000), [resume]);

  async function review() {
    setBusy(true); setError('');
    const response = await run({ data: { resumeText, jd, deterministicMissing: result.keywords.missing.slice(0, 25), apiKey: keys.nebius || undefined, model: keys.model || undefined } });
    setAi(response);
    if (!response.ok) setError(response.error);
    setBusy(false);
  }

  const aiScores = ai?.ok ? [ai.review.impact.score, ai.review.keywordAlignment.score, ai.review.clarity.score] : [];
  const overall = blendAts(result.score, aiScores);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/20 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="ATS readiness check" className="max-h-[90dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-lg glass-strong p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-3xl"><Gauge className="h-6 w-6" /> ATS readiness</h2>
          <Icon label="Close ATS check" onClick={onClose}><X /></Icon>
        </div>
        <p className="text-sm text-muted-foreground">A transparent readiness score: the checks below are computed from your resume in code, and the AI review must quote evidence. Nothing here changes your resume without your approval.</p>
        <label className="block text-sm font-medium" htmlFor="ats-jd">Job description <span className="font-normal text-muted-foreground">(optional — unlocks keyword coverage)</span></label>
        <textarea id="ats-jd" value={jd} onChange={e => setJd(e.target.value)} rows={4} maxLength={12000} placeholder="Paste the job post to score keyword coverage against it…" className="w-full rounded-md border bg-glass-strong p-3 text-sm outline-none focus:border-foreground/40" />
        <div className="flex items-center gap-4 rounded-lg bg-muted/60 p-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4" style={{ borderColor: overall >= 70 ? 'var(--sage)' : overall >= 40 ? 'var(--peach)' : 'var(--destructive)' }}>
            <span className="font-display text-2xl" aria-label={`Readiness score ${overall} out of 100`}>{overall}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            {result.checks.map(c => (
              <div key={c.id} title={c.hint} className="flex items-center gap-2 text-xs">
                <span className="w-44 shrink-0 truncate font-medium">{c.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.round((c.earned / c.weight) * 100)}%` }} /></span>
                <span className="w-10 shrink-0 text-right text-muted-foreground">{c.earned}/{c.weight}</span>
              </div>
            ))}
          </div>
        </div>
        {jd.trim() && (result.keywords.found.length > 0 || result.keywords.missing.length > 0) && (
          <div className="space-y-1.5 text-xs">
            <p className="font-medium">Keywords from the job post</p>
            <div className="flex flex-wrap gap-1.5">{result.keywords.found.map(k => <span key={k} className="rounded-full bg-sage/30 px-2 py-0.5">{k}</span>)}{result.keywords.missing.map(k => <span key={k} title="Not found in your resume" className="rounded-full bg-peach/30 px-2 py-0.5">{k}</span>)}</div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" onClick={review} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}{busy ? 'Reviewing…' : 'Run AI review'}
          </Button>
          <p className="text-xs text-muted-foreground">{keys.nebius && keys.model ? 'Runs on your Nebius key — unlimited.' : 'Free with sign-up: 3 AI reviews a day, no keys needed.'}</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {ai?.ok && (
          <div className="space-y-3 rounded-lg border bg-glass-strong p-4">
            {(['impact', 'keywordAlignment', 'clarity'] as const).map(k => (
              <div key={k} className="text-xs">
                <div className="flex items-center justify-between font-medium"><span>{CATEGORY_LABELS[k]}</span><span>{ai.review[k].score}/100</span></div>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-border/60"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${ai.review[k].score}%` }} /></span>
                <p className="mt-1 text-muted-foreground">“{ai.review[k].evidence}”</p>
              </div>
            ))}
            {ai.review.missingKeywords.length > 0 && <p className="text-xs"><span className="font-medium">Missing keywords:</span> {ai.review.missingKeywords.join(', ')}</p>}
            {ai.review.topFixes.length > 0 && (
              <div className="text-xs"><p className="font-medium">Top fixes (apply yourself in the editor — nothing is changed automatically):</p><ul className="mt-1 list-disc space-y-1 pl-4">{ai.review.topFixes.map((f, i) => <li key={i}>{f}</li>)}</ul></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
