import { companyLink } from "@/lib/company-slug";
import { cleanDomain } from "@/lib/companies";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";
import { Shell } from "@/components/Shell";
import { searchYC } from "@/lib/research.functions";
import { Button } from "@/components/Button";
import { CommunityCatalog } from "@/components/CommunityCatalog";
import { FeaturedCatalog } from "@/components/FeaturedCatalog";

import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/yc")({
  head: () =>
    pageHead({
      title: "YC Explorer — GrinderResume",
      description: "Browse hiring Y Combinator startups and research their open roles with live Tavily research.",
      path: "/yc",
    }),
  component: YCPage,
});

type R = Awaited<ReturnType<typeof searchYC>>;

function YCPage() {
  const fn = useServerFn(searchYC);
  const [q, setQ] = useState("");
  const [hiring, setHiring] = useState(true);
  const [industry, setIndustry] = useState("");
  const [res, setRes] = useState<R | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q, hiring, industry]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fn({ data: { q, hiring, industry, page } }).then((r) => {
        setRes(r);
        setLoading(false);
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hiring, industry, page]);

  const pages = res?.ok ? Math.max(1, Math.ceil(res.total / 60)) : 1;
  const go = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <Shell>
      <section className="pt-4 text-center">
        <span className="rounded-full bg-yc px-3 py-1 text-xs font-semibold text-primary-foreground">Y Combinator</span>
        <h1 className="mt-4 font-display text-5xl sm:text-6xl">Explore YC startups</h1>
        <p className="mt-2 text-muted-foreground">Pick a company to research its open roles with Tavily.</p>
      </section>
      <div className="mx-auto mt-8 flex max-w-4xl flex-wrap gap-2 rounded-lg glass p-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg bg-glass-strong px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, product or industry…" className="h-11 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-11 max-w-full rounded-lg bg-glass-strong px-3 text-sm outline-none">
          <option value="">All industries</option>
          {res?.industries.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <label className="flex h-11 items-center gap-2 rounded-lg bg-glass-strong px-3 text-sm">
          <input type="checkbox" checked={hiring} onChange={(e) => setHiring(e.target.checked)} /> Hiring only
        </label>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {loading ? "Loading…" : res?.ok ? `${res.total} companies${res.total > 60 ? ` · showing ${(page - 1) * 60 + 1}–${Math.min(page * 60, res.total)}` : ""}` : res?.error}
      </p>
      {loading && !res && (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {res?.companies.map((c) => (
          <Link
            key={c.slug}
            {...companyLink(c.name, cleanDomain(c.website))}
            className="group rounded-lg glass p-4 transition hover:-translate-y-0.5 hover:bg-glass-strong"
          >
            <div className="flex items-center gap-3">
              <img src={c.logo} alt="" className="h-11 w-11 rounded-lg bg-glass-strong object-contain" loading="lazy" />
              <div className="min-w-0">
                <div className="truncate font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.batch} · {c.industry}
                </div>
              </div>
              {c.hiring && <span className="ml-auto rounded-full bg-sage px-2 py-0.5 text-[10px] font-medium">Hiring</span>}
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.oneLiner}</p>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span className="truncate">{c.location || "—"}</span>
              {c.teamSize ? <span>{c.teamSize} people</span> : null}
            </div>
          </Link>
        ))}
      </div>
      {res?.ok && pages > 1 && (
        <nav aria-label="YC pages" className="mt-6 flex items-center justify-center gap-3 text-sm">
          <Button disabled={page <= 1 || loading} onClick={() => go(page - 1)}>Previous</Button>
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <Button disabled={page >= pages || loading} onClick={() => go(page + 1)}>Next</Button>
        </nav>
      )}
      <FeaturedCatalog query={q}/>
      <CommunityCatalog query={q}/>
    </Shell>
  );
}
