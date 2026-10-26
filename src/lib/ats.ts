import { resumeBlocks, type Resume } from './resume-model';
import { layoutResume } from './resume-layout';

export type AtsCheck = { id: string; label: string; weight: number; earned: number; hint: string };
export type AtsResult = { score: number; checks: AtsCheck[]; keywords: { found: string[]; missing: string[] } };

const STOP = new Set(['and','the','for','with','you','your','yours','our','ours','we','are','will','that','this','from','have','has','was','were','not','but','all','can','who','what','they','their','them','into','onto','about','across','per','via','using','use','work','working','team','teams','role','roles','job','jobs','must','should','would','could','may','might','more','most','less','least','also','than','then','when','where','while','whoever','etc','new','other','others','any','each','every','some','such','only','own','same','very','just','like','want','needs','need','help','able','well','good','great','strong','plus','years','year','experience','experiences','including','include','includes','hiring','join','looking','apply','application','applications','candidate','candidates','opportunity','benefits','salary','employer','equal','build','building','deploy','deploying','integrate','integrating','based']);
const VERBS = new Set(['built','led','shipped','designed','developed','launched','improved','reduced','increased','created','implemented','managed','owned','drove','delivered','automated','scaled','optimized','optimised','migrated','architected','integrated','mentored','engineered','streamlined','established','introduced','resolved','accelerated','grew','cut','saved','generated','translated','partnered','collaborated','spearheaded','modernized','merged','unified','consolidated','coordinated','tested','debugged','refactored','documented','presented','published','analyzed','reviewed','maintained','supported','configured','deployed','monitored']);
const QUANTIFIED = /(\d+\s?%|\$\s?\d|\d+\s?x\b|\b\d{2,}\b)/i;
const MONTHS: Record<string, number> = { january:1, jan:1, february:2, feb:2, march:3, mar:3, april:4, apr:4, may:5, june:6, jun:6, july:7, jul:7, august:8, aug:8, september:9, sept:9, sep:9, october:10, oct:10, november:11, nov:11, december:12, dec:12, spring:3, summer:6, fall:9, autumn:9, winter:12 };

const tokens = (text: string) => text.toLowerCase().match(/[a-z][a-z+#.\-/]{1,}/g) ?? [];
const strip = (word: string) => word.replace(/[.\-/]+$/, '');

/** Parses a date field like "May 2025", "2024", "Fall 2023" or "Present" (adopting OpenResume's
 *  date-detection idea). "Present" becomes a far-future sentinel so ordering checks pass. */
function parseWhen(value: string): { y: number; m: number } | null {
  const s = value.trim().toLowerCase();
  if (!s) return null;
  if (s === 'present' || s === 'current' || s === 'now') return { y: 9999, m: 12 };
  const year = s.match(/(19|20)\d{2}/)?.[0];
  if (!year) return null;
  const monthWord = Object.keys(MONTHS).find(mo => s.includes(mo));
  return { y: Number(year), m: monthWord ? MONTHS[monthWord]! : 12 };
}

/** Deterministic keyword overlap: the JD's top non-stopword tokens plus frequent two-word
 *  phrases (so multi-word skills like "machine learning" match), checked against the resume. */
export function keywordOverlap(resumeText: string, jd: string): { found: string[]; missing: string[] } {
  const flat = resumeText.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ');
  const resumeWords = new Set(tokens(resumeText).map(strip));
  const raw = tokens(jd);
  const freq = new Map<string, number>();
  for (const rawToken of raw) {
    const word = strip(rawToken);
    if (word.length < 3 || STOP.has(word) || /^\d+$/.test(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 24).map(([w]) => w);
  const bigramFreq = new Map<string, number>();
  for (let i = 0; i < raw.length - 1; i++) {
    const first = strip(raw[i]!);
    const second = strip(raw[i + 1]!);
    if (first.length < 3 || second.length < 3 || STOP.has(first) || STOP.has(second)) continue;
    const phrase = `${first} ${second}`;
    bigramFreq.set(phrase, (bigramFreq.get(phrase) ?? 0) + 1);
  }
  const topBigrams = [...bigramFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  const foundBigrams = topBigrams.filter(p => flat.includes(p));
  const foundSet = new Set(top.filter(w => resumeWords.has(w)));
  for (const phrase of foundBigrams) for (const word of phrase.split(' ')) foundSet.add(word);
  const missing = top.filter(w => !foundSet.has(w));
  return { found: [...foundSet, ...foundBigrams], missing };
}

function dateCheck(resume: Resume): { earned: number; hint: string } {
  const now = new Date();
  const considered: boolean[] = [];
  for (const e of resume.sections.flatMap(s => s.entries)) {
    const startText = e.start.trim();
    const endText = e.current ? 'Present' : e.end.trim();
    if (!startText && !endText) continue;
    const start = parseWhen(startText);
    const end = parseWhen(endText);
    let ok = true;
    if (!start) ok = false;
    if (endText && !end) ok = false;
    if (start && end && end.y !== 9999 && (end.y < start.y || (end.y === start.y && end.m < start.m))) ok = false;
    if (start && (start.y > now.getFullYear() || (start.y === now.getFullYear() && start.m > now.getMonth() + 1))) ok = false;
    considered.push(ok);
  }
  return {
    earned: considered.length ? Math.round((10 * considered.filter(ok => ok).length) / considered.length) : 0,
    hint: 'Use consistent month-year ranges (e.g. May 2025 – Jun 2026); ATS parsers reject reversed or unreadable dates.',
  };
}

/** Pure deterministic ATS-readiness checks. Scores are explainable by construction; when no
 *  job description is given the keyword check is omitted and the remaining weights rescale.
 *  Weight balance follows Resume-Matcher's published model (keyword-heavy, with a dedicated
 *  date-consistency criterion) plus bullet-quality checks none of the reference repos have. */
export function atsChecks(resume: Resume, jd = ''): AtsResult {
  const p = resume.personal;
  const text = resumeBlocks(resume).map(b => b.lines.join(' ')).join(' ');
  const checks: AtsCheck[] = [];

  const contactEarned = (p.email ? 4 : 0) + (p.phone ? 3 : 0) + (p.location ? 2 : 0) + ([p.linkedin, p.github, p.website, p.otherLinks].some(Boolean) ? 1 : 0);
  checks.push({ id: 'contact', label: 'Contact details', weight: 10, earned: contactEarned, hint: 'Add an email and phone; recruiters filter on both.' });

  const has = (kind: string) => resume.sections.some(s => s.kind === kind && s.entries.some(e => e.title || e.details || e.bullets.length));
  const sectionEarned = (has('experience') ? 6 : 0) + (has('education') ? 4 : 0) + (has('skills') ? 5 : 0);
  checks.push({ id: 'sections', label: 'Standard sections', weight: 15, earned: sectionEarned, hint: 'Recruiter ATS layouts look for experience, education and skills sections.' });

  const bullets = resume.sections.flatMap(s => s.entries.flatMap(e => e.bullets)).filter(b => b.trim());
  const verbFrac = bullets.length ? bullets.filter(b => VERBS.has(b.trim().split(/\s+/)[0]!.toLowerCase())).length / bullets.length : 0;
  const quantFrac = bullets.length ? bullets.filter(b => QUANTIFIED.test(b)).length / bullets.length : 0;
  const bulletEarned = Math.round(12 * verbFrac + 8 * quantFrac);
  checks.push({ id: 'bullets', label: 'Bullet quality', weight: 20, earned: bulletEarned, hint: bullets.length ? 'Start bullets with action verbs and quantify results (%, $, numbers).' : 'Turn responsibilities into bullet points — paragraphs parse poorly.' });

  const words = text.split(/\s+/).filter(Boolean).length;
  const wordScore = words < 400 ? Math.round((words / 400) * 10) : words <= 800 ? 10 : Math.max(0, 10 - Math.round((words - 800) / 120));
  const lengthEarned = wordScore + (layoutResume(resume).pages.length <= 2 ? 5 : 0);
  checks.push({ id: 'length', label: 'Length & pages', weight: 15, earned: Math.max(0, lengthEarned), hint: 'Aim for 400–800 words on 1–2 pages.' });

  const dates = dateCheck(resume);
  checks.push({ id: 'dates', label: 'Date consistency', weight: 10, earned: dates.earned, hint: dates.hint });

  const weights = checks.reduce((a, c) => a + c.weight, 0);
  let score = Math.round((checks.reduce((a, c) => a + c.earned, 0) / weights) * 100);
  const keywords = { found: [] as string[], missing: [] as string[] };
  if (jd.trim()) {
    const overlap = keywordOverlap(text, jd);
    Object.assign(keywords, overlap);
    const foundSingle = overlap.found.filter(w => !w.includes(' ')).length;
    const kwEarned = Math.round((foundSingle / Math.max(1, foundSingle + overlap.missing.length)) * 30);
    checks.push({ id: 'keywords', label: 'Keyword coverage vs job post', weight: 30, earned: kwEarned, hint: 'Mirror the job post’s exact terms where your experience genuinely matches.' });
    score = Math.round((checks.reduce((a, c) => a + c.earned, 0) / (weights + 30)) * 100);
  }
  return { score: Math.max(0, Math.min(100, score)), checks, keywords };
}

/** Final score blends the deterministic checks with the AI review in code — the model never
 *  produces the headline number, so the same resume and job post score the same twice. */
export function blendAts(deterministic: number, aiCategories: number[]): number {
  if (!aiCategories.length) return deterministic;
  const aiAvg = aiCategories.reduce((a, b) => a + b, 0) / aiCategories.length;
  return Math.max(0, Math.min(100, Math.round(deterministic * 0.6 + aiAvg * 0.4)));
}
