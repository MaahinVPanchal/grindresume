import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Download, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import { buildLines, validateLines, splitLines, downloadParts, formatBytes, NEBIUS_MAX_BYTES, type ChatRow, type QuizRow, type Issue } from "@/lib/finetune-export";

type Storage = { tables: { name: string; bytes: number }[]; files_bytes: number; files_count: number };
const rpc = (n: string) => (supabase.rpc as unknown as (n: string) => Promise<{ data: unknown; error: unknown }>)(n);

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin console - GrinderResume" },
      { name: "description", content: "Private admin console for GrinderResume usage metrics and data exports." },
      { property: "og:title", content: "Admin console - GrinderResume" },
      { property: "og:description", content: "Users, queries and dataset exports for GrinderResume admins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Stats = {
  users: number; chats: number; searches: number; quizzes: number; quizzes_submitted: number; resumes: number; saved_roles: number;
  recent_users: { email: string; created_at: string; last_sign_in_at: string | null }[];
  recent_chats: unknown[]; recent_searches: unknown[]; recent_quizzes: unknown[];
};

const primary = "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-md border bg-glass-strong px-3 py-2 text-sm disabled:opacity-50";

export function passwordChecks(p: string) {
  return [
    { ok: p.length >= 12, label: "12+ characters" },
    { ok: /[A-Z]/.test(p), label: "Uppercase letter" },
    { ok: /[a-z]/.test(p), label: "Lowercase letter" },
    { ok: /\d/.test(p), label: "Number" },
    { ok: /[^A-Za-z0-9]/.test(p), label: "Symbol" },
  ];
}

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const load = async () => {
    setLoading(true); setDenied(false);
    const { data, error } = await (supabase.rpc as unknown as (n: string) => Promise<{ data: Stats | null; error: unknown }>)("admin_stats");
    setLoading(false);
    if (error || !data) { setDenied(true); setStats(null); } else setStats(data);
  };
  useEffect(() => { if (session) void load(); else setStats(null); }, [session?.user.id]);

  if (!ready) return <Shell><div className="flex justify-center py-24"><Loader2 className="animate-spin" /></div></Shell>;
  return (
    <Shell>
      {!session ? <AdminLogin /> : denied ? (
        <div className="mx-auto max-w-md rounded-lg glass p-6 text-center">
          <h1 className="font-display text-3xl">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">{session.user.email} does not have admin access.</p>
          <Button className={`${secondary} mt-4`} onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" />Sign out</Button>
        </div>
      ) : !stats || loading ? <div className="flex justify-center py-24"><Loader2 className="animate-spin" /></div> : <Dashboard stats={stats} reload={load} />}
    </Shell>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checks = passwordChecks(password);
  const strong = checks.every((c) => c.ok);
  return (
    <form className="mx-auto max-w-md space-y-4 rounded-lg glass p-6" onSubmit={async (e) => {
      e.preventDefault(); if (!strong) { setError("Admin passwords must meet every strength rule."); return; }
      setBusy(true); setError("");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false); if (error) setError(error.message);
    }}>
      <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /><h1 className="font-display text-3xl">Admin sign in</h1></div>
      <label className="block text-xs">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border bg-glass-strong p-3 text-sm" /></label>
      <label className="block text-xs">Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border bg-glass-strong p-3 text-sm" /></label>
      <ul className="grid grid-cols-2 gap-1 text-xs">{checks.map((c) => <li key={c.label} className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.ok ? "✓" : "○"} {c.label}</li>)}</ul>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || !strong} className={`${primary} w-full`}>{busy ? "Signing in…" : "Sign in"}</Button>
      <p className="text-xs text-muted-foreground">Weak current password? Use "Forgot password?" on the Resume page to set a strong one first.</p>
    </form>
  );
}

function download(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Dashboard({ stats, reload }: { stats: Stats; reload: () => void }) {
  const [tab, setTab] = useState<"recent_chats" | "recent_searches" | "recent_quizzes">("recent_chats");
  const cards: [string, number][] = [
    ["Users", stats.users], ["Total queries", stats.chats + stats.searches + stats.quizzes], ["Copilot chats", stats.chats],
    ["Searches", stats.searches], ["Quizzes (submitted)", stats.quizzes_submitted], ["Resumes", stats.resumes], ["Saved roles", stats.saved_roles],
  ];
  const day = new Date().toISOString().slice(0, 10);
  const [preview, setPreview] = useState<string[] | null>(null);
  const openPreview = async () => {
    const { data, error } = await rpc("admin_dataset");
    if (error || !data) { alert("Dataset could not load."); return; }
    const d = data as { chats: ChatRow[]; quizzes: QuizRow[] };
    setPreview(buildLines(d.chats, d.quizzes));
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-5xl">Admin console</h1>
        <div className="flex gap-2">
          <Button className={secondary} onClick={reload}>Refresh</Button>
          <Button className={secondary} onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" />Sign out</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([l, n]) => <div key={l} className="rounded-lg glass p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-3xl font-semibold">{n}</p></div>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className={primary} onClick={() => download(`grinder-data-${day}.json`, JSON.stringify(stats, null, 2))}><Download className="h-4 w-4" />All data (.json)</Button>
        <Button className={secondary} onClick={openPreview}><Download className="h-4 w-4" />Fine-tuning export (.jsonl)</Button>
      </div>
      <StoragePanel />
      {preview && <ExportPreview lines={preview} onClose={() => setPreview(null)} base={`grinder-finetune-all-${day}`} />}
      <section className="rounded-lg glass p-4">
        <h2 className="mb-3 font-semibold">Recent users</h2>
        <div className="max-h-64 overflow-y-auto text-sm">{stats.recent_users.map((u) => <div key={u.email + u.created_at} className="flex justify-between border-b py-2"><span>{u.email}</span><span className="text-xs text-muted-foreground">joined {new Date(u.created_at).toLocaleDateString()}</span></div>)}</div>
      </section>
      <section className="rounded-lg glass p-4">
        <div className="mb-3 flex gap-2">{([["recent_chats", "Chats"], ["recent_searches", "Searches"], ["recent_quizzes", "Quizzes"]] as const).map(([k, l]) =>
          <Button key={k} onClick={() => setTab(k)} className={tab === k ? primary : secondary}>{l} ({stats[k].length})</Button>)}</div>
        <pre className="max-h-[32rem] overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(stats[tab], null, 2)}</pre>
      </section>
    </div>
  );
}

function StoragePanel() {
  const [s, setS] = useState<Storage | null>(null);
  useEffect(() => { rpc("admin_storage").then(({ data }) => setS(data as Storage | null)); }, []);
  if (!s) return <section className="rounded-lg glass p-4 text-sm text-muted-foreground">Loading storage…</section>;
  const db = s.tables.reduce((a, t) => a + t.bytes, 0);
  return (
    <section className="rounded-lg glass p-4">
      <h2 className="mb-3 font-semibold">Storage used</h2>
      <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Database</p><p className="text-xl font-semibold">{formatBytes(db)}</p></div>
        <div><p className="text-xs text-muted-foreground">Uploaded files ({s.files_count})</p><p className="text-xl font-semibold">{formatBytes(s.files_bytes)}</p></div>
        <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-semibold">{formatBytes(db + s.files_bytes)}</p></div>
      </div>
      <div className="text-xs">{s.tables.map((t) => <div key={t.name} className="flex justify-between border-b py-1"><span>{t.name.replace(/_/g, " ")}</span><span>{formatBytes(t.bytes)}</span></div>)}</div>
    </section>
  );
}

function ExportPreview({ lines, onClose, base }: { lines: string[]; onClose: () => void; base: string }) {
  const issues: Issue[] = validateLines(lines);
  const bytes = new TextEncoder().encode(lines.join("\n") + "\n").length;
  const parts = splitLines(lines).length;
  const [i, setI] = useState(0);
  const sample = lines[i];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Export preview" className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-lg glass-strong p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-3xl">Check your export</h2>
        <div className="my-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Examples</p><p className="text-xl font-semibold">{lines.length}</p></div>
          <div><p className="text-xs text-muted-foreground">File size</p><p className="text-xl font-semibold">{formatBytes(bytes)}</p></div>
          <div><p className="text-xs text-muted-foreground">Files (max {formatBytes(NEBIUS_MAX_BYTES)} each)</p><p className="text-xl font-semibold">{parts}</p></div>
          <div><p className="text-xs text-muted-foreground">Format</p><p className={`text-xl font-semibold ${issues.length ? "text-destructive" : ""}`}>{issues.length ? `${issues.length} issues` : "✓ Conversational"}</p></div>
        </div>
        {issues.length > 0 && <ul className="mb-3 max-h-32 overflow-y-auto rounded-md bg-muted p-3 text-xs text-destructive">{issues.slice(0, 50).map((x, k) => <li key={k}>Line {x.line}: {x.message}</li>)}</ul>}
        {lines.length === 0 ? <p className="text-sm text-muted-foreground">No chats or submitted quizzes yet.</p> : <>
          <div className="mb-2 flex items-center gap-2 text-sm">
            <Button className={secondary} disabled={i === 0} onClick={() => setI(i - 1)}>Previous</Button>
            <span>Line {i + 1} of {lines.length}</span>
            <Button className={secondary} disabled={i >= lines.length - 1} onClick={() => setI(i + 1)}>Next</Button>
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{sample ? JSON.stringify(JSON.parse(sample), null, 2) : ""}</pre>
        </>}
        <div className="mt-4 flex justify-end gap-2">
          <Button className={secondary} onClick={onClose}>Close</Button>
          <Button className={primary} disabled={!lines.length} onClick={() => downloadParts(lines, base)}><Download className="h-4 w-4" />Download {parts > 1 ? `${parts} files` : "file"}</Button>
        </div>
      </div>
    </div>
  );
}
