import { Button } from "@/components/Button";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Bookmark, Brain, Check, Copy, Download, ExternalLink, Loader2, Square } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveKeys, useKeys } from "@/lib/keys";
import { findCareers, listNebiusModels } from "@/lib/research.functions";
import { FEATURED } from "@/lib/companies";
import { deepResearch } from "@/lib/deep-research.functions";
import { getDemoStatus } from "@/lib/demo.functions";
import { supabase } from "@/integrations/supabase/client";
import { Link } from '@tanstack/react-router';

type Msg = { role: "user" | "assistant"; content: string };
type Role = { title: string; url: string; source: string };
const SAVED = "grinder.savedReplies";
// Keep only links that look like an individual job posting, not career home pages, news or blogs.
function isPosting(r: Role) {
  try {
    const u = new URL(r.url);
    const path = u.pathname.toLowerCase();
    if (/news\.ycombinator|wikipedia|reddit|medium|youtube|glassdoor\.com\/(interview|reviews)/.test(u.hostname + u.pathname)) return false;
    if (/^(careers?|jobs?)\b|\b(jobs|careers) (at|\|)|interview|blog|news|expanding|^show hn/i.test(r.title.trim()) ) return false;
    const segs = path.split("/").filter(Boolean);
    if (/greenhouse|lever\.co|ashbyhq|workable|smartrecruiters|myworkdayjobs|jobvite|icims/.test(u.hostname)) return segs.length >= 2;
    return /\/(jobs?|positions?|openings?|roles?|careers?)\/[^/]+/.test(path) && segs.length >= 2 && !/\/(search|teams?|locations?)\/?$/.test(path);
  } catch { return false; }
}
function download(text: string, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function ChatPanel({
  context,
  title = "Career assistant",
  suggestions = [],
  className = "",
  trigger,
}: {
  trigger?: { id: number; mode: "explore" | "match"; text: string; target: string; url: string; prepare?: () => Promise<string> } | undefined;
  context?: string;
  title?: string;
  suggestions?: string[];
  className?: string;
}) {
  const keys = useKeys();
  const [models, setModels] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [font,setFont]=useState('Arial');
  const [weight,setWeight]=useState(false);
  const [alignment,setAlignment]=useState<'left'|'center'|'right'>('left');
  const abort = useRef<AbortController | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const list = useServerFn(listNebiusModels);
  const demoStatus = useServerFn(getDemoStatus);
  const [demoLeft, setDemoLeft] = useState<number | null>(null);
  const [demoOut, setDemoOut] = useState(false);
  useEffect(() => {
    if (keys.nebius) return;
    demoStatus().then((r) => { setDemoLeft(r.remaining); setDemoOut(r.remaining <= 0); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.nebius]);
  const research = useServerFn(deepResearch);
  const [deep, setDeep] = useState(false);
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState("");
  const _careers = useServerFn(findCareers);
  const [company, setCompany] = useState<{ name: string; domain: string } | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [picked, setPicked] = useState<Role[]>([]);
  const [careerSite, setCareerSite] = useState("");
  const [saved, setSaved] = useState<{ at: string; title: string; content: string }[]>([]);
  const [flash, setFlash] = useState("");
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem(SAVED) || "[]")); } catch { /* empty */ } }, []);
  function saveReply(content: string) {
    const next = [{ at: new Date().toISOString(), title: (company ? `${company.name} · ` : "") + content.replace(/[#*_>\n]+/g, " ").trim().slice(0, 50), content }, ...saved].slice(0, 30);
    setSaved(next); localStorage.setItem(SAVED, JSON.stringify(next)); note("Saved");
  }
  function note(t: string) { setFlash(t); setTimeout(() => setFlash(""), 1500); }
  function togglePick(r: Role) {
    setPicked((p) => p.some((x) => x.url === r.url) ? p.filter((x) => x.url !== r.url) : p.length >= 3 ? p : [...p, r]);
  }
  const [rolesState, setRolesState] = useState("");
  const mention = /(?:^|\s)@([\w .-]{0,30})$/.exec(input)?.[1];
  const matches = mention === undefined || /\s$/.test(mention) ? [] : FEATURED.filter(([n]) => n.toLowerCase().startsWith(mention.toLowerCase().trimEnd())).slice(0, 6);
  const [linkDraft, setLinkDraft] = useState("");
  function pickCompany(name: string, domain: string) {
    setInput((v) => v.replace(/@([\w .-]{0,30})$/, `@${name} `));
    setCompany({ name, domain }); setDeep(true); setTarget(name); setRoles([]); setPicked([]); setCareerSite(`https://${domain}`);
    setRolesState("Paste up to 3 job links you're interested in.");
  }
  function addLink() {
    const u = linkDraft.trim();
    if (!/^https?:\/\/\S+$/.test(u)) return setRolesState("Enter a full job link starting with https://");
    if (picked.length >= 3 || picked.some((p) => p.url === u)) return;
    let title = u; try { const x = new URL(u); title = `${x.hostname}${x.pathname}`.slice(0, 60); } catch { /* keep */ }
    setPicked((p) => [...p, { title, url: u, source: "Your link" } as Role]); setLinkDraft(""); setRolesState("");
    ta.current?.focus();
  }

  useEffect(() => {
    if (!deep || resumes.length) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const r = await supabase.from("resumes").select("id,title").order("updated_at", { ascending: false });
      if (r.data?.length) { setResumes(r.data); setResumeId((v) => v || r.data?.[0]?.id || ""); }
    });
  }, [deep, resumes.length]);

  useEffect(() => {
    if (!keys.nebius) return;
    list({ data: { apiKey: keys.nebius } }).then((r) => {
      if (r.ok) {
        setModels(r.models);
        if (!keys.model || !r.models.includes(keys.model)) saveKeys({ model: r.models[0] || "" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.nebius]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs]);

  const root = useRef<HTMLDivElement>(null);
  const handled = useRef(0);
  const researchCache = useRef(new Map<string, Awaited<ReturnType<typeof deepResearch>>>());
  useEffect(() => {
    if (!trigger || handled.current === trigger.id) return;
    // A new action interrupts any reply still streaming, then runs once the chat is free.
    if (busy) { abort.current?.abort(); return; }
    handled.current = trigger.id;
    root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (trigger.mode === "match") {
      setDeep(true); setTarget(trigger.target);
      setPicked([{ title: trigger.target, url: trigger.url, source: "Selected role" }]);
      void send(trigger.text, { deep: true, target: trigger.target, roles: [trigger.url], needResume: true });
    } else void send(trigger.text, trigger.prepare ? { deep: false, prepare: trigger.prepare } : { deep: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger?.id, busy]);

  async function send(text: string, o?: { deep: boolean; target?: string; roles?: string[]; needResume?: boolean; prepare?: () => Promise<string> }) {
    if (!text.trim() || busy) return;
    const useDeep = o?.deep ?? deep;
    const tgt = o?.target ?? target;
    const roleUrls = o?.roles ?? picked.map((p) => p.url);
    if (o?.needResume) {
      const { data: s } = await supabase.auth.getSession();
      let rid = resumeId;
      if (s.session && !rid) {
        const r = await supabase.from("resumes").select("id,title").order("updated_at", { ascending: false });
        if (r.data?.length) { setResumes(r.data); rid = r.data[0]?.id || ""; setResumeId(rid); }
      }
      if (!s.session || !rid) {
        setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "Upload or select your resume first to run the match. [Open my resume →](/resume)" }]);
        return;
      }
      o = { ...o, target: tgt, roles: roleUrls };
      (o as { rid?: string }).rid = rid;
    }
    const useResume = (o as { rid?: string } | undefined)?.rid || resumeId;
    setErr("");
    if (!keys.nebius && demoOut) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setStatus("");
    abort.current = new AbortController();
    try {
      let ctx = (context || "").slice(0, 24000);
      if (o?.prepare) {
        setStatus("Reading the job posting…");
        const extra = await o.prepare();
        if (extra) ctx = `${extra}\n\n${ctx}`.slice(0, 34000);
        setStatus("");
      }
      if (useDeep) {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) throw new Error("Sign in to use deep research with your resume.");
        setStatus(tgt.trim() ? "Researching the role and company…" : "Reading your resume…");
        void supabase.from("search_history").insert({ user_id: s.session.user.id, kind: "deep_chat", query: text.slice(0, 2000), company: company?.name || tgt.slice(0, 120), urls: roleUrls });
        // Reuse research for follow-up questions about the same resume and job.
        const cacheKey = JSON.stringify([useResume, tgt.trim(), roleUrls]);
        const r = researchCache.current.get(cacheKey) ?? await research({ data: { resumeId: useResume || undefined, target: tgt, roles: roleUrls.length ? roleUrls : undefined, tavilyKey: keys.tavily || undefined, nebiusKey: keys.nebius || undefined } });
        if (!r.ok) throw new Error(r.error);
        researchCache.current.set(cacheKey, r);
        ctx = `${ctx}\n\n${r.context}`.slice(0, 45000);
        setStatus(`${r.sourceCount} sources · ${r.resumeUsed ? "resume facts included" : "no resume"}${r.match ? ` · ${r.match.score}% semantic match` : ""}`);
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.current.signal,
        body: JSON.stringify({ apiKey: keys.nebius || undefined, model: keys.model || "demo", messages: next, context: ctx || undefined }),
      });
      if (res.status === 429 && res.headers.get("X-Demo-Limit")) { setDemoLeft(0); setDemoOut(true); setMsgs(msgs); return; }
      const left = res.headers.get("X-Demo-Remaining");
      if (left !== null) { setDemoLeft(Number(left)); if (Number(left) <= 0) setDemoOut(false); }
      if (!res.ok || !res.body) throw new Error((await res.text()) || `Error ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const l of lines) {
          const s = l.trim();
          if (!s.startsWith("data:")) continue;
          const p = s.slice(5).trim();
          if (p === "[DONE]") continue;
          try {
            const d = JSON.parse(p).choices?.[0]?.delta?.content;
            if (d) {
              acc += d;
              setMsgs([...next, { role: "assistant", content: acc }]);
            }
          } catch {
            /* partial */
          }
        }
      }
      // Persist the full exchange (with grounding context) for the user's history and fine-tuning exports.
      if (acc) {
        const { data: s } = await supabase.auth.getSession();
        if (s.session) {
          const { error: logErr } = await supabase.from("chat_interactions").insert({ user_id: s.session.user.id, kind: useDeep ? "deep_chat" : o?.prepare ? "explore_role" : "chat", company: company?.name || tgt.slice(0, 120) || title.slice(0, 120), model: keys.model, context: ctx.slice(0, 45000), messages: [...next, { role: "assistant", content: acc }] });
          if (logErr) console.error("Chat history save failed", logErr.message);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setErr((e as Error).message.slice(0, 300));
        setMsgs(next);
      }
    } finally {
      setBusy(false);
      ta.current?.focus();
    }
  }

  return (
    <div ref={root} className={`flex min-w-0 scroll-mt-4 flex-col rounded-lg glass-strong ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 break-words font-medium">{title}</div>
        <select
          value={keys.model}
          onChange={(e) => saveKeys({ model: e.target.value })}
          className="max-w-[55%] truncate rounded-lg bg-muted px-2 py-1 text-xs outline-none"
        >
          {models.length === 0 && <option value="">{keys.nebius ? "Loading models…" : "No Nebius key"}</option>}
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <details className="border-b px-4 py-2 text-xs"><summary className="cursor-pointer">Chat appearance</summary><div className="mt-2 flex flex-wrap items-center gap-3"><label>Font <select aria-label="Chat font family" value={font} onChange={e=>setFont(e.target.value)} className="rounded border bg-muted p-1">{['Arial','Georgia','Courier New'].map(f=><option key={f}>{f}</option>)}</select></label><label>Alignment <select aria-label="Chat alignment" value={alignment} onChange={e=>setAlignment(e.target.value as typeof alignment)} className="rounded border bg-muted p-1">{['left','center','right'].map(a=><option key={a}>{a}</option>)}</select></label><label><input type="checkbox" checked={weight} onChange={e=>setWeight(e.target.checked)}/> Bold text</label></div></details>
      <div ref={box} style={{fontFamily:font,fontWeight:weight?700:400,textAlign:alignment}} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {msgs.length === 0 && (
          <div className="space-y-2">
            <Link to="/resume" className="inline-flex items-center gap-2 border-b pb-2 text-xs font-medium">Upload or edit my resume →</Link>
            {suggestions.map((s) => (
              <Button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-lg bg-muted px-3 py-2 text-left text-xs hover:bg-accent"
              >
                {s}
              </Button>
            ))}
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-8 rounded-lg bg-primary px-3 py-2 text-primary-foreground">
              {m.content}
            </div>
          ) : (
            <div key={i} className="prose-chat">
              {m.content ? (
                <>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                  {!(busy && i === msgs.length - 1) && (
                    <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      <Button type="button" aria-label="Copy reply" onClick={() => { navigator.clipboard.writeText(m.content); note("Copied"); }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted"><Copy className="h-3 w-3" /> Copy</Button>
                      <Button type="button" aria-label="Download reply as text" onClick={() => download(m.content, `grinder-${company?.name.replace(/\W+/g, "-").toLowerCase() || "reply"}-${Date.now()}.txt`)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted"><Download className="h-3 w-3" /> .txt</Button>
                      <Button type="button" aria-label="Save reply" onClick={() => saveReply(m.content)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted"><Bookmark className="h-3 w-3" /> Save</Button>
                    </div>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{status}</span>
              )}
            </div>
          ),
        )}
        {flash && <p role="status" className="inline-flex items-center gap-1 text-xs text-primary"><Check className="h-3 w-3" />{flash}</p>}
        {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
      </div>
      {deep && (
        <div className="mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 p-2 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-primary"><Brain className="h-3.5 w-3.5" /> Deep research</span>
          <select aria-label="Resume for deep research" value={resumeId} onChange={(e) => setResumeId(e.target.value)} className="max-w-[45%] rounded border bg-background/70 p-1">
            {resumes.length === 0 && <option value="">No saved resume (sign in / upload)</option>}
            {resumes.map((r) => <option key={r.id} value={r.id}>Using: {r.title}</option>)}
          </select>
          <input aria-label="Target role or job URL" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Role + company, or job URL" className="min-w-40 flex-1 rounded border bg-background/70 p-1 outline-none" />
          {status && !busy && <span className="text-muted-foreground">{status}</span>}
        </div>
      )}
      {company && (
        <div className="mx-3 mt-2 rounded-lg border border-border bg-muted/60 p-2 text-xs">
          <div className="flex items-center justify-between gap-2"><span className="font-medium">@{company.name} · job links ({picked.length}/3)</span>{careerSite && <a href={careerSite} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-primary underline">Website <ExternalLink className="h-3 w-3" /></a>}<Button type="button" aria-label="Clear company" onClick={() => { setCompany(null); setRoles([]); setPicked([]); setCareerSite(""); setRolesState(""); }} className="px-1 text-muted-foreground">×</Button></div>
          {picked.length < 3 && <div className="mt-1 flex gap-1"><input aria-label="Job link" value={linkDraft} onChange={(e) => setLinkDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} placeholder="https://… job posting link" className="min-w-0 flex-1 rounded border bg-background/70 p-1 outline-none" /><Button type="button" onClick={addLink} className="rounded border px-2 hover:bg-accent">Add</Button></div>}
          {rolesState && <p className="mt-1 text-muted-foreground">{rolesState}</p>}
          <div className="mt-1 flex flex-wrap gap-1">{picked.map((r) => <span key={r.url} className="inline-flex max-w-full items-center gap-1 rounded-full border bg-primary px-2 py-0.5 text-primary-foreground"><span className="truncate">{r.title}</span><Link to="/quiz" search={{ company: company.name, url: r.url }} className="underline">Quiz</Link><button type="button" aria-label="Remove link" onClick={() => togglePick(r)}>×</button></span>)}</div>
        </div>
      )}
      {saved.length > 0 && (
        <details className="mx-3 mt-2 rounded-lg border border-border bg-muted/60 p-2 text-xs">
          <summary className="cursor-pointer font-medium">Saved replies ({saved.length})</summary>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">{saved.map((r, i) => <li key={r.at} className="flex items-center gap-1"><span className="min-w-0 flex-1 truncate">{r.title}</span><Button type="button" aria-label="Copy saved reply" onClick={() => { navigator.clipboard.writeText(r.content); note("Copied"); }} className="rounded px-1 hover:bg-accent"><Copy className="h-3 w-3" /></Button><Button type="button" aria-label="Download saved reply" onClick={() => download(r.content, `grinder-saved-${i + 1}.txt`)} className="rounded px-1 hover:bg-accent"><Download className="h-3 w-3" /></Button><Button type="button" aria-label="Delete saved reply" onClick={() => { const n = saved.filter((x) => x.at !== r.at); setSaved(n); localStorage.setItem(SAVED, JSON.stringify(n)); }} className="rounded px-1 hover:bg-accent">×</Button></li>)}</ul>
        </details>
      )}
      {matches.length > 0 && (
        <div role="listbox" aria-label="Companies" className="mx-3 mt-2 rounded-lg border border-border bg-background/90 p-1 text-sm">
          {matches.map(([n, d]) => <Button type="button" role="option" key={n} onClick={() => pickCompany(n, d)} className="block w-full rounded px-2 py-1 text-left hover:bg-accent">@{n} <span className="text-xs text-muted-foreground">{d}</span></Button>)}
        </div>
      )}
      {!keys.nebius && demoOut && (
        <div role="alert" className="mx-3 mt-2 rounded-lg border border-border bg-muted/60 p-3 text-xs">
          <p className="font-medium">You've used your 3 free checks for today. Add your own free Nebius and Tavily keys in Settings to keep going - it takes 2 minutes.</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
            <li>Nebius: sign up at <a className="underline" href="https://tokenfactory.nebius.com" target="_blank" rel="noreferrer">tokenfactory.nebius.com</a>, open API keys and create a key.</li>
            <li>Tavily: sign up at <a className="underline" href="https://app.tavily.com" target="_blank" rel="noreferrer">app.tavily.com</a> and copy your free API key from the dashboard.</li>
          </ul>
          <Button type="button" onClick={() => window.dispatchEvent(new Event("grinder-open-keys"))} className="mt-2 rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground">Add my keys</Button>
        </div>
      )}
      {!keys.nebius && !demoOut && demoLeft !== null && (
        <p className="mx-3 mt-2 text-xs text-muted-foreground" aria-live="polite">{demoLeft} free check{demoLeft === 1 ? "" : "s"} left today · <button type="button" className="underline" onClick={() => window.dispatchEvent(new Event("grinder-open-keys"))}>use my own keys</button></p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="m-3 flex items-end gap-2 rounded-lg bg-muted p-2"
      >
        <Button
          type="button"
          aria-label="Deep research"
          aria-pressed={deep}
          title="Deep research: use your resume and live role research"
          onClick={() => setDeep((v) => !v)}
          className={`grid h-9 w-9 place-items-center rounded-full ${deep ? "bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary)]" : "text-muted-foreground hover:bg-accent"}`}
        >
          <Brain className="h-4 w-4" />
        </Button>
        <textarea
          ref={ta}
          autoFocus
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && matches[0]) { e.preventDefault(); pickCompany(matches[0][0], matches[0][1]); return; }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={deep ? "e.g. Write a cover letter for this role…" : "Message Grinder… type @ to pick a company"}
          className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none"
        />
        {busy ? (
          <Button type="button" onClick={() => abort.current?.abort()} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
             <Square aria-label="Stop response" className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button type="submit" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Send">
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
