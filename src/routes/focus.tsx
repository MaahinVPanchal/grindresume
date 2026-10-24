import { createFileRoute, Link } from '@tanstack/react-router';
import { Shell } from '@/components/Shell';
import { Search, FileText, MessageCircle, ArrowRight, ExternalLink, ShieldCheck, Ban, Gauge, Building2, Briefcase, FileSearch, CheckCircle2, Upload } from 'lucide-react';
import { pageHead } from '@/lib/seo';

export const Route = createFileRoute('/focus')({
  head: () =>
    pageHead({
      title: 'Our Focus — GrinderResume',
      description: 'GrinderResume researches the company and role, finds the proof in your experience, and tells you what to say — and why.',
      path: '/focus',
    }),
  component: FocusPage,
});

const PILLARS = [
  { Icon: Search, title: 'Know the company', text: 'Tavily reads the live job post, careers pages and recent company news, with links so you can check every fact yourself.', tile: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { Icon: FileText, title: 'Know your proof', text: 'Each requirement is matched to something you have actually done. If the proof is missing, we say so — we never invent experience.', tile: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { Icon: MessageCircle, title: 'Know what to say', text: 'Your chosen Nebius model turns that into one clear message, an editable cover letter and suggested resume edits that change only when you approve them.', tile: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
];

const STEPS = [
  { Icon: Building2, step: 'Pick a company' },
  { Icon: Briefcase, step: 'Choose an open role' },
  { Icon: FileSearch, step: 'See where your resume fits — and where it doesn’t' },
  { Icon: CheckCircle2, step: 'Approve the changes you want, then apply' },
];

const COMPARISON = [
  ['Jobright', 'https://jobright.ai', 'Job discovery, resume improvement, cover letters', 'Company-first, source-linked application evidence'],
  ['Simplify', 'https://simplify.jobs', 'Matching, tailoring and application autofill', 'Understand what to communicate, not automate submissions'],
  ['Teal', 'https://www.tealhq.com', 'Resume matching, cover letters and tracking', 'Explain the specific resume evidence behind each recommendation'],
  ['Huntr', 'https://huntr.co', 'Tailored resumes, cover letters and job tracking', 'One meaningful recommendation rather than repeated variants'],
  ['Careerflow', 'https://www.careerflow.ai', 'Resume optimization and application management', 'Employer context and confirmed personal motivation'],
  ['Indeed', 'https://www.indeed.com', 'Job listings and career-writing guidance', 'Advice grounded in this exact role and candidate'],
  ['Reactive Resume', 'https://rxresu.me', 'Structured editor, templates and preview', 'Editing is foundation, not the differentiator'],
  ['ChatGPT / Claude', 'https://chatgpt.com', 'General research and application writing', 'A continuous company → role → evidence → approval workflow'],
];

const WONT_DO = [
  { Icon: Gauge, title: 'No made-up “ATS scores”', text: 'Scores you can’t verify are theater. We show the requirement, your evidence and the gap instead.', tile: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { Icon: Ban, title: 'No mass auto-applying', text: 'Spraying hundreds of generic applications is the problem, not the solution.', tile: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { Icon: ShieldCheck, title: 'No invented experience', text: 'Your resume only changes when you say so, and never with facts you didn’t provide.', tile: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
];

function FocusPage() {
  return (
    <Shell>
      {/* Hero */}
      <section className="mx-auto max-w-3xl pt-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Our focus</p>
        <h1 className="mt-3 font-display text-5xl leading-tight sm:text-6xl">Apply like you’ve done your homework.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Most tools help you send more applications. GrinderResume helps you send a better one: it studies the company and the role, finds the proof in your own experience, and tells you what to say — and why.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90">
            Research a company <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/resume" className="inline-flex items-center gap-2 rounded-lg glass-strong px-5 py-2.5 text-sm font-medium transition hover:border-foreground/30">
            <Upload className="h-4 w-4" /> Open your resume
          </Link>
        </div>
      </section>

      {/* Pillars */}
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {PILLARS.map(({ Icon, title, text, tile }) => (
          <section key={title} className="rounded-xl glass p-6 transition hover:border-foreground/20">
            <div className={`grid h-10 w-10 place-items-center rounded-lg ${tile}`}><Icon className="h-5 w-5" /></div>
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </section>
        ))}
      </div>

      {/* How it works */}
      <section className="mx-auto mt-16 max-w-5xl border-t border-border/40 pt-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">How it works</h2>
        <ol className="mt-8 grid list-none gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, step }, i) => (
            <li key={step} className="flex flex-col gap-3 rounded-xl glass p-5 transition hover:border-foreground/20">
              <div className="flex items-center justify-between">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{String(i + 1).padStart(2, '0')}</span>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium leading-snug">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Landscape */}
      <section className="mx-auto mt-16 max-w-5xl border-t border-border/40 pt-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Landscape</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">Where we fit</h2>
        <p className="mx-auto mt-3 max-w-3xl text-sm text-muted-foreground">
          Great tools already exist for finding jobs, tracking them and polishing resumes. We focus on the step in between: understanding one employer well enough to make your case. Offerings change — follow each link for current details.
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl glass">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">How GrinderResume’s focus compares with other career platforms</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="px-4 py-3 pr-4 font-medium">Platform</th>
                <th scope="col" className="px-4 py-3 pr-4 font-medium">Overlapping capabilities</th>
                <th scope="col" className="px-4 py-3 font-medium">Our focus instead</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([name, url, coverage, focus]) => (
                <tr key={name} className="border-b transition last:border-b-0 hover:bg-glass-strong/60">
                  <td className="px-4 py-4 pr-4">
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2">
                      {name} <ExternalLink className="h-3 w-3 text-muted-foreground" /><span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </td>
                  <td className="px-4 py-4 pr-4 text-muted-foreground">{coverage}</td>
                  <td className="px-4 py-4">{focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground sm:hidden">Swipe the table sideways to compare →</p>
      </section>

      {/* Principles */}
      <section className="mx-auto mt-16 max-w-5xl border-t border-border/40 pt-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Principles</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">What we won’t do</h2>
        <div className="mt-8 grid gap-4 text-left md:grid-cols-3">
          {WONT_DO.map(({ Icon, title, text, tile }) => (
            <section key={title} className="rounded-xl glass p-6">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tile}`}><Icon className="h-5 w-5" /></div>
                <h3 className="font-semibold leading-snug">{title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </section>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Your resume only changes when you say so. New-role alerts are coming later.</p>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mt-16 max-w-5xl">
        <div className="rounded-xl glass-strong p-8 text-center sm:p-10">
          <h2 className="font-display text-3xl sm:text-4xl">Do the homework once. Reuse it everywhere.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">Pick a company, pick a role, and see exactly what your application is missing.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90">
              Choose a company <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/resume" className="inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-5 py-2.5 text-sm font-medium transition hover:border-foreground/30">
              Open resume workspace
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
