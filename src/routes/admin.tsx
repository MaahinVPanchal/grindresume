import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Download, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — Grinder" },
      { name: "description", content: "Private admin console for Grinder usage metrics and data exports." },
      { property: "og:title", content: "Admin console — Grinder" },
      { property: "og:description", content: "Users, queries and dataset exports for Grinder admins." },
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
  const jsonl = (stats.recent_chats as { messages: unknown }[]).map((c) => JSON.stringify({ messages: c.messages })).join("\n");
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
        <Button className={secondary} onClick={() => download(`grinder-chats-${day}.jsonl`, jsonl, "application/jsonl")}><Download className="h-4 w-4" />Chats (.jsonl)</Button>
      </div>
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
