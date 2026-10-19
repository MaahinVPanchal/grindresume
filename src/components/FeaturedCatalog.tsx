import { companyLink } from "@/lib/company-slug";
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/Button';
import { CompanyMark } from '@/components/CompanyCard';
import { FEATURED } from '@/lib/companies';

const PER_PAGE = 12;

export function FeaturedCatalog({ query = '' }: { query?: string }) {
  const [page, setPage] = useState(0);
  const q = query.trim().toLowerCase();
  const list = FEATURED.filter(([n]) => !q || n.toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const p = Math.min(page, pages - 1);
  const shown = list.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE);
  if (!list.length) return null;
  return (
    <section className="mx-auto mt-8 max-w-6xl">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4" />Featured companies</h2>
      <p className="mt-1 text-xs text-muted-foreground">{list.length} companies · showing {p * PER_PAGE + 1}–{p * PER_PAGE + shown.length}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map(([name, domain]) => (
          <Link key={name} {...companyLink(name, domain)} className="flex min-h-28 flex-col rounded-lg glass p-4 transition hover:-translate-y-0.5 hover:bg-glass-strong">
            <div className="flex items-center gap-3"><CompanyMark website={`https://${domain}`} name={name} /><div className="min-w-0"><div className="break-words font-medium">{name}</div><div className="text-xs text-muted-foreground">{domain}</div></div></div>
            <p className="mt-auto pt-3 text-xs text-muted-foreground">Research open roles →</p>
          </Link>
        ))}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button disabled={p === 0} onClick={() => setPage(p - 1)} className="rounded-lg glass px-3 py-1.5 disabled:opacity-40">Previous</Button>
          <span className="text-muted-foreground">Page {p + 1} of {pages}</span>
          <Button disabled={p >= pages - 1} onClick={() => setPage(p + 1)} className="rounded-lg glass px-3 py-1.5 disabled:opacity-40">Next</Button>
        </div>
      )}
    </section>
  );
}
