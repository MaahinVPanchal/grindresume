import { useState, useEffect } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { 
  Sparkles, 
  ExternalLink, 
  Loader2, 
  Check, 
  Copy, 
  X, 
  Globe, 
  Target, 
  ArrowRight, 
  Info,
  Building2,
  KeyRound,
  Award,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from './Button';
import { useKeys } from '@/lib/keys';
import { getSectionCopilotGuidance } from '@/lib/resume.functions';
import { resumeBlocks, type Resume } from '@/lib/resume-model';

export type CopilotTarget = {
  sectionId: string;
  sectionKind: string;
  sectionHeading: string;
  entryId?: string;
  entryTitle?: string;
  field?: 'details' | 'bullets';
  bulletIndex?: number;
  text: string;
};

export type SectionCopilotProps = {
  resume: Resume;
  target: CopilotTarget | null;
  onApply: (revision: string, target: CopilotTarget) => void;
  onClose: () => void;
  initialCompany?: string;
  initialRole?: string;
  onSelectSection?: (target: CopilotTarget) => void;
};

export function SectionCopilot({
  resume,
  target,
  onApply,
  onClose,
  initialCompany = '',
  initialRole = '',
  onSelectSection,
}: SectionCopilotProps) {
  const keys = useKeys();
  const getGuidance = useServerFn(getSectionCopilotGuidance);

  const [company, setCompany] = useState(initialCompany);
  const [role, setRole] = useState(initialRole);
  const [goal, setGoal] = useState('How should a top recruiter format and curate this? Tell me what to include, what to cut, and structure.');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');
  
  type GuidanceData = {
    formatRecommendation: string;
    whatToInclude: string[];
    whatToCut: string[];
    companyInsights: string[];
    keyTerms: string[];
    suggestedRevision: string;
    whyItWorks: string;
    competencyBridge?: string;
  };
  
  const [result, setResult] = useState<{
    guidance: GuidanceData;
    sources: { title: string; url: string }[];
  } | null>(null);

  const [editableRevision, setEditableRevision] = useState('');

  // Update company/role if initials change
  useEffect(() => {
    if (initialCompany && !company) setCompany(initialCompany);
    if (initialRole && !role) setRole(initialRole);
  }, [initialCompany, initialRole]);

  // When target changes, reset applied state
  useEffect(() => {
    setApplied(false);
  }, [target?.sectionId, target?.entryId, target?.bulletIndex]);

  async function runGuidance(customGoal?: string) {
    if (!target) return;
    setError('');
    setBusy(true);
    setApplied(false);

    try {
      const resumeFacts = resumeBlocks(resume)
        .map((b) => b.lines.join(' '))
        .join('\n')
        .slice(0, 6000);

      const res = await getGuidance({
        data: {
          company: company.slice(0, 120),
          role: role.slice(0, 200),
          sectionKind: target.sectionKind,
          sectionHeading: target.sectionHeading,
          currentText: target.text,
          resumeSummary: resumeFacts,
          goal: customGoal || goal,
          tavilyKey: keys.tavily || undefined,
          apiKey: keys.nebius || undefined,
          model: keys.model || undefined,
        },
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setResult(res);
      setEditableRevision(res.guidance.suggestedRevision);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch section guidance.');
    } finally {
      setBusy(false);
    }
  }

  function handleApply() {
    if (!target || !editableRevision.trim()) return;
    onApply(editableRevision, target);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  }

  function handleCopy() {
    if (!editableRevision) return;
    navigator.clipboard.writeText(editableRevision);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const promptChips = [
    { label: '🏆 Recruiter curation & format', goal: 'How should a top recruiter format and curate this? Tell me what to include, what to cut (e.g. if 18 items, top 3 + summary), and structure.' },
    { label: '✂️ What to include vs cut', goal: 'Analyze high-signal accomplishments to highlight vs low-signal fluff to cut' },
    { label: '📊 Google XYZ metrics format', goal: 'Rewrite using Google formula: Accomplished [X] as measured by [Y] by doing [Z]' },
    { label: '🎯 Tailor to target employer', goal: `Tailor this to align with ${company || 'the target employer'} tech stack and priorities` },
    { label: '🌉 Competency bridge', goal: 'Bridge adjacent skills honestly if an exact requirement is missing' },
  ];

  return (
    <aside className="flex flex-col h-full overflow-hidden border-l bg-glass-strong">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              Section Copilot
              <span className="text-[10px] font-normal uppercase tracking-wider px-1.5 py-0.5 rounded bg-sage/20 text-sage font-mono">
                Tavily Live
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">Company-grounded tailoring</p>
          </div>
        </div>
        <Button
          aria-label="Close Section Copilot"
          title="Close Copilot"
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Target Company & Role */}
        <div className="rounded-lg border bg-background/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> Target Employer
            </span>
            <span className={`flex items-center gap-1 text-[11px] ${keys.tavily ? 'text-sage' : 'text-amber-600'}`}>
              <Globe className="h-3 w-3" />
              {keys.tavily ? 'Tavily web active' : 'AI mode (no Tavily key)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Company</label>
              <input
                aria-label="Target company"
                placeholder="e.g. Peec AI, Rescale"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded border bg-background px-2 py-1 text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Role</label>
              <input
                aria-label="Target role"
                placeholder="e.g. Full-Stack Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded border bg-background px-2 py-1 text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* Active Target Section */}
        <div className="rounded-lg border bg-background/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1 text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Active Section
            </span>
            {target && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                {target.sectionHeading} {target.field === 'bullets' ? `· Bullet #${(target.bulletIndex ?? 0) + 1}` : ''}
              </span>
            )}
          </div>

          {target ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{target.entryTitle || target.sectionHeading}</span>
                <span className="text-[10px] uppercase font-mono">{target.field || 'text'}</span>
              </div>
              <div className="rounded border bg-muted/40 p-2 text-xs text-foreground max-h-24 overflow-y-auto whitespace-pre-wrap">
                {target.text || <span className="italic text-muted-foreground">Empty field — Copilot will draft new content</span>}
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground space-y-2">
              <p>Click any bullet or section in the editor to tailor it with live intelligence.</p>
              {resume.sections.length > 0 && onSelectSection && (
                <div className="pt-1">
                  <select
                    aria-label="Pick section to tailor"
                    onChange={(e) => {
                      const s = resume.sections.find((sec) => sec.id === e.target.value);
                      if (s) {
                        const firstEntry = s.entries[0];
                        onSelectSection({
                          sectionId: s.id,
                          sectionKind: s.kind,
                          sectionHeading: s.heading,
                          entryId: firstEntry?.id,
                          entryTitle: firstEntry?.title || s.heading,
                          field: firstEntry?.bullets?.length ? 'bullets' : 'details',
                          bulletIndex: 0,
                          text: firstEntry?.bullets?.[0] || firstEntry?.details || '',
                        });
                      }
                    }}
                    className="rounded border bg-background px-2 py-1 text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>Or pick a section to inspect…</option>
                    {resume.sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.heading}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Goal Preset Chips */}
        {target && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Tailoring Objective</span>
            <div className="flex flex-wrap gap-1.5">
              {promptChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setGoal(chip.goal);
                    runGuidance(chip.goal);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    goal === chip.goal 
                      ? 'border-primary bg-primary text-primary-foreground font-medium' 
                      : 'border-border/60 bg-background/70 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <Button
              onClick={() => runGuidance()}
              disabled={busy || !target}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Researching with Tavily & tailoring…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Get Live Guidance & Revision
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-destructive rounded bg-destructive/10 p-2">
            {error}
          </p>
        )}

        {/* Copilot Result Card */}
        {result?.guidance && (
          <div className="space-y-3.5 pt-2 border-t">
            {/* Live Company Insights */}
            {result.guidance.companyInsights.length > 0 && (
              <div className="rounded-lg border bg-sage/10 border-sage/30 p-3 space-y-1.5">
                <h3 className="text-xs font-semibold text-sage flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Live Company Intelligence
                </h3>
                <ul className="space-y-1 text-xs text-foreground/90 pl-3">
                  {result.guidance.companyInsights.map((insight, idx) => (
                    <li key={idx} className="list-disc leading-relaxed">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* High-Impact Key Terms */}
            {result.guidance.keyTerms.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> Recommended Keywords
                </span>
                <div className="flex flex-wrap gap-1">
                  {result.guidance.keyTerms.map((term, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-foreground border"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top Recruiter Format & Curation Blueprint */}
            {result.guidance.formatRecommendation && (
              <div className="rounded-lg border bg-primary/5 border-primary/20 p-3 space-y-1.5">
                <h3 className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                  <Award className="h-3.5 w-3.5" /> Recruiter Format & Curation Blueprint
                </h3>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {result.guidance.formatRecommendation}
                </p>
              </div>
            )}

            {/* What to Include vs What to Cut */}
            <div className="space-y-2.5">
              {result.guidance.whatToInclude?.length > 0 && (
                <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3 space-y-1.5">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> What to Include (High-Signal)
                  </h4>
                  <ul className="space-y-1 text-xs text-foreground/85 pl-3">
                    {result.guidance.whatToInclude.map((item, idx) => (
                      <li key={idx} className="list-disc leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.guidance.whatToCut?.length > 0 && (
                <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-3 space-y-1.5">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> What to Cut / Avoid (Low-Signal Fluff)
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground pl-3">
                    {result.guidance.whatToCut.map((item, idx) => (
                      <li key={idx} className="list-disc leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Competency Bridge (if any) */}
            {result.guidance.competencyBridge && (
              <div className="rounded-lg border bg-amber-500/10 border-amber-500/30 p-3 space-y-1">
                <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Honest Competency Bridge
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {result.guidance.competencyBridge}
                </p>
              </div>
            )}

            {/* Recommended Revision */}
            <div className="space-y-2 rounded-lg border bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Suggested Revision
                </span>
                <Button
                  onClick={handleCopy}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {copied ? <Check className="h-3 w-3 text-sage" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>

              <textarea
                rows={4}
                value={editableRevision}
                onChange={(e) => setEditableRevision(e.target.value)}
                className="w-full rounded border bg-muted/30 p-2.5 text-xs text-foreground outline-none leading-relaxed"
                aria-label="Suggested revision"
              />

              {result.guidance.whyItWorks && (
                <p className="text-[11px] text-muted-foreground italic bg-muted/40 rounded p-2">
                  <span className="font-semibold not-italic">Why it works: </span>
                  {result.guidance.whyItWorks}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  {applied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Applied to Resume
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-3.5 w-3.5" /> Apply to Resume
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Sourced Research Links */}
            {result.sources.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">Tavily Research Sources</span>
                <div className="space-y-1">
                  {result.sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline truncate"
                    >
                      <span className="truncate">{s.title || s.url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
