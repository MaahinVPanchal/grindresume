import { companyLink } from "@/lib/company-slug";
import { Button } from "@/components/Button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Globe, MapPin, Briefcase, Search, Upload, ArrowRight, Github, Linkedin, Youtube, Sparkles, FileCheck2, ChevronDown, Check, X, Microscope, Scale } from "lucide-react";

const STEPS = [
  { icon: Search, title: "Find live roles", text: "Pick any company. We read its official careers page and job boards directly.", example: "Cursor → 270 open roles" },
  { icon: Microscope, title: "Learn what they want", text: "Get the real requirements and team context from the company's own sources.", example: "Skills, team, expectations" },
  { icon: Scale, title: "Check your fit", text: "Compare your resume to the role: what matches, and honest gaps.", example: "Match score + gaps" },
  { icon: FileCheck2, title: "Tailor & download", text: "Polish your bullets and download a PDF or Word file that looks exactly like the preview.", example: "PDF · Word" },
];

const COMPARE = [
  { label: "Never invents experience", hint: "Every suggestion uses your real resume", v: [true, false, true] },
  { label: "Live roles from the company itself", hint: "Official careers pages, Greenhouse, Lever, Ashby", v: [true, false, false] },
  { label: "Explains what the employer wants", hint: "Grounded in sources, not guesses", v: [true, false, false] },
  { label: "Resume editor with matching PDF & Word", hint: "What you see is what you send", v: [true, false, false] },
  { label: "Free to start, no keys needed", hint: "Sign up for 3 free checks a day", v: [true, true, true] },
];
import { Shell, DevpostIcon } from "@/components/Shell";
import { CompanyTicker } from "@/components/CompanyTicker";
import { CommunityCatalog } from "@/components/CommunityCatalog";
import { FeaturedCatalog } from "@/components/FeaturedCatalog";
import { resolveCompany } from "@/lib/role-match";

const FAQ_ITEMS = [
  {
    q: "What is GrinderResume?",
    a: "GrinderResume is a research-grounded career intelligence platform and private resume editor. Instead of mass-spamming generic applications or hallucinating credentials, GrinderResume studies specific employers and live job postings via Tavily and public ATS systems, discovers true requirements, and helps you tailor your resume strictly using your verified real-world experience.",
  },
  {
    q: "How does the free demo mode work?",
    a: "Sign up free to get 3 checks daily without needing your own API keys. Free checks are tied to your account and processed on the server using owner-scoped Nebius AI (powered by Llama 3.3 70B) and Tavily search, bounded by privacy-safe daily limits. Private keys and tokens never leave the server or reach visitor browsers.",
  },
  {
    q: "Can I connect my own API keys?",
    a: "Yes. In the Settings modal ('Connect keys'), you can add your own free Nebius and Tavily API keys anytime. When your own keys are connected, usage is unlimited and calls run directly with your preferred models.",
  },
  {
    q: "Does GrinderResume invent or fabricate experience on my resume?",
    a: "No, never. We have a strict zero-hallucination policy. GrinderResume never invents achievements, metrics, companies, or responsibilities. Every recommendation explains the exact requirement from the job posting and maps to actual candidate evidence.",
  },
  {
    q: "How do resume formatting and exports work?",
    a: "GrinderResume maintains a single validated resume state across the structured editor, paginated preview, and file downloads. You can export pixel-perfect, ATS-compliant PDF and Word (.docx) files that share identical pagination and geometry without formatting divergence.",
  },
  {
    q: "Which company careers pages and ATS platforms are supported?",
    a: "GrinderResume searches official company careers portals and directly scans major ATS boards including Greenhouse, Lever, Ashby, Workable, SmartRecruiters, and Workday, with intelligent live search fallback powered by Tavily.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "GrinderResume — Grounded Career Intelligence & AI Resume Workspace",
      description:
        "Research companies and live open roles with Tavily, extract exact employer requirements, and tailor ATS-ready resumes with private server-grounded AI.",
      path: "/",
    }),
  component: Index,
});

function Index() {
  const nav = useNavigate();
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  const go = (name: string, domain?: string) =>
    nav({ ...companyLink(name, domain), search: { title: title || undefined, location: location || undefined } });

  return (
    <Shell>
      <section className="mx-auto max-w-4xl pt-5 text-center">
        <p className="inline-flex items-center gap-2 rounded-full glass-strong px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> GrinderResume · Built for the Nebius × NVIDIA AI Hackathon
        </p>
        <h1 className="mt-4 font-display text-5xl leading-tight tracking-normal sm:text-6xl">
          Apply to fewer jobs.<br />Get more interviews.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          See every open role straight from the company, learn what they really want, and tailor your resume using only
          your real experience — never invented.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/resume" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90">
            Sign up free — 3 checks a day <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/resume" className="inline-flex h-11 items-center gap-2 rounded-lg glass-strong px-5 text-sm font-medium transition hover:bg-muted">
            <Upload className="h-4 w-4" /> Upload resume
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <a
            href="https://github.com/MaahinVPanchal/grindresume"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              try {
                if (window.self !== window.top) {
                  e.preventDefault();
                  window.open("https://github.com/MaahinVPanchal/grindresume", "_blank", "noopener,noreferrer");
                }
              } catch {
                e.preventDefault();
                window.open("https://github.com/MaahinVPanchal/grindresume", "_blank", "noopener,noreferrer");
              }
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full glass-strong px-4 py-2 text-xs font-medium hover:border-foreground/30 transition shadow-sm text-foreground hover:bg-muted"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
          <a
            href="https://devpost.com/software/grinderresume"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              try {
                if (window.self !== window.top) {
                  e.preventDefault();
                  window.open("https://devpost.com/software/grinderresume", "_blank", "noopener,noreferrer");
                }
              } catch {
                e.preventDefault();
                window.open("https://devpost.com/software/grinderresume", "_blank", "noopener,noreferrer");
              }
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full glass-strong px-4 py-2 text-xs font-medium hover:border-foreground/30 transition shadow-sm text-teal-600 dark:text-teal-400 hover:bg-muted"
          >
            <DevpostIcon className="h-4 w-4" />
            <span>Devpost</span>
          </a>
          <a
            href="https://www.youtube.com/watch?v=83adL-GZ4IY"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              try {
                if (window.self !== window.top) {
                  e.preventDefault();
                  window.open("https://www.youtube.com/watch?v=83adL-GZ4IY", "_blank", "noopener,noreferrer");
                }
              } catch {
                e.preventDefault();
                window.open("https://www.youtube.com/watch?v=83adL-GZ4IY", "_blank", "noopener,noreferrer");
              }
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full glass-strong px-4 py-2 text-xs font-medium hover:border-foreground/30 transition shadow-sm text-red-600 dark:text-red-400 hover:bg-muted"
          >
            <Youtube className="h-4 w-4" />
            <span>Demo Video</span>
          </a>
          <a
            href="https://www.linkedin.com/feed/update/urn:li:activity:7516032835724484609/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              try {
                if (window.self !== window.top) {
                  e.preventDefault();
                  window.open("https://www.linkedin.com/feed/update/urn:li:activity:7516032835724484609/", "_blank", "noopener,noreferrer");
                }
              } catch {
                e.preventDefault();
                window.open("https://www.linkedin.com/feed/update/urn:li:activity:7516032835724484609/", "_blank", "noopener,noreferrer");
              }
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full glass-strong px-4 py-2 text-xs font-medium hover:border-foreground/30 transition shadow-sm text-blue-600 dark:text-blue-400 hover:bg-muted"
          >
            <Linkedin className="h-4 w-4" />
            <span>LinkedIn</span>
          </a>
        </div>
      </section>

      <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-between gap-4 border-y border-border py-4 text-left">
        <div className="flex items-center gap-3"><Upload className="h-5 w-5 text-muted-foreground"/><div><p className="text-sm font-semibold">Make your next application count.</p><p className="text-xs text-muted-foreground">Your resume, ready for the right opportunity.</p></div></div>
        <Link to="/resume" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Upload resume <ArrowRight className="h-4 w-4"/></Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (company.trim()) {
            const known = resolveCompany(company);
            const isUrl = company.includes(".");
            if (known) void go(known.name, known.domain);
            else void go(isUrl ? company.replace(/^https?:\/\//, "").split(".")[0] ?? company : company.trim(), isUrl ? company : undefined);
          }
        }}
        className="mx-auto mt-7 max-w-4xl space-y-4 rounded-lg glass p-5 text-left"
      >
        <label className="text-sm font-medium">Company name or website</label>
        <div className="flex items-center gap-3 rounded-lg bg-glass-strong px-4">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Which company are you curious about?"
            className="h-14 flex-1 bg-transparent outline-none"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field icon={<Briefcase className="h-4 w-4" />} label="Job title" value={title} onChange={setTitle} ph="e.g. Product Designer" />
          <Field icon={<MapPin className="h-4 w-4" />} label="Location" value={location} onChange={setLocation} ph="e.g. Remote, London" />
        </div>
        <Button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 font-medium text-primary-foreground transition hover:opacity-90">
          <Search className="h-4 w-4" /> Find Careers & Open Roles
        </Button>
      </form>

      <CompanyTicker onSelect={go} />
      <FeaturedCatalog query={company.includes('.') ? '' : company}/>
      <CommunityCatalog query={company.includes('.') ? '' : company}/>
      <p className="mt-6 text-center text-sm">
        <Link to="/yc" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Globe className="h-4 w-4" /> Or explore hiring Y Combinator startups →
        </Link>
      </p>

      {/* How it works */}
      <section className="mx-auto mt-20 max-w-5xl border-t border-border/40 pt-12 text-left">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">How GrinderResume Works</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">From a company name to a tailored, ready-to-send resume in four steps.</p>
        </div>
        <ol className="relative mt-10 grid gap-8 lg:grid-cols-4 lg:gap-4">
          <div aria-hidden className="absolute left-5 top-5 bottom-5 w-px bg-border lg:left-[12.5%] lg:right-[12.5%] lg:top-5 lg:bottom-auto lg:h-px lg:w-auto" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center">
              <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step {i + 1}</p>
                <h3 className="mt-1 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
                <p className="mt-3 inline-block rounded-md glass-strong px-2.5 py-1 text-[11px] font-medium">{s.example}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Why GrinderResume */}
      <section className="mx-auto mt-20 max-w-5xl border-t border-border/40 pt-12 text-left">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Differentiators</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Why GrinderResume</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">One thoughtful application that gets interviews beats 500 mass blasts.</p>
        </div>
        <div className="mt-8 overflow-x-auto rounded-xl glass">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground"> </th>
                <th className="p-4 text-center font-semibold">GrinderResume</th>
                <th className="p-4 text-center font-medium text-muted-foreground">ChatGPT</th>
                <th className="p-4 text-center font-medium text-muted-foreground">Job boards</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label} className="border-b border-border/50 last:border-0">
                  <td className="p-4"><p className="font-medium">{r.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{r.hint}</p></td>
                  {r.v.map((ok, j) => (
                    <td key={j} className={`p-4 text-center ${j === 0 ? "bg-primary/5" : ""}`}>
                      {ok ? <Check className="mx-auto h-5 w-5 text-primary" /> : <X className="mx-auto h-5 w-5 text-muted-foreground/60" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="mx-auto mt-20 max-w-4xl text-left border-t border-border/40 pt-12 mb-12">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Answers</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Frequently Asked Questions</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Everything you need to know about GrinderResume, demo checks, privacy, and resume tailoring.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group rounded-xl glass p-4 transition open:bg-glass-strong">
              <summary className="flex cursor-pointer items-center justify-between font-medium text-sm text-foreground list-none">
                <span>{item.q}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        {/* Structured Data (JSON-LD) for Search Console FAQ Rich Snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </section>
    </Shell>
  );
}

function Field({ icon, label, value, onChange, ph }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; ph: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm font-medium">
        {label} <span className="text-xs font-normal text-muted-foreground">Optional</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 text-muted-foreground">
        {icon}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none" />
      </div>
    </div>
  );
}
