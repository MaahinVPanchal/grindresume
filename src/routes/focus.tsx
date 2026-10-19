import { createFileRoute, Link } from '@tanstack/react-router';
import { Shell } from '@/components/Shell';
import { Search, FileText, MessageCircle, ArrowRight } from 'lucide-react';
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
function FocusPage(){return <Shell>
  <section className="max-w-3xl py-9"><p className="text-xs font-semibold uppercase text-muted-foreground">Our focus</p><h1 className="mt-3 font-display text-5xl">Apply like you’ve done your homework.</h1><p className="mt-5 text-lg">Most tools help you send more applications. GrinderResume helps you send a better one: it studies the company and the role, finds the proof in your own experience, and tells you what to say — and why.</p></section>
  <div className="grid gap-6 border-y py-7 md:grid-cols-3">{[{Icon:Search,title:'Know the company',text:'Tavily reads the live job post, careers pages and recent company news, with links so you can check every fact yourself.'},{Icon:FileText,title:'Know your proof',text:'Each requirement is matched to something you have actually done. If the proof is missing, we say so — we never invent experience.'},{Icon:MessageCircle,title:'Know what to say',text:'Your chosen Nebius model turns that into one clear message, an editable cover letter and suggested resume edits that change only when you approve them.'}].map(({Icon,title,text})=><section key={title}><Icon className="mb-3 h-5 w-5"/><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></section>)}</div>
  <section className="py-8"><h2 className="font-display text-3xl">How it works</h2><ol className="mt-5 grid gap-4 text-sm sm:grid-cols-4">{['Pick a company','Choose an open role','See where your resume fits — and where it doesn’t','Approve the changes you want, then apply'].map((step,i)=><li key={step} className="rounded-lg glass p-4"><span className="text-xs font-semibold text-muted-foreground">Step {i+1}</span><p className="mt-1 font-medium">{step}</p></li>)}</ol></section>
  <section className="py-8"><h2 className="font-display text-3xl">Where we fit</h2><p className="mt-3 max-w-3xl text-sm text-muted-foreground">Great tools already exist for finding jobs, tracking them and polishing resumes. We focus on the step in between: understanding one employer well enough to make your case. Offerings change — follow each link for current details.</p><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3 pr-4">Platform</th><th className="py-3 pr-4">Overlapping capabilities</th><th className="py-3">Our focus instead</th></tr></thead><tbody>{[
    ['Jobright','https://jobright.ai','Job discovery, resume improvement, cover letters','Company-first, source-linked application evidence'],
    ['Simplify','https://simplify.jobs','Matching, tailoring and application autofill','Understand what to communicate, not automate submissions'],
    ['Teal','https://www.tealhq.com','Resume matching, cover letters and tracking','Explain the specific resume evidence behind each recommendation'],
    ['Huntr','https://huntr.co','Tailored resumes, cover letters and job tracking','One meaningful recommendation rather than repeated variants'],
    ['Careerflow','https://www.careerflow.ai','Resume optimization and application management','Employer context and confirmed personal motivation'],
    ['Indeed','https://www.indeed.com','Job listings and career-writing guidance','Advice grounded in this exact role and candidate'],
    ['Reactive Resume','https://rxresu.me','Structured editor, templates and preview','Editing is foundation, not the differentiator'],
    ['ChatGPT / Claude','https://chatgpt.com','General research and application writing','A continuous company → role → evidence → approval workflow'],
  ].map(([name,url,coverage,focus])=><tr key={name} className="border-b"><td className="py-4 pr-4"><a href={url} target="_blank" rel="noreferrer" className="underline">{name}</a></td><td className="py-4 pr-4 text-muted-foreground">{coverage}</td><td className="py-4">{focus}</td></tr>)}</tbody></table></div></section>
  <section className="border-t py-6"><h2 className="text-lg font-semibold">What we won’t do</h2><p className="mt-3 max-w-3xl text-sm text-muted-foreground">No made-up “ATS scores”, no mass auto-applying and no invented experience. Your resume only changes when you say so. New-role alerts are coming later.</p><Link to="/" className="mt-5 inline-flex items-center gap-2 text-sm font-medium">Choose a company <ArrowRight className="h-4 w-4"/></Link></section>
  </Shell>;}