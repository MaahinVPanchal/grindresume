import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Loader2, Trash2, ArrowLeft, RotateCcw } from 'lucide-react';
import { z } from 'zod';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/Button';
import { supabase } from '@/integrations/supabase/client';
import { useKeys } from '@/lib/keys';
import { createQuiz, submitQuiz } from '@/lib/quiz.functions';

export const Route = createFileRoute('/quiz')({
  validateSearch: (s) => z.object({ company: z.string().optional(), url: z.string().optional(), id: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: 'Fit quiz - GrinderResume' }, { name: 'description', content: 'Answer three role-specific questions in your own words and get a fit score before you apply.' }, { property: 'og:title', content: 'Fit quiz - GrinderResume' }, { property: 'og:description', content: 'Prove your fit for a specific role in your own words.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
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
  const [quiz, setQuiz] = useState<{ id: string; role: string; questions: Q[]; submittedAt?: string | null } | null>(null);
  const [answers, setAnswers] = useState(['', '', '']);
  const [pasted, setPasted] = useState([false, false, false]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [past, setPast] = useState<Past[]>([]);
  const hasLoadedInitial = useRef(false);

  async function loadPast() {
    const r = await supabase.from('role_assessments').select('id,company,role,job_url,score,submitted_at,created_at').order('created_at', { ascending: false }).limit(20);
    setPast(r.data || []);
    return r.data || [];
  }

  async function openQuiz(id: string) {
    setErr('');
    setLoadingQuizId(id);
    try {
      const { data: row, error } = await supabase
        .from('role_assessments')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !row) throw new Error('Quiz could not be loaded.');

      setCompany(row.company || '');
      setUrl(row.job_url || '');
      setQuiz({
        id: row.id,
        role: row.role || 'Role assessment',
        questions: (Array.isArray(row.questions) ? row.questions : []) as Q[],
        submittedAt: row.submitted_at,
      });

      const parsedAnswers = Array.isArray(row.answers) && row.answers.length === 3
        ? (row.answers as string[])
        : ['', '', ''];
      setAnswers(parsedAnswers);

      const fb = (row.feedback as Record<string, any>) || {};
      const parsedPasted = Array.isArray(fb["pasted"]) && fb["pasted"].length === 3
        ? (fb["pasted"] as boolean[])
        : [false, false, false];
      setPasted(parsedPasted);

      if (row.submitted_at && row.score !== null) {
        setResult({
          score: row.score,
          perQuestion: Array.isArray(fb["perQuestion"]) ? fb["perQuestion"] : [],
          summary: typeof fb["summary"] === 'string' ? fb["summary"] : '',
        });
      } else {
        setResult(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load quiz');
    } finally {
      setLoadingQuizId(null);
    }
  }

  function resetToNew() {
    setQuiz(null);
    setResult(null);
    setCompany(search.company || '');
    setUrl(search.url || '');
    setJobText('');
    setAnswers(['', '', '']);
    setPasted([false, false, false]);
    setErr('');
  }

  async function deleteQuiz(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    const { error } = await supabase.from('role_assessments').delete().eq('id', id);
    if (!error) {
      if (quiz?.id === id) {
        resetToNew();
      }
      loadPast();
    } else {
      setErr('Failed to delete quiz.');
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSignedIn(!!data.session);
      if (!data.session) return;
      const r = await supabase.from('resumes').select('id,title').order('updated_at', { ascending: false });
      if (r.data?.length) { setResumes(r.data); setResumeId(r.data[0]?.id || ""); }
      const pastList = await loadPast();
      if (!hasLoadedInitial.current && search.id) {
        hasLoadedInitial.current = true;
        openQuiz(search.id);
      }
    });
  }, [search.id]);

  // Auto-save draft answers to role_assessments if quiz is open and unsubmitted
  useEffect(() => {
    if (!quiz?.id || result || quiz.submittedAt) return;
    const timer = setTimeout(async () => {
      if (answers.some((a) => a.trim().length > 0)) {
        await supabase
          .from('role_assessments')
          .update({ answers })
          .eq('id', quiz.id);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [answers, quiz?.id, result, quiz?.submittedAt]);

  async function start() {
    setErr(''); setBusy(true); setResult(null);
    const r = await make({ data: { company, jobUrl: url || undefined, jobText, resumeId: resumeId || undefined, apiKey: keys.nebius || undefined, model: keys.model || undefined } });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setQuiz({ id: r.id, role: r.role, questions: r.questions, submittedAt: null });
    setAnswers(['', '', '']);
    setPasted([false, false, false]);
    loadPast();
  }

  async function finish() {
    if (!quiz) return;
    setErr(''); setBusy(true);
    const r = await submit({ data: { id: quiz.id, answers, pasted, apiKey: keys.nebius || undefined, model: keys.model || undefined } });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setResult(r);
    setQuiz((prev) => prev ? { ...prev, submittedAt: new Date().toISOString() } : null);
    loadPast();
  }

  const field = 'w-full rounded-lg border bg-background/70 p-2 text-sm outline-none';
  return (
    <Shell>
      <div className="py-8"><h1 className="font-display text-5xl">Fit quiz</h1><p className="mt-2 max-w-2xl text-muted-foreground">Enter the company, paste the job description, pick your resume, then answer three questions about that role in your own words to see how strong your fit looks. No AI writes your answers.</p></div>
      {signedIn === false ? <Link to="/resume" className="underline">Sign in to take a fit quiz</Link> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 rounded-lg glass p-5">
            {!quiz ? (
              <>
                <input aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company, e.g. OpenAI" className={field} />
                <textarea aria-label="Job description" value={jobText} onChange={(e) => setJobText(e.target.value)} placeholder="Paste the full job description (role, responsibilities, requirements)" rows={8} className={field} />
                <p className="text-xs text-muted-foreground">{jobText.trim().length < 100 ? `Add at least ${100 - jobText.trim().length} more characters` : 'Looks good'}</p>
                {resumes.length > 0 ? <select aria-label="Resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)} className={field}>{resumes.map((r) => <option key={r.id} value={r.id}>Resume: {r.title}</option>)}<option value="">Don't use a resume</option></select> : <p className="text-xs text-muted-foreground">No saved resume yet — <Link to="/resume" className="underline">add one</Link> for questions based on your experience.</p>}
                <Button onClick={start} disabled={busy || !company.trim() || jobText.trim().length < 100} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Create my 3 questions</Button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold break-words">{quiz.role} · {company}</h2>
                      {result ? (
                        <span className="rounded-full bg-sage/20 px-2.5 py-0.5 text-xs font-semibold text-sage">Submitted</span>
                      ) : (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">Not submitted</span>
                      )}
                    </div>
                    {!result && (
                      <p className="mt-1 text-xs text-muted-foreground">Answer each question below in your own words (at least 20 characters each) and click submit when ready.</p>
                    )}
                  </div>
                  <Button onClick={resetToNew} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    New quiz
                  </Button>
                </div>
                {quiz.questions.map((q, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{i + 1} · {q.kind}</p>
                    <p className="font-medium">{q.question}</p>
                    <textarea aria-label={`Answer ${i + 1}`} value={answers[i]} disabled={!!result} rows={6} maxLength={4000}
                      onPaste={(e) => { e.preventDefault(); setPasted((p) => p.map((x, j) => (j === i ? true : x))); }}
                      onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))} className={field} placeholder="Type in your own words…" />
                    <p className="text-xs text-muted-foreground">{(answers[i] || "").trim().split(/\s+/).filter(Boolean).length} words{pasted[i] && ' · pasting is turned off so answers stay your own'}</p>
                    {result?.perQuestion[i] && <div className="rounded-md bg-muted/60 p-2 text-sm"><b>{Math.round(result.perQuestion[i].score)}/100</b> · <span className="text-sage">✓ {result.perQuestion[i].strengths}</span><br /><span className="text-muted-foreground">Gap: {result.perQuestion[i].gaps}</span></div>}
                  </div>
                ))}
                {result ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-primary p-4 text-primary-foreground">
                      <p className="text-3xl font-semibold">{result.score}/100</p>
                      <p className="text-sm mt-1">{result.summary}</p>
                    </div>
                    <Button onClick={resetToNew} className="flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-4 py-2 text-sm font-medium hover:bg-primary/20">
                      <RotateCcw className="h-4 w-4" /> Start another quiz
                    </Button>
                  </div>
                ) : (
                  <Button onClick={finish} disabled={busy || answers.some((a) => a.trim().length < 20)} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit & get my score
                  </Button>
                )}
              </>
            )}
            {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          </div>
          <aside className="rounded-lg glass p-4 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Your quizzes</h2>
              {quiz && (
                <Button onClick={resetToNew} className="text-xs text-primary underline hover:opacity-80">
                  + New
                </Button>
              )}
            </div>
            {!past.length ? (
              <p className="text-muted-foreground">None yet.</p>
            ) : (
              <ul className="space-y-2">
                {past.map((p) => {
                  const isSelected = quiz?.id === p.id;
                  const isLoadingThis = loadingQuizId === p.id;
                  return (
                    <li key={p.id} className="relative group">
                      <Button
                        onClick={() => openQuiz(p.id)}
                        disabled={isLoadingThis}
                        className={`w-full rounded-md p-2.5 text-left transition-colors border ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border/40 hover:bg-muted/50'
                        }`}
                      >
                        <div className="pr-6">
                          <p className="font-medium truncate">{p.company} · {p.role}</p>
                          <div className="mt-1 flex items-center justify-between text-xs">
                            <span className={p.submitted_at ? 'font-medium text-sage' : 'font-medium text-amber-600 dark:text-amber-400'}>
                              {p.submitted_at ? `Score ${p.score}/100` : 'Not submitted · Resume'}
                            </span>
                            <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {isLoadingThis && (
                          <div className="absolute right-2 top-3">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        )}
                      </Button>
                      {!isLoadingThis && (
                        <Button
                          aria-label={`Delete quiz for ${p.company}`}
                          title="Delete quiz"
                          onClick={(e) => deleteQuiz(e, p.id)}
                          className="absolute right-2 top-2.5 rounded p-1 text-muted-foreground/60 transition-opacity hover:text-destructive hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      )}
    </Shell>
  );
}
