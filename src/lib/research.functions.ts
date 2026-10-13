import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NEBIUS_BASES = ["https://api.tokenfactory.nebius.com/v1", "https://api.studio.nebius.com/v1"];

function tavilyKey(k?: string) {
  const key = k || process.env["TAVILY_API_KEY"];
  if (!key) throw new Error("Add your Tavily API key in Settings first.");
  return key;
}

async function tavily(path: string, key: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.tavily.com/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 401) throw new Error("Tavily rejected this API key.");
    if (res.status === 432 || res.status === 433) throw new Error("Tavily usage limit reached for this key.");
    throw new Error(`Tavily error ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

type TResult = { title: string; url: string; content: string; score?: number; published_date?: string };

const JOB_BOARDS = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "workdayjobs.com",
  "myworkdayjobs.com",
  "smartrecruiters.com",
  "workatastartup.com",
  "ycombinator.com",
];

export const validateTavily = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ apiKey: z.string().min(5) }).parse(d))
  .handler(async ({ data }) => {
    try {
      await tavily("search", data.apiKey, { query: "tavily", max_results: 1 });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });

export const findCareers = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        apiKey: z.string().optional(),
        company: z.string().min(1).max(120),
        domain: z.string().max(200).optional(),
        title: z.string().max(120).optional(),
        location: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const key = tavilyKey(data.apiKey);
      const { rejectReason, careerHost, matcher } = await import("./role-match");
      const { harvestCareersPage, atsBoards, atsJobs, rankRoles } = await import("./careers-harvest.server");
      const company = data.company.trim();
      const domain = data.domain?.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      const role = [data.title, data.location].filter(Boolean).join(" ");
      const kw = role || "jobs";
      type Role = { title: string; url: string; snippet: string; source: string; published: string | null };
      // Stage 1: official careers portal
      const official = await tavily("search", key, {
        query: `${company} official careers page jobs`,
        max_results: 6,
        include_answer: "basic",
        ...(domain ? { include_domains: [domain, `careers.${domain}`, `jobs.${domain}`] } : {}),
      });
      const officialResults = (official.results || []) as TResult[];
      const portal = careerHost(officialResults, company, domain);
      const own = [portal, domain].filter(Boolean) as string[];
      const ok = matcher(company, domain);

      // Stage 2: read the official careers page directly and collect every listed posting (plus embedded ATS boards).
      const pages = new Set<string>();
      for (const r of officialResults) {
        try {
          const u = new URL(r.url);
          const h = u.hostname.replace(/^www\./, "");
          if (ok(h.split(".").slice(0, -1).join(" ")) && /career|jobs/i.test(h + u.pathname) && u.pathname.split("/").filter(Boolean).length <= 1) pages.add(`${u.origin}${u.pathname}`);
        } catch { /* ignore */ }
      }
      if (domain) { pages.add(`https://${domain}/careers`); pages.add(`https://www.${domain}/careers`); }
      const harvested: Role[] = [];
      for (const p of [...pages].slice(0, 3)) {
        const got = await harvestCareersPage(p).catch(() => [] as Role[]);
        for (const r of got) if (!harvested.some((x) => x.url === r.url)) harvested.push(r);
        if (harvested.length >= 20) break;
      }
      // Fallback: Tavily map of the careers site when the page renders its list in the browser only.
      if (harvested.length < 5 && pages.size) {
        const start = [...pages][0]!;
        const m = await tavily("map", key, { url: start, max_depth: 2, limit: 120 }).catch(() => null);
        for (const u of ((m?.results || []) as string[])) {
          try {
            const x = new URL(u), segs = x.pathname.split("/").filter(Boolean);
            if (segs.length >= 2 && /^(careers?|jobs?|positions?|openings?|roles?)$/i.test(segs[0] ?? "") && !harvested.some((h) => h.url === u))
              harvested.push({ title: (segs[segs.length - 1] ?? "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), url: u, snippet: "", source: x.hostname.replace(/^www\./, ""), published: null });
          } catch { /* ignore */ }
        }
      }

      // Stage 3: quoted searches only when the official page gave too few postings.
      let searched: TResult[] = [];
      if (harvested.length < 20) {
        const [site, ats] = await Promise.all([
          own.length
            ? tavily("search", key, { query: `"${company}" ${kw} job opening`, max_results: 10, search_depth: "advanced", include_domains: own })
            : Promise.resolve({ results: [] }),
          tavily("search", key, {
            query: `"${company}" (job OR career OR opening) ${kw}`,
            max_results: 15,
            search_depth: "advanced",
            include_domains: JOB_BOARDS,
            exclude_domains: ["glassdoor.com", "indeed.com"],
          }),
        ]);
        searched = ([...(site.results || []), ...(ats.results || [])] as TResult[]).filter((r) => !rejectReason(r, company, domain));
        // Pull complete boards from verified ATS slugs found in search results.
        const boards = atsBoards(searched.map((r) => r.url).join(" ")).filter((b) => ok(b.slug)).slice(0, 2);
        for (const b of boards) for (const r of await atsJobs(b.kind, b.slug).catch(() => [] as Role[])) if (!harvested.some((h) => h.url === r.url)) harvested.push(r);
      }

      const seen = new Set<string>(harvested.map((r) => r.url.split("?")[0] ?? r.url));
      const fromSearch: Role[] = searched
        .filter((r) => {
          const u = r.url.split("?")[0] ?? r.url;
          try { if (new URL(u).pathname.split("/").filter(Boolean).length < 2) return false; } catch { return false; }
          if (seen.has(u)) return false;
          seen.add(u);
          return true;
        })
        .map((r) => ({ title: r.title, url: r.url, snippet: r.content?.slice(0, 400) || "", source: new URL(r.url).hostname.replace(/^www\./, ""), published: r.published_date || null }));
      const roles = rankRoles([...harvested, ...fromSearch], data.title, data.location).slice(0, 150);
      return {
        ok: true as const,
        answer: (official.answer as string) || null,
        careerPages: officialResults.map((r) => ({ title: r.title, url: r.url, snippet: r.content?.slice(0, 260) || "" })),
        roles,
        officialCount: harvested.length,
        checkedAt: new Date().toISOString(),
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });

export const extractPage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ apiKey: z.string().optional(), url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const r = await tavily("extract", tavilyKey(data.apiKey), { urls: [data.url] });
      const first = r.results?.[0];
      if (!first) return { ok: false as const, error: "That page could not be read." };
      return { ok: true as const, content: String(first.raw_content || "").slice(0, 12000) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });

/* ---------------- YC ---------------- */
type YC = {
  id: number;
  name: string;
  slug: string;
  website: string;
  small_logo_thumb_url: string;
  one_liner: string;
  batch: string;
  industry: string;
  all_locations: string;
  team_size: number | null;
  isHiring: boolean;
  status: string;
};
let ycCache: { at: number; data: YC[] } | null = null;

export const searchYC = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        q: z.string().max(100).default(""),
        hiring: z.boolean().default(true),
        industry: z.string().max(60).default(""),
        page: z.number().int().min(1).max(500).default(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      if (!ycCache || Date.now() - ycCache.at > 6 * 3600_000) {
        const res = await fetch("https://yc-oss.github.io/api/companies/all.json");
        if (!res.ok) throw new Error("YC directory unavailable");
        ycCache = { at: Date.now(), data: await res.json() };
      }
      const q = data.q.toLowerCase().trim();
      const list = ycCache.data.filter(
        (c) =>
          c.status !== "Inactive" &&
          (!data.hiring || c.isHiring) &&
          (!data.industry || c.industry === data.industry) &&
          (!q ||
            c.name.toLowerCase().includes(q) ||
            (c.one_liner || "").toLowerCase().includes(q) ||
            (c.industry || "").toLowerCase().includes(q)),
      );
      const industries = Array.from(new Set(ycCache.data.map((c) => c.industry).filter(Boolean))).sort();
      return {
        ok: true as const,
        total: list.length,
        industries,
        page: data.page,
        pageSize: 60,
        companies: list.slice((data.page - 1) * 60, data.page * 60).map((c) => ({
          name: c.name,
          slug: c.slug,
          website: c.website,
          logo: c.small_logo_thumb_url,
          oneLiner: c.one_liner,
          batch: c.batch,
          industry: c.industry,
          location: c.all_locations,
          teamSize: c.team_size,
          hiring: c.isHiring,
        })),
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message, companies: [], industries: [], total: 0 };
    }
  });

/* ---------------- Nebius ---------------- */
export const listNebiusModels = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ apiKey: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const key = data.apiKey || process.env["NEBIUS_API_KEY"];
    if (!key) return { ok: false as const, error: "Add your Nebius API key in Settings.", models: [] };
    let lastErr = "";
    for (const base of NEBIUS_BASES) {
      try {
        const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
        if (!res.ok) {
          lastErr = res.status === 401 ? "Nebius rejected this API key." : `Nebius error ${res.status}`;
          continue;
        }
        const j = await res.json();
        const models = ((j.data || []) as { id: string }[]).map((m) => m.id).sort();
        return { ok: true as const, models };
      } catch (e) {
        lastErr = (e as Error).message;
      }
    }
    return { ok: false as const, error: lastErr, models: [] };
  });
