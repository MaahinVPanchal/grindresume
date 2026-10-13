import { checkHost } from './company-metadata.server';

export type HarvestedRole = { title: string; url: string; snippet: string; source: string; published: string | null };

const ATS_PATTERNS: [RegExp, 'greenhouse' | 'ashby' | 'lever'][] = [
  [/(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([\w-]+)/gi, 'greenhouse'],
  [/jobs\.ashbyhq\.com\/([\w.-]+)/gi, 'ashby'],
  [/jobs\.(?:eu\.)?lever\.co\/([\w.-]+)/gi, 'lever'],
];
const NAV = /^(careers?|jobs|all jobs|open roles|open positions|view all|see all|apply|learn more|life at|benefits|teams?|locations?|students|university|privacy|blog)\b/i;
const text = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;|&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/&[^;\s]+;/g, ' ').replace(/\s+/g, ' ').trim();
const humanize = (slug: string) => slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Public-host-checked HTML fetch with revalidated redirects, a byte cap and a deadline. */
async function fetchPublicHtml(start: string, maxBytes = 2_500_000) {
  let target = start;
  for (let i = 0; i < 4; i++) {
    const url = new URL(target);
    if (url.protocol !== 'https:') throw new Error('Only https careers pages are read.');
    await checkHost(url.hostname);
    const res = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(9000), headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible; GrinderBot/1.0)' } });
    if (res.status >= 300 && res.status < 400) { const loc = res.headers.get('location'); if (!loc) throw new Error('redirect'); target = new URL(loc, target).href; continue; }
    if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) throw new Error(`careers page ${res.status}`);
    const reader = res.body?.getReader(); if (!reader) throw new Error('empty');
    const dec = new TextDecoder(); let html = '', bytes = 0;
    try { while (bytes < maxBytes) { const p = await reader.read(); if (p.done) break; bytes += p.value.length; html += dec.decode(p.value, { stream: true }); } } finally { await reader.cancel().catch(() => {}); }
    return { html, finalUrl: target };
  }
  throw new Error('Too many redirects');
}

async function json(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(9000), headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

/** Every open posting from a public ATS board (Greenhouse, Ashby, Lever). */
export async function atsJobs(kind: 'greenhouse' | 'ashby' | 'lever', slug: string): Promise<HarvestedRole[]> {
  const s = encodeURIComponent(slug);
  if (kind === 'greenhouse') {
    const j = await json(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs`);
    return ((j?.jobs || []) as { title: string; absolute_url: string; location?: { name?: string }; updated_at?: string }[]).map((x) => ({ title: x.title, url: x.absolute_url, snippet: x.location?.name || '', source: 'greenhouse.io', published: x.updated_at?.slice(0, 10) || null }));
  }
  if (kind === 'ashby') {
    const j = await json(`https://api.ashbyhq.com/posting-api/job-board/${s}`);
    return ((j?.jobs || []) as { title: string; jobUrl: string; location?: string; department?: string; employmentType?: string; publishedAt?: string }[]).map((x) => ({ title: x.title, url: x.jobUrl, snippet: [x.department, x.employmentType, x.location].filter(Boolean).join(' · '), source: 'ashbyhq.com', published: x.publishedAt?.slice(0, 10) || null }));
  }
  const j = await json(`https://api.lever.co/v0/postings/${s}?mode=json`);
  return ((Array.isArray(j) ? j : []) as { text: string; hostedUrl: string; categories?: { location?: string; team?: string; commitment?: string }; createdAt?: number }[]).map((x) => ({ title: x.text, url: x.hostedUrl, snippet: [x.categories?.team, x.categories?.commitment, x.categories?.location].filter(Boolean).join(' · '), source: 'lever.co', published: x.createdAt ? new Date(x.createdAt).toISOString().slice(0, 10) : null }));
}

/** ATS board slugs referenced anywhere in a string (HTML or URL). */
export function atsBoards(s: string) {
  const out: { kind: 'greenhouse' | 'ashby' | 'lever'; slug: string }[] = [];
  for (const [re, kind] of ATS_PATTERNS) for (const m of s.matchAll(re)) {
    const slug = (m[1] || '').toLowerCase();
    if (slug && !/^(embed|v1|js|api)$/.test(slug) && !out.some((o) => o.kind === kind && o.slug === slug)) out.push({ kind, slug });
  }
  return out;
}

/** Read an official careers page: list its own posting links, and pull full boards from any embedded ATS. */
export async function harvestCareersPage(pageUrl: string): Promise<HarvestedRole[]> {
  const { html, finalUrl } = await fetchPublicHtml(pageUrl);
  const base = new URL(finalUrl);
  const prefix = base.pathname.replace(/\/$/, '') || '/careers';
  const host = base.hostname.replace(/^www\./, '');
  const roles: HarvestedRole[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u: URL; try { u = new URL(m[1] || '', finalUrl); } catch { continue; }
    const h = u.hostname.replace(/^www\./, '');
    if (h !== host) continue;
    const segs = u.pathname.split('/').filter(Boolean);
    const under = u.pathname.startsWith(prefix + '/') || /^\/(careers?|jobs?|positions?|openings?|roles?)\/[^/]+/.test(u.pathname);
    if (!under || segs.length < 2) continue;
    const key = u.origin + u.pathname.replace(/\/$/, '');
    if (seen.has(key)) continue;
    const parts = (m[2] || '').split(/<[^>]+>/).map(text).filter((p) => p && p !== '·' && !/^apply\b|→$/i.test(p));
    const title = parts[0] || humanize(segs[segs.length - 1] || '');
    if (title.length < 4 || title.length > 140 || NAV.test(title)) continue;
    seen.add(key);
    roles.push({ title, url: key, snippet: parts.slice(1).join(' · ').slice(0, 300), source: host, published: null });
  }
  const boards = atsBoards(html);
  const fromAts = (await Promise.all(boards.slice(0, 2).map((b) => atsJobs(b.kind, b.slug).catch(() => [])))).flat();
  for (const r of fromAts) if (!seen.has(r.url)) { seen.add(r.url); roles.push(r); }
  return roles;
}

/** Rank roles matching the requested title/location first without hiding the rest. */
// Index pages ("Explore open roles", /careers/jobs) are not postings and confuse role-specific chat.
function isIndex(r: { title: string; url?: string }) {
  if (/^(explore|view|see|browse|search)\b.*\b(roles|jobs|openings|positions)\b|^(open roles|all jobs|careers|jobs)$/i.test(r.title.trim())) return true;
  try { return /^\/((careers?|jobs?)(\/(jobs|search|open-roles))?)?\/?$/i.test(new URL(r.url || '').pathname); } catch { return false; }
}

export function rankRoles<T extends { title: string; snippet: string; url?: string }>(input: T[], title?: string, location?: string) {
  const roles = input.filter((r) => !isIndex(r));
  const words = (s?: string) => (s || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const tw = words(title), lw = words(location);
  const score = (r: T) => { const t = `${r.title} ${r.snippet}`.toLowerCase(); return tw.filter((w) => t.includes(w)).length * 2 + lw.filter((w) => t.includes(w)).length; };
  return roles.map((r, i) => ({ r, s: score(r), i })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.r);
}
