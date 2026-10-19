import { FEATURED } from "@/lib/companies";

/** Clean lowercase URL slug: "Mistral AI" -> "mistral-ai". */
export const companySlug = (name: string) =>
  name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "company";

const KEY = "grinder.companySlugs";
const memory = new Map<string, { name: string; domain?: string }>();
const featured = new Map(FEATURED.map(([n, d]) => [companySlug(n), { name: n, domain: d }]));

/** Remember the display name and website for a slug so the domain stays data, not part of the URL. */
export function rememberCompany(name: string, domain?: string) {
  const slug = companySlug(name);
  if (featured.has(slug)) return slug;
  memory.set(slug, { name, domain });
  if (typeof window !== "undefined") {
    try {
      const all = JSON.parse(sessionStorage.getItem(KEY) || "{}");
      all[slug] = { name, domain };
      sessionStorage.setItem(KEY, JSON.stringify(all));
    } catch { /* storage unavailable */ }
  }
  return slug;
}

/** Link props for a company page. */
export const companyLink = (name: string, domain?: string) => ({ to: "/company/$name" as const, params: { name: rememberCompany(name, domain) } });

const titleCase = (slug: string) => slug.split("-").map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(" ");

/** Resolve a slug to a display name and domain (featured list first, then remembered links). */
export function companyFromSlug(slug: string, browser = typeof window !== "undefined"): { name: string; domain?: string } {
  const f = featured.get(slug);
  if (f) return f;
  const m = memory.get(slug);
  if (m) return m;
  if (browser) {
    try {
      const all = JSON.parse(sessionStorage.getItem(KEY) || "{}");
      if (all[slug]) return all[slug];
    } catch { /* ignore */ }
  }
  return { name: titleCase(slug) };
}

export const featuredSlugs = () => [...featured.keys()];
