import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { Database, FileText, LogOut, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportFineTuneDataset } from "@/lib/finetune-export";
import { useServerFn } from '@tanstack/react-start';
import { getAccountAllowances } from '@/lib/allowances.functions';
import { useKeys } from '@/lib/keys';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProfileMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowances, setAllowances] = useState<Awaited<ReturnType<typeof getAccountAllowances>> | null>(null);
  const [allowanceError, setAllowanceError] = useState(false);
  const loadAllowances = useServerFn(getAccountAllowances);
  const keys = useKeys();
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let cancelled = false;
    setIsAdmin(false);
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => { if (!cancelled) setIsAdmin(data === true); });
    return () => { cancelled = true; };
  }, [user]);
  useEffect(() => {
    let cancelled = false;
    setAllowances(null);
    const load = () => {
      if (!user) return;
      void loadAllowances().then(data => { if (!cancelled) { setAllowances(data); setAllowanceError(false); } }).catch(() => { if (!cancelled) setAllowanceError(true); });
    };
    load();
    window.addEventListener('grinder-usage-changed', load);
    return () => { cancelled = true; window.removeEventListener('grinder-usage-changed', load); };
  }, [user?.id, keys.nebius, keys.tavily, loadAllowances]);

  if (!user)
    return (
      <Link to="/resume" className="flex items-center gap-2 rounded-lg glass px-3 py-2 text-sm font-medium">
        <UserRound className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const name = meta.full_name || meta.name || user.email?.split("@")[0] || "You";
  const avatar = meta.avatar_url || meta.picture;
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu onOpenChange={open => { if (open && user) void loadAllowances().then(data => { setAllowances(data); setAllowanceError(false); }).catch(() => setAllowanceError(true)); }}>
      <DropdownMenuTrigger
        aria-label="Open profile menu"
        className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-glass-strong bg-primary font-semibold text-primary-foreground shadow-sm outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-2 px-2 py-2" aria-label="Remaining account allowances" aria-live="polite">
          <p className="text-xs font-semibold">Your remaining credits</p>
          {allowanceError ? <p className="text-xs text-destructive">Credits could not load. Reopen to retry.</p> : !allowances ? <p className="text-xs text-muted-foreground">Loading credits…</p> : allowances.map(a => <div key={a.kind} className="flex items-center justify-between gap-2 text-xs"><span>{a.label}</span><span className="font-medium">{a.unlimited ? 'Unlimited · your key' : `${a.remaining}/${a.limit} ${a.period === 'daily' ? 'today' : 'total'}`}</span></div>)}
          <p className="text-xs text-muted-foreground">Daily credits reset at midnight UTC.</p>
        </div>
        <DropdownMenuItem onSelect={() => window.dispatchEvent(new Event('grinder-open-keys'))}>Connect my keys</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/resume" })}>
          <FileText className="mr-2 h-4 w-4" /> My resume
        </DropdownMenuItem>
        {isAdmin && <DropdownMenuItem onSelect={async () => { try { const n = await exportFineTuneDataset(); if (!n) alert("No saved chats or submitted quizzes yet."); } catch { alert('Fine-tuning exports are available to admins only.'); } }}>
          <Database className="mr-2 h-4 w-4" /> Export fine-tuning data (.jsonl)
        </DropdownMenuItem>}
        {isAdmin && (
          <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })}>
            <UserRound className="mr-2 h-4 w-4" /> Admin console
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => supabase.auth.signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
