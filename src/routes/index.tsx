import { Button } from "@/components/Button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Globe, MapPin, Briefcase, Search, Upload, ArrowRight, Github, Linkedin, Youtube } from "lucide-react";
import { Shell, DevpostIcon } from "@/components/Shell";
import { CompanyTicker } from "@/components/CompanyTicker";
import { CommunityCatalog } from "@/components/CommunityCatalog";
import { FeaturedCatalog } from "@/components/FeaturedCatalog";
import { resolveCompany } from "@/lib/role-match";

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
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <a
            href="https://github.com/MaahinVPanchal/grindresume"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full glass-strong px-4 py-2 text-xs font-medium hover:border-foreground/30 transition shadow-sm text-foreground hover:bg-muted"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
          <a
            href="https://devpost.com/software/grinderresume"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full glass-strong px-4 py-2 text-xs font-medium hover:border-foreground/30 transition shadow-sm text-teal-600 dark:text-teal-400 hover:bg-muted"
          >
            <DevpostIcon className="h-4 w-4" />
            <span>Devpost</span>
          </a>
          <a
            href="https://youtu.be/83adL-GZ4IY"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full glass-strong px-4 py-2 text-xs font-medium hover:border-foreground/30 transition shadow-sm text-red-600 dark:text-red-400 hover:bg-muted"
          >
            <Youtube className="h-4 w-4" />
            <span>Demo Video</span>
          </a>
          <a
            href="https://www.linkedin.com/feed/update/urn:li:activity:7516032835724484609/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full glass-strong px-4 py-2 text-xs font-medium hover:border-foreground/30 transition shadow-sm text-blue-600 dark:text-blue-400 hover:bg-muted"
          >
            <Linkedin className="h-4 w-4" />
            <span>LinkedIn</span>
          </a>
        </div>
      </section>

      <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-between gap-4 border-y border-border py-4 text-left">
        <div className="flex items-center gap-3"><Upload className="h-5 w-5 text-muted-foreground"/><div><p className="text-sm font-semibold">Make your next application count.</p><p className="text-xs text-muted-foreground">Your resume, ready for the right opportunity.</p></div></div>
        <Link to="/resume" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Upload resume <ArrowRight className="h-4 w-4"/></Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (company.trim()) {
            const known = resolveCompany(company);
            const isUrl = company.includes(".");
            if (known) void go(known.name, known.domain);
            else void go(isUrl ? company.replace(/^https?:\/\//, "").split(".")[0] ?? company : company.trim(), isUrl ? company : undefined);
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

      <CompanyTicker onSelect={go} />
      <FeaturedCatalog query={company.includes('.') ? '' : company}/>
      <CommunityCatalog query={company.includes('.') ? '' : company}/>
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
