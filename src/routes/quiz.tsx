import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/Button';
import { supabase } from '@/integrations/supabase/client';
import { useKeys } from '@/lib/keys';
import { createQuiz, submitQuiz } from '@/lib/quiz.functions';

export const Route = createFileRoute('/quiz')({
  validateSearch: (s) => z.object({ company: z.string().optional(), url: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: 'Fit quiz — Grinder' }, { name: 'description', content: 'Answer three role-specific questions in your own words and get a fit score before you apply.' }, { property: 'og:title', content: 'Fit quiz — Grinder' }, { property: 'og:description', content: 'Prove your fit for a specific role in your own words.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: QuizPage,
});

type Q = { kind: string; question: string; lookFor: string };
type Result = { score: number; perQuestion: { score: number; strengths: string; gaps: string }[]; summary: string };
type Past = { id: string; company: string; role: string; job_url: string; score: number | null; submitted_at: string | null; created_at: string };

function QuizPage() {
  const search = Route.useSearch();
  const keys = useKeys();
  const make = useServerFn(createQuiz);
  const submit = useServerFn(submitQuiz);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [company, setCompany] = useState(search.company || '');
  const [url, setUrl] = useState(search.url || '');
  const [jobText, setJobText] = useState('');
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [quiz, setQuiz] = useState<{ id: string; role: string; questions: Q[] } | null>(null);
  const [answers, setAnswers] = useState(['', '', '']);
  const [pasted, setPasted] = useState([false, false, false]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [past, setPast] = useState<Past[]>([]);

  async function loadPast() {
    const r = await supabase.from('role_assessments').select('id,company,role,job_url,score,submitted_at,created_at').order('created_at', { ascending: false }).limit(20);
    setPast(r.data || []);
  }
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSignedIn(!!data.session);
      if (!data.session) return;
      const r = await supabase.from('resumes').select('id,title').order('updated_at', { ascending: false });
      if (r.data?.length) { setResumes(r.data); setResumeId(r.data[0].id); }
      loadPast();
    });
  }, []);

  async function start() {
    setErr(''); setBusy(true); setResult(null);
    const r = await make({ data: { company, jobUrl: url, jobText, resumeId: resumeId || undefined, tavilyKey: keys.tavily || undefined, apiKey: keys.nebius || undefined, model: keys.model || undefined } });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setQuiz(r); setAnswers(['', '', '']); setPasted([false, false, false]); loadPast();
  }
  async function finish() {
    if (!quiz) return;
    setErr(''); setBusy(true);
    const r = await submit({ data: { id: quiz.id, answers, pasted, apiKey: keys.nebius || undefined, model: keys.model || undefined } });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setResult(r); loadPast();
  }

  const field = 'w-full rounded-lg border bg-background/70 p-2 text-sm outline-none';
  return (
    <Shell>
      <div className="py-8"><h1 className="font-display text-5xl">Fit quiz</h1><p className="mt-2 max-w-2xl text-muted-foreground">Paste a job link, answer three questions about that role in your own words, and see how strong your fit looks before applying. No AI writes your answers.</p></div>
      {signedIn === false ? <Link to="/resume" className="underline">Sign in to take a fit quiz</Link> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 rounded-lg glass p-5">
            {!quiz ? (
              <>
                <input aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company, e.g. OpenAI" className={field} />
                <input aria-label="Job link" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Job posting link (https://…)" className={field} />
                <textarea aria-label="Job description (optional)" value={jobText} onChange={(e) => setJobText(e.target.value)} placeholder="Optional: paste the job description if the link can't be read" rows={4} className={field} />
                {resumes.length > 0 && <select aria-label="Resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)} className={field}>{resumes.map((r) => <option key={r.id} value={r.id}>Resume: {r.title}</option>)}<option value="">Don't use a resume</option></select>}
                <Button onClick={start} disabled={busy || !company.trim() || !/^https?:\/\/\S+$/.test(url.trim())} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Create my 3 questions</Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-semibold">{quiz.role} · {company}</h2><Button onClick={() => { setQuiz(null); setResult(null); }} className="text-sm underline">New quiz</Button></div>
                {quiz.questions.map((q, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{i + 1} · {q.kind}</p>
                    <p className="font-medium">{q.question}</p>
                    <textarea aria-label={`Answer ${i + 1}`} value={answers[i]} disabled={!!result} rows={6} maxLength={4000}
                      onPaste={(e) => { e.preventDefault(); setPasted((p) => p.map((x, j) => (j === i ? true : x))); }}
                      onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))} className={field} placeholder="Type in your own words…" />
                    <p className="text-xs text-muted-foreground">{answers[i].trim().split(/\s+/).filter(Boolean).length} words{pasted[i] && ' · pasting is turned off so answers stay your own'}</p>
                    {result?.perQuestion[i] && <div className="rounded-md bg-muted/60 p-2 text-sm"><b>{Math.round(result.perQuestion[i].score)}/100</b> · <span className="text-sage">✓ {result.perQuestion[i].strengths}</span><br /><span className="text-muted-foreground">Gap: {result.perQuestion[i].gaps}</span></div>}
                  </div>
                ))}
                {result ? <div className="rounded-lg bg-primary p-4 text-primary-foreground"><p className="text-3xl font-semibold">{result.score}/100</p><p className="text-sm">{result.summary}</p></div>
                  : <Button onClick={finish} disabled={busy || answers.some((a) => a.trim().length < 20)} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Submit & get my score</Button>}
              </>
            )}
            {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          </div>
          <aside className="rounded-lg glass p-4 text-sm"><h2 className="mb-2 font-semibold">Your quizzes</h2>{!past.length ? <p className="text-muted-foreground">None yet.</p> : <ul className="space-y-2">{past.map((p) => <li key={p.id} className="border-b pb-2"><p className="font-medium">{p.company} · {p.role}</p><p className="text-xs text-muted-foreground">{p.submitted_at ? `Score ${p.score}/100` : 'Not submitted'} · {new Date(p.created_at).toLocaleDateString()}</p></li>)}</ul>}</aside>
        </div>
      )}
    </Shell>
  );
}
