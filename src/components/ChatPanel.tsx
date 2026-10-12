import { Button } from "@/components/Button";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Brain, Copy, Loader2, Square } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveKeys, useKeys } from "@/lib/keys";
import { listNebiusModels } from "@/lib/research.functions";
import { deepResearch } from "@/lib/deep-research.functions";
import { supabase } from "@/integrations/supabase/client";
import { Link } from '@tanstack/react-router';

type Msg = { role: "user" | "assistant"; content: string };

export function ChatPanel({
  context,
  title = "Career assistant",
  suggestions = [],
  className = "",
}: {
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
  const research = useServerFn(deepResearch);
  const [deep, setDeep] = useState(false);
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!deep || resumes.length) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const r = await supabase.from("resumes").select("id,title").order("updated_at", { ascending: false });
      if (r.data?.length) { setResumes(r.data); setResumeId((v) => v || r.data[0].id); }
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

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setErr("");
    if (!keys.nebius) return setErr("Connect your Nebius key first (top right).");
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    abort.current = new AbortController();
    try {
      let ctx = context || "";
      if (deep) {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) throw new Error("Sign in to use deep research with your resume.");
        setStatus(target.trim() ? "Researching the role and company…" : "Reading your resume…");
        const r = await research({ data: { resumeId: resumeId || undefined, target: target || (context ? "" : ""), tavilyKey: keys.tavily || undefined } });
        if (!r.ok) throw new Error(r.error);
        ctx = `${ctx}\n\n${r.context}`.slice(0, 30000);
        setStatus(`${r.sourceCount} sources · ${r.resumeUsed ? "resume facts included" : "no resume"}`);
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.current.signal,
        body: JSON.stringify({ apiKey: keys.nebius, model: keys.model, messages: next, context: ctx || undefined }),
      });
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
    <div className={`flex min-w-0 flex-col rounded-lg glass-strong ${className}`}>
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
                    <Button type="button" aria-label="Copy reply" onClick={() => navigator.clipboard.writeText(m.content)} className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{deep && status}</span>
              )}
            </div>
          ),
        )}
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={deep ? "e.g. Write a cover letter for this role…" : "Message Grinder…"}
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
