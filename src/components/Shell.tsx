import { Button } from "@/components/Button";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Check } from "lucide-react";
import bg from "@/assets/landscape.webp.asset.json";
import { saveKeys, useKeys } from "@/lib/keys";
import { useServerFn } from "@tanstack/react-start";
import { validateTavily, listNebiusModels } from "@/lib/research.functions";

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const keys = useKeys();
  const ready = !!keys.tavily && !!keys.nebius;
  return (
    <div className="relative isolate min-h-screen">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg.url})` }}
        aria-hidden
      />
      <div className="fixed inset-0 -z-10 bg-background/35" aria-hidden />
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-display text-xl text-primary-foreground">
            g
          </span>
          <span className="text-xl font-semibold tracking-normal">grinder</span>
          <span className="hidden font-display text-lg italic text-muted-foreground sm:inline">/careers</span>
        </Link>
        <nav className="order-3 flex w-full items-center justify-center gap-1 rounded-full glass p-1 text-sm sm:order-none sm:w-auto">
          {([
            ["/", "Discover"],
            ["/yc", "YC Explorer"],
            ["/chat", "Chat"],
          ] as const).map(([to, l]) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="rounded-full px-4 py-1.5 text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "bg-primary !text-primary-foreground" }}
            >
              {l}
            </Link>
          ))}
        </nav>
        <Button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <KeyRound className="h-4 w-4" />
          <span className="hidden sm:inline">{ready ? "Keys connected" : "Connect keys"}</span>
          <span className={`h-2 w-2 rounded-full ${ready ? "bg-sage" : "bg-peach"}`} />
        </Button>
      </header>
      <main className="mx-auto max-w-7xl px-5 pb-16">{children}</main>
      {open && <Settings onClose={() => setOpen(false)} />}
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
          Keys are kept only in this browser and sent to our server just to call Tavily and Nebius.
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
