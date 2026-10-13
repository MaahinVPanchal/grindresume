import { Button } from "@/components/Button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, RefreshCw, ArrowLeft, FileText, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Shell } from "@/components/Shell";
import { ChatPanel } from "@/components/ChatPanel";
import { useKeys } from "@/lib/keys";
import { findCareers, extractPage } from "@/lib/research.functions";
import { logoFor, cleanDomain } from "@/lib/companies";
import { SaveRole } from '@/components/SaveRole';
import { ApplicationBrief } from '@/components/ApplicationBrief';

const search = z.object({
  domain: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
});

export const Route = createFileRoute("/company/$name")({
  validateSearch: search,
  head: ({ params }) => ({
    meta: [
      { title: `${params.name} careers & open roles — Grinder` },
      { name: "description", content: `Official careers pages and current open roles at ${params.name}, researched live with Tavily.` },
      { property: "og:title", content: `${params.name} careers — Grinder` },
      { property: "og:description", content: `Research open roles at ${params.name}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyPage,
});

type Result = Awaited<ReturnType<typeof findCareers>>;

function CompanyPage() {
  const { name } = Route.useParams();
  const { domain, title, location } = Route.useSearch();
  const keys = useKeys();
  const find = useServerFn(findCareers);
  const extract = useServerFn(extractPage);
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [briefContext,setBriefContext]=useState('');
  const [trigger,setTrigger]=useState<{ id: number; mode: 'explore' | 'match'; text: string; target: string; url: string }>();
  const [selected, setSelected] = useState<{ url: string; title: string; content?: string; loading?: boolean; error?: string } | null>(null);

  async function run() {
    if (!keys.tavily) return;
    setLoading(true);
    setRes(await find({ data: { apiKey: keys.tavily, company: name, domain: cleanDomain(domain), title, location } }));
    setLoading(false);
  }
  useEffect(() => {
    setRes(null);
    setSelected(null);
    setBriefContext('');
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.tavily, name, domain, title, location]);

  async function open(url: string, t: string) {
    setBriefContext('');
    setSelected({ url, title: t, loading: true });
    const r = await extract({ data: { apiKey: keys.tavily, url } });
    setSelected(r.ok ? { url, title: t, content: r.content } : { url, title: t, error: r.error });
  }

  const roles = res?.ok ? res.roles.filter((r) => (r.title + r.snippet).toLowerCase().includes(filter.toLowerCase())) : [];

  const context = useMemo(() => {
    if (!res?.ok) return `Company: ${name}`;
    const parts = [
      `Company: ${name}${domain ? ` (${domain})` : ""}. Filters: title=${title || "any"}, location=${location || "any"}.`,
      res.answer ? `Tavily summary: ${res.answer}` : "",
      "Career pages:\n" + res.careerPages.map((p) => `- ${p.title} ${p.url}: ${p.snippet}`).join("\n"),
      "Discovered listings:\n" + res.roles.map((r) => `- ${r.title} ${r.url}: ${r.snippet}`).join("\n"),
      selected?.content ? `Selected page (${selected.url}):\n${selected.content.slice(0, 8000)}` : "",
      briefContext ? `Application brief based on candidate resume: ${briefContext}` : '',
    ];
    return parts.filter(Boolean).join("\n\n");
  }, [res, selected, name, domain, title, location,briefContext]);

  return (
    <Shell>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-5">
            <div className="flex min-w-0 items-center gap-4">
              <Link to="/" className="text-muted-foreground hover:text-foreground" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              {domain && <img src={logoFor(cleanDomain(domain))} alt="" className="h-10 w-10 rounded-lg bg-glass-strong p-1.5" />}
              <div>
                <h1 className="font-display break-words text-4xl leading-tight">{name}</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[title, location].filter(Boolean).join(" · ") || "All roles"}
                  {res?.ok && ` · checked ${new Date(res.checkedAt).toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            <Button
              onClick={run}
              disabled={loading || !keys.tavily}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {!keys.tavily && (
            <Notice>Connect your Tavily key (top right) to research this company's open roles.</Notice>
          )}
          {loading && (
            <div className="flex items-center gap-3 rounded-lg glass p-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Searching official careers pages and job boards…
            </div>
          )}
          {res && !res.ok && <Notice>{res.error}</Notice>}

          {res?.ok && (
            <>
              <section className="rounded-lg p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Official career pages</h2>
                {res.answer && <p className="mb-4 text-sm leading-relaxed">{res.answer}</p>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {res.careerPages.map((p) => (
                    <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="group rounded-lg bg-glass-strong p-3 text-sm hover:bg-accent">
                      <div className="flex items-center justify-between gap-2 font-medium">
                        <span className="line-clamp-1">{p.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{p.url}</div>
                    </a>
                  ))}
                </div>
              </section>

              <section className="rounded-lg p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Discovered listings ({roles.length})
                  </h2>
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter…"
                    className="h-9 rounded-lg bg-muted px-3 text-sm outline-none"
                  />
                </div>
                {roles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No listings found on public job boards. Try the official career pages above.
                  </p>
                )}
                <div className="space-y-2">
                  {roles.map((r) => (
                    <div key={r.url} className={`rounded-lg bg-glass-strong p-4 ${selected?.url === r.url ? "ring-2 ring-ring" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{r.title}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {r.source}
                            {r.published ? ` · published ${r.published}` : " · date not stated · unverified"}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.snippet}</p>
                       <div className="mt-3 flex flex-wrap gap-2 text-xs">
                         <SaveRole company={name} title={r.title} url={r.url}/>
                        <Button onClick={() => { open(r.url, r.title); setTrigger({ id: Date.now(), mode: 'explore', target: `${r.title} at ${name}`, url: r.url, text: `Explore the role: ${r.title} at ${name} (${r.url}). Break down the core roles and responsibilities, day-to-day expectations, required technical stack/skills, and what the hiring team looks for.` }); }} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-primary-foreground">
                          <FileText className="h-3.5 w-3.5" /> Explore role
                        </Button>
                        <Button onClick={() => setTrigger({ id: Date.now(), mode: 'match', target: `${r.title} at ${name}`.slice(0,280), url: r.url, text: `Match my resume against ${r.title} at ${name} (${r.url}): 1. Matching Responsibilities & Skills: What specific roles and achievements from my resume align with this job? 2. Fit Assessment & Gaps: Am I a strong, moderate, or stretch fit? What crucial requirements am I missing? 3. Actionable Practice Plan: Exactly what technical topics, case questions, or portfolio work should I practice to bridge the gaps and ace the interview?` })} className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5">Match my resume</Button>
                        <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5">
                          <ExternalLink className="h-3.5 w-3.5" /> Source
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {selected && (
                <section className="rounded-lg p-5">
                  <h2 className="font-medium">{selected.title}</h2>
                  <a href={selected.url} target="_blank" rel="noreferrer" className="break-all text-xs text-muted-foreground underline">
                    {selected.url}
                  </a>
                  {selected.loading && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Extracting the job description…
                    </p>
                  )}
                  {selected.error && <p className="mt-3 text-sm text-destructive">{selected.error}</p>}
                  {selected.content && (
                    <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {selected.content}
                    </pre>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">This page is now shared with the assistant →</p>
                  <ApplicationBrief key={selected.url} company={name} role={selected.title} job={selected.content||selected.url} onContext={setBriefContext}/>
                </section>
              )}
            </>
          )}
        </div>
        <ChatPanel
          key={name}
          className="h-[calc(100vh-7rem)] lg:sticky lg:top-4"
           title={selected?'Career Copilot · selected role':`Career Copilot · ${name}`}
          context={context}
          trigger={trigger}
          suggestions={[
             selected?'Which of my projects should I emphasize?':`Find the latest sourced roles at ${name}.`,
             selected?'What should my cover letter communicate?':`What is ${name} currently working on?`,
             selected?'Help me explain why this company interests me.':`Which teams at ${name} have relevant openings?`,
          ]}
        />
      </div>
    </Shell>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-5 text-sm">
      <AlertCircle className="h-5 w-5 text-muted-foreground" /> {children}
    </div>
  );
}
