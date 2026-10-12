import { officialWebsite } from './company-profile';

function publicAddress(ip: string) {
  if (ip.includes(':')) return /^[23][0-9a-f]{3}:/i.test(ip) && !/^2001:(db8|0|10|20):/i.test(ip);
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a = 0, b = 0] = p;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
}
async function checkHost(host: string) {
  const results = await Promise.all(['A', 'AAAA'].map(async type => {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error('Website lookup unavailable.');
    const json = await r.json() as { Answer?: { type: number; data: string }[] };
    return (json.Answer || []).filter(a => a.type === 1 || a.type === 28).map(a => a.data);
  }));
  const addresses = results.flat();
  if (!addresses.length || addresses.some(ip => !publicAddress(ip))) throw new Error('Use a reachable public company website.');
}
const plain = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
export async function readCompanyMetadata(input: string) {
  const website = officialWebsite(input);
  let target = website;
  for (let i = 0; i < 4; i++) {
    const url = new URL(target);
    officialWebsite(url.origin);
    await checkHost(url.hostname);
    const response = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { Accept: 'text/html' } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Website redirect could not be checked.');
      target = new URL(location, target).href;
      continue;
    }
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Website details could not be read. You can enter them yourself.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Website returned no details.');
    const decoder = new TextDecoder();
    let html = '', bytes = 0;
    try { while (bytes < 262144) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; html += decoder.decode(part.value, { stream: true }); if (/<\/head>/i.test(html)) break; } } finally { await reader.cancel(); }
    const meta = new Map<string, string>();
    for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
      const attrs = new Map<string, string>();
      for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs.set((m[1] || '').toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '');
      meta.set((attrs.get('property') || attrs.get('name') || '').toLowerCase(), plain(attrs.get('content') || ''));
    }
    return { website, oneLiner: (meta.get('og:description') || meta.get('description') || '').slice(0, 300), source: target };
  }
  throw new Error('Too many website redirects. Enter the details yourself.');
}