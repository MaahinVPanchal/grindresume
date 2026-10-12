import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";
import { Shell } from "@/components/Shell";
import { searchYC } from "@/lib/research.functions";
import { communityCompanies } from "@/lib/community";
import { Users } from "lucide-react";

export const Route = createFileRoute("/yc")({
  head: () => ({
    meta: [
      { title: "YC Explorer — Grinder" },
      { name: "description", content: "Browse hiring Y Combinator startups and research their open roles." },
      { property: "og:title", content: "YC Explorer — Grinder" },
      { property: "og:description", content: "Browse hiring Y Combinator startups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
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
  const [community, setCommunity] = useState<{ name: string; people: number }[]>([]);
  useEffect(() => { communityCompanies().then(setCommunity).catch(() => setCommunity([])); }, []);
  const ql = q.trim().toLowerCase();
  const shownCommunity = community.filter((c) => !ql || c.name.toLowerCase().includes(ql));

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fn({ data: { q, hiring, industry } }).then((r) => {
        setRes(r);
        setLoading(false);
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hiring, industry]);

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
      <section className="mx-auto mt-6 max-w-6xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-4 w-4" /> Where our users have worked</h2>
        <p className="mt-1 text-xs text-muted-foreground">Companies Grinder members chose to share from their resumes, anonymously.</p>
        {shownCommunity.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{community.length ? "No matches." : "No shared companies yet — share yours from the Resume page."}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {shownCommunity.slice(0, 60).map((c) => (
              <Link key={c.name} to="/company/$name" params={{ name: c.name }} className="rounded-full glass px-3 py-1.5 text-sm transition hover:bg-glass-strong">
                {c.name}{c.people >= 3 && <span className="ml-1.5 text-xs text-muted-foreground">{c.people}</span>}
              </Link>
            ))}
          </div>
        )}
      </section>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {loading ? "Loading…" : res?.ok ? `${res.total} companies${res.total > 60 ? " · showing 60" : ""}` : res?.error}
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
            to="/company/$name"
            params={{ name: c.name }}
            search={{ domain: c.website }}
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
    </Shell>
  );
}
