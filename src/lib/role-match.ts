import { FEATURED } from "./companies";

const STOP = new Set(["and", "the", "inc", "llc", "ltd", "co", "corp", "corporation", "company", "group", "plc", "limited", "technologies", "labs"]);

/** "Jp morgan and chase" -> "jpmorganchase" */
export const companyKey = (s: string) =>
  s.toLowerCase().replace(/&/g, " ").split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).join("");

const domainRoot = (d?: string) => (d || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.split(".")[0] ?? "";

/** Fuzzy-resolve typed text to a known company name + domain. */
export function resolveCompany(input: string): { name: string; domain: string } | null {
  const k = companyKey(input);
  if (k.length < 2) return null;
  for (const [name, domain] of FEATURED) {
    const nk = companyKey(name), dk = domainRoot(domain);
    if (k === nk || k === dk || (k.length >= 4 && (nk.startsWith(k) || dk === k))) return { name, domain };
  }
  for (const [name, domain] of FEATURED) {
    const nk = companyKey(name);
    if (k.length >= 5 && (nk.includes(k) || k.includes(nk))) return { name, domain };
  }
  return null;
}

export function matcher(company: string, domain?: string) {
  const keys = [companyKey(company), domainRoot(domain), companyKey(company.split(/\s+/)[0] ?? "")].filter((k) => k.length >= 3);
  return (s: string) => {
    const n = companyKey(s);
    if (n.length < 2) return false;
    return keys.some((k) => n.includes(k) || (n.length >= 4 && k.startsWith(n)));
  };
}

const ATS = /(greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|workable\.com)$/;
const BOILER = /(trusted by|clients include|customers include|partners with|partnered with|brands like|companies like|such as)[^.]{0,120}$/i;

/** Returns null if the posting plausibly belongs to the target employer, else a reject reason. */
export function rejectReason(r: { title: string; url: string; content?: string }, company: string, domain?: string): string | null {
  const ok = matcher(company, domain);
  let u: URL;
  try { u = new URL(r.url); } catch { return "bad url"; }
  const host = u.hostname.replace(/^www\./, "");
  const onOwnSite = ok(host.split(".").slice(0, -1).join(" "));
  // Title "... at Other" or "... | Other"
  const at = r.title.match(/\s(?:at|@)\s+([^|–—-]+?)\s*(?:[|–—-].*)?$/i)?.[1] ?? r.title.match(/[|–—]\s*([^|–—]+)$/)?.[1];
  if (at && !ok(at) && !/careers?|jobs?|linkedin|indeed/i.test(at)) return `title employer ${at}`;
  // ATS slug
  if (ATS.test(host)) {
    const slug = u.pathname.split("/").filter(Boolean)[0] ?? "";
    if (slug && !ok(slug) && !ok(host.split(".")[0] ?? "")) return `ats slug ${slug}`;
  }
  if (/myworkdayjobs\.com$/.test(host) && !ok(host.split(".")[0] ?? "")) return "workday tenant";
  const titleHit = ok(r.title);
  if (!onOwnSite && !titleHit && !ATS.test(host)) {
    // Mentioned only in body: reject when it sits in client boilerplate or isn't mentioned at all
    const text = r.content || "";
    const idx = text.toLowerCase().search(new RegExp(company.split(/\s+/)[0]!.replace(/[^a-z0-9]/gi, ""), "i"));
    if (idx < 0 || BOILER.test(text.slice(Math.max(0, idx - 140), idx))) return "only client mention";
  }
  return null;
}

/** Pick the career portal host from stage-1 results. */
export function careerHost(results: { url: string }[], company: string, domain?: string): string | null {
  const ok = matcher(company, domain);
  for (const r of results) {
    try {
      const u = new URL(r.url);
      const host = u.hostname.replace(/^www\./, "");
      if (ok(host.split(".").slice(0, -1).join(" ")) && /career|jobs/i.test(host + u.pathname)) return host;
    } catch { /* ignore */ }
  }
  return null;
}
