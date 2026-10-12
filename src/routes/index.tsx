import { Button } from "@/components/Button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Globe, MapPin, Briefcase, Search } from "lucide-react";
import { Shell } from "@/components/Shell";
import { FEATURED, logoFor } from "@/lib/companies";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grinder — Discover careers & open roles" },
      { name: "description", content: "Pick a company and research its official careers site and current open roles with Tavily." },
      { property: "og:title", content: "Grinder — Discover careers & open roles" },
      { property: "og:description", content: "Research-powered company and job discovery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const nav = useNavigate();
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  const go = (name: string, domain?: string) =>
    nav({ to: "/company/$name", params: { name }, search: { domain, title: title || undefined, location: location || undefined } });

  return (
    <Shell>
      <section className="mx-auto max-w-4xl pt-5 text-center">
        <h1 className="font-display text-5xl leading-tight tracking-normal sm:text-6xl">Grind Your Resume</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Your experience stays. Your applications get smarter. Discover opportunities, understand what employers need,
          and improve your application with research.
        </p>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (company.trim()) {
            const isUrl = company.includes(".");
            go(isUrl ? company.replace(/^https?:\/\//, "").split(".")[0] ?? company : company.trim(), isUrl ? company : undefined);
          }
        }}
        className="mx-auto mt-7 max-w-4xl space-y-4 rounded-lg glass p-5 text-left"
      >
        <label className="text-sm font-medium">Company name or website</label>
        <div className="flex items-center gap-3 rounded-lg bg-glass-strong px-4">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Which company are you curious about?"
            className="h-14 flex-1 bg-transparent outline-none"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field icon={<Briefcase className="h-4 w-4" />} label="Job title" value={title} onChange={setTitle} ph="e.g. Product Designer" />
          <Field icon={<MapPin className="h-4 w-4" />} label="Location" value={location} onChange={setLocation} ph="e.g. Remote, London" />
        </div>
        <Button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 font-medium text-primary-foreground transition hover:opacity-90">
          <Search className="h-4 w-4" /> Find Careers & Open Roles
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">Try exploring</p>
      <div className="mx-auto mt-3 grid max-w-6xl grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {FEATURED.map(([name, domain]) => (
          <Button
            key={name}
            onClick={() => go(name, domain)}
            className="flex items-center justify-start gap-2 rounded-lg glass px-3 py-2.5 text-sm transition hover:-translate-y-0.5 hover:bg-glass-strong"
          >
            <img src={logoFor(domain)} alt="" className="h-5 w-5 shrink-0 rounded" loading="lazy" />
            {name}
          </Button>
        ))}
      </div>
      <p className="mt-6 text-center text-sm">
        <Link to="/yc" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Globe className="h-4 w-4" /> Or explore hiring Y Combinator startups →
        </Link>
      </p>
    </Shell>
  );
}

function Field({ icon, label, value, onChange, ph }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; ph: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm font-medium">
        {label} <span className="text-xs font-normal text-muted-foreground">Optional</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 text-muted-foreground">
        {icon}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none" />
      </div>
    </div>
  );
}
