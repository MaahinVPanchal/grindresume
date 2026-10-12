import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Loader2, Square } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveKeys, useKeys } from "@/lib/keys";
import { listNebiusModels } from "@/lib/research.functions";

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
  const abort = useRef<AbortController | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const list = useServerFn(listNebiusModels);

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.current.signal,
        body: JSON.stringify({ apiKey: keys.nebius, model: keys.model, messages: next, context }),
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
    <div className={`flex flex-col rounded-3xl glass-strong ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="font-medium">{title}</div>
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
      <div ref={box} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {msgs.length === 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground">Ask about roles, the company or your application.</p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-xl bg-muted px-3 py-2 text-left text-xs hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-8 rounded-2xl bg-primary px-3 py-2 text-primary-foreground">
              {m.content}
            </div>
          ) : (
            <div key={i} className="prose-chat">
              {m.content ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          ),
        )}
        {err && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="m-3 flex items-end gap-2 rounded-2xl bg-muted p-2"
      >
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
          placeholder="Message Grinder…"
          className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none"
        />
        {busy ? (
          <button type="button" onClick={() => abort.current?.abort()} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Square className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button type="submit" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Send">
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}
