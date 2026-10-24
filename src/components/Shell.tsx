import { Button } from "@/components/Button";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Check, MessageCircle, X, Github, Linkedin, Youtube } from "lucide-react";
import bg from "@/assets/landscape.webp.asset.json";
import { saveKeys, useKeys } from "@/lib/keys";
import { useServerFn } from "@tanstack/react-start";
import { validateTavily, listNebiusModels } from "@/lib/research.functions";
import { ProfileMenu } from "@/components/ProfileMenu";
import { ChatPanel } from './ChatPanel';

export function DevpostIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.002 1.61L0 12.004 6.002 22.39h11.996L24 12.004 17.998 1.61H6.002zm1.593 4.084h3.947c2.75 0 4.802 1.42 4.802 4.083 0 2.663-2.052 4.083-4.802 4.083H7.595V5.694zm2.585 2.122v4.005h1.22c1.393 0 2.27-.69 2.27-2.003 0-1.312-.877-2.002-2.27-2.002h-1.22z" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(false);
  const keys = useKeys();
  const ready = !!keys.tavily && !!keys.nebius;
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("grinder-open-keys", h);
    return () => window.removeEventListener("grinder-open-keys", h);
  }, []);
  return (
    <div className="relative isolate min-h-screen">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg.url})` }}
        aria-hidden
      />
      <div className="fixed inset-0 -z-10 bg-background/35" aria-hidden />
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-display text-xl text-primary-foreground">
            g
          </span>
          <span className="text-xl font-semibold tracking-normal">GrinderResume</span>
          <span className="hidden font-display text-lg italic text-muted-foreground xl:inline">/careers</span>
        </Link>
        <nav className="order-3 flex w-full flex-wrap items-center justify-center gap-0.5 rounded-full glass p-1 text-sm lg:order-none lg:w-auto">

          {([
            ["/", "Discover"],
            ["/resume", "Resume"],
            ["/yc", "YC Explorer"],
            ["/quiz", "Fit quiz"],
            ["/saved", "Saved"],
            ["/focus", "Our focus"],
          ] as const).map(([to, l]) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "bg-primary !text-primary-foreground" }}
            >
              {l}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button aria-label="Ask GrinderResume" title="Ask GrinderResume" className="grid h-9 w-9 place-items-center rounded-full bg-glass-strong" onClick={()=>setAsk(true)}><MessageCircle className="h-4 w-4"/></Button>
          <Button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">{ready ? "Keys connected" : "Connect keys"}</span>
            <span className={`h-2 w-2 rounded-full ${ready ? "bg-sage" : "bg-peach"}`} />
          </Button>
          <ProfileMenu />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 pb-8">{children}</main>
      <footer className="mx-auto max-w-7xl border-t border-border/40 px-5 py-8 text-xs text-muted-foreground">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary font-display text-sm text-primary-foreground">
              g
            </span>
            <span className="font-semibold text-foreground">GrinderResume</span>
            <span className="text-muted-foreground">/ Careers & Resume Workspace</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://github.com/MaahinVPanchal/grindresume"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full glass-strong px-3 py-1.5 hover:text-foreground transition font-medium"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
            <a
              href="https://devpost.com/software/grinderresume"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full glass-strong px-3 py-1.5 hover:text-foreground transition font-medium text-teal-600 dark:text-teal-400"
            >
              <DevpostIcon className="h-3.5 w-3.5" />
              <span>Devpost</span>
            </a>
            <a
              href="https://www.youtube.com/watch?v=83adL-GZ4IY"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full glass-strong px-3 py-1.5 hover:text-foreground transition font-medium text-red-600 dark:text-red-400"
            >
              <Youtube className="h-3.5 w-3.5" />
              <span>Demo Video</span>
            </a>
            <a
              href="https://www.linkedin.com/feed/update/urn:li:activity:7516032835724484609/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full glass-strong px-3 py-1.5 hover:text-foreground transition font-medium text-blue-600 dark:text-blue-400"
            >
              <Linkedin className="h-3.5 w-3.5" />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </footer>
      {open && <Settings onClose={() => setOpen(false)} />}
      {ask&&<div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4" onClick={()=>setAsk(false)}><div role="dialog" aria-label="Ask GrinderResume" aria-modal="true" className="w-full max-w-xl" onClick={e=>e.stopPropagation()}><Button aria-label="Close assistant" title="Close assistant" onClick={()=>setAsk(false)} className="mb-2 ml-auto grid h-8 w-8 place-items-center rounded-full bg-glass-strong"><X className="h-4 w-4"/></Button><ChatPanel title="Ask GrinderResume" context="Ask which company or role the user wants to explore if no employer context is provided. Do not invent candidate experience." className="h-[65dvh]" suggestions={['Help me choose a company to explore.','What role should I research next?']}/></div></div>}
    </div>
  );
}

function KeyField({
  label,
  hint,
  href,
  value,
  onChange,
  placeholder,
  status,
}: {
  label: string;
  hint: string;
  href: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  status: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-lg glass p-4">
      <div className="mb-2 flex items-center justify-between text-sm font-medium">
        {label}
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
      <div className="flex items-center rounded-lg bg-muted px-3">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 flex-1 bg-transparent text-sm outline-none"
        />
        <Button onClick={() => setShow(!show)} className="text-muted-foreground" aria-label="Toggle visibility">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {hint}{" "}
        <a href={href} target="_blank" rel="noreferrer" className="underline">
          {href.replace("https://", "")}
        </a>
      </p>
    </div>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const keys = useKeys();
  const [tav, setTav] = useState(keys.tavily);
  const [neb, setNeb] = useState(keys.nebius);
  useEffect(() => {
    setTav((v) => v || keys.tavily);
    setNeb((v) => v || keys.nebius);
  }, [keys.tavily, keys.nebius]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; n: string }>({ t: "", n: "" });
  const vT = useServerFn(validateTavily);
  const vN = useServerFn(listNebiusModels);

  async function save() {
    setBusy(true);
    const [t, n] = await Promise.all([
      tav ? vT({ data: { apiKey: tav } }) : Promise.resolve({ ok: false as const, error: "Missing" }),
      neb ? vN({ data: { apiKey: neb } }) : Promise.resolve({ ok: false as const, error: "Missing", models: [] }),
    ]);
    setMsg({
      t: t.ok ? "Verified" : t.error,
      n: n.ok ? `Verified · ${n.models.length} models` : n.error,
    });
    saveKeys({
      tavily: t.ok ? tav : keys.tavily,
      nebius: n.ok ? neb : keys.nebius,
      model: n.ok && !n.models.includes(keys.model) ? n.models[0] || "" : keys.model,
    });
    setBusy(false);
    if (t.ok && n.ok) setTimeout(onClose, 600);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-lg glass-strong p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-3xl">Connect your keys</h2>
        <p className="text-sm text-muted-foreground">
          When signed in, keys are saved privately to your account so you only add them once. Update them here anytime.
        </p>
        <KeyField
          label="1 · Tavily API key"
          hint="Get your key at"
          href="https://app.tavily.com"
          value={tav}
          onChange={setTav}
          placeholder="tvly-xxxx..."
          status={msg.t || (keys.tavily ? "Saved" : "")}
        />
        <KeyField
          label="2 · Nebius AI Studio key"
          hint="Get your key at"
          href="https://tokenfactory.nebius.com"
          value={neb}
          onChange={setNeb}
          placeholder="eyJhbGci..."
          status={msg.n || (keys.nebius ? "Saved" : "")}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">
            Close
          </Button>
          <Button
            onClick={save}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Verify & save
          </Button>
        </div>
      </div>
    </div>
  );
}
