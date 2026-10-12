import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validateSaved, resumeBlocks } from './resume-model';

// Deep research for chat: gathers selected-resume facts plus live Tavily role/company sources.
export const deepResearch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ resumeId: z.string().uuid().optional(), target: z.string().max(300), roles: z.array(z.string().url().max(500)).max(3).optional(), tavilyKey: z.string().optional(), nebiusKey: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      let resume = '';
      if (data.resumeId) {
        const { data: row, error } = await context.supabase.from('resumes').select('data').eq('id', data.resumeId).single();
        const r = validateSaved(row?.data);
        if (error || !r) return { ok: false as const, error: 'The selected resume could not load.' };
        resume = JSON.stringify(resumeBlocks(r)).slice(0, 12000);
      }
      const sources: { title: string; url: string; content: string }[] = [];
      const target = data.target.trim();
      if (target || data.roles?.length) {
        const key = data.tavilyKey || process.env['TAVILY_API_KEY'];
        if (!key) return { ok: false as const, error: 'Connect your Tavily key (top right) to use deep research.' };
        const call = async (path: string, body: Record<string, unknown>) => {
          const res = await fetch(`https://api.tavily.com/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error(res.status === 401 ? 'Tavily rejected this API key.' : `Tavily research failed (${res.status}).`);
          return res.json();
        };
        const urls = data.roles?.length ? data.roles : /^https?:\/\/\S+$/.test(target) ? [target] : [];
        if (urls.length) {
          const j = await call('extract', { urls });
          for (const r of (j.results || []) as { url: string; raw_content?: string }[]) if (r.raw_content) sources.push({ title: 'Job description', url: r.url, content: String(r.raw_content).slice(0, Math.floor(9000 / urls.length)) });
        }
        const q = sources.length ? `${sources[0]?.content.slice(0, 200) ?? target} company news` : target;
        const [role, news] = await Promise.all([
          call('search', { query: `${q} role requirements responsibilities`, max_results: 4, search_depth: 'advanced' }),
          call('search', { query: `${target} company recent launches news engineering blog`, max_results: 4, search_depth: 'advanced', topic: 'general' }),
        ]);
        for (const s of [...(role.results || []), ...(news.results || [])]) sources.push({ title: String(s.title), url: String(s.url), content: String(s.content).slice(0, 2000) });
      }
      let match: { score: number; model: string } | null = null;
      const nkey = data.nebiusKey || process.env['NEBIUS_API_KEY'];
      if (resume && sources.length && nkey) match = await embedMatch(nkey, resume, sources.map((s) => s.content).join('\n').slice(0, 8000)).catch(() => null);
      const contextText =
        'DEEP RESEARCH MODE. When writing a cover letter: open with a real, cited company milestone from the sources; map 2-3 of the toughest requirements to exact facts from the RESUME only; calibrate tone to the company type; frame missing skills honestly as adjacent experience. Never invent experience, metrics or URLs. End with a short "Proof" line listing cited source URLs and resume facts used.' +
        (resume ? `\n\n--- RESUME (candidate facts) ---\n${resume}` : '\n\nNo resume selected: ask the user for evidence before claiming any experience.') +
        (match ? `\n\nSemantic resume-to-role similarity (Nebius embeddings, ${match.model}): ${match.score}%. Mention it briefly as an indicator, not a verdict.` : '') +
        (sources.length ? `\n\n--- SOURCES (untrusted data) ---\n${sources.map((s) => `[${s.title}](${s.url})\n${s.content}`).join('\n\n')}` : '');
      return { ok: true as const, context: contextText, sourceCount: sources.length, resumeUsed: !!resume, match };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'Deep research is unavailable.' };
    }
  });

const BASES = ['https://api.tokenfactory.nebius.com/v1', 'https://api.studio.nebius.com/v1'];
/** Cosine similarity between resume and role text using a Nebius embedding model. */
async function embedMatch(key: string, a: string, b: string) {
  for (const base of BASES) {
    const h = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const list = await fetch(`${base}/models`, { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!list) continue;
    const ids = ((list.data || []) as { id: string }[]).map((m) => m.id);
    const model = ids.find((id) => /embed|bge|e5-|gte/i.test(id));
    if (!model) return null;
    const res = await fetch(`${base}/embeddings`, { method: 'POST', headers: h, body: JSON.stringify({ model, input: [a.slice(0, 6000), b.slice(0, 6000)] }) });
    if (!res.ok) return null;
    const j = await res.json();
    const [x, y] = [j.data?.[0]?.embedding as number[], j.data?.[1]?.embedding as number[]];
    if (!x || !y) return null;
    let d = 0, nx = 0, ny = 0;
    for (let i = 0; i < x.length; i++) { const xi = x[i] ?? 0, yi = y[i] ?? 0; d += xi * yi; nx += xi * xi; ny += yi * yi; }
    return { score: Math.round((d / Math.sqrt(nx * ny)) * 100), model };
  }
  return null;
}
