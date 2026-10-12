import { useState } from 'react';
import { ArrowRight, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/Button';
import { CompanyMark } from '@/components/CompanyCard';
import { FEATURED } from '@/lib/companies';

const PAGE_SIZE = 12;
const companies = [...FEATURED].sort((a, b) => Number(a[0].length >= 14) - Number(b[0].length >= 14));

export function FeaturedCompanyCatalog({ query, onSelect }: { query: string; onSelect: (name: string, domain: string) => void }) {
  const [pagination, setPagination] = useState({ query: '', page: 0 });
  const q = query.trim().toLowerCase();
  const page = pagination.query === q ? pagination.page : 0;
  const shown = companies.filter(([name, domain]) => !q || `${name} ${domain}`.toLowerCase().includes(q));
  const pages = Math.ceil(shown.length / PAGE_SIZE);
  const changePage = (next: number) => setPagination({ query: q, page: next });
  return (
    <section aria-label="Browse companies" className="mx-auto mt-8 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Building2 className="h-4 w-4" />Browse companies</h2>
        <span className="text-xs text-muted-foreground">{shown.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, shown.length)} of ${shown.length} companies` : '0 companies'}</span>
      </div>
      {shown.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(([name, domain]) => (
          <Button key={domain} onClick={() => onSelect(name, domain)} className="group flex min-h-36 flex-col rounded-lg glass p-4 text-left transition hover:-translate-y-0.5 hover:bg-glass-strong">
            <div className="flex items-center gap-3"><CompanyMark website={`https://${domain}`} name={name} /><div className="min-w-0"><div className="break-words font-medium">{name}</div><div className="break-all text-xs text-muted-foreground">{domain}</div></div></div>
            <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted-foreground">Careers & open roles<ArrowRight className="h-4 w-4 shrink-0" /></span>
          </Button>
        ))}
      </div> : <p className="mt-3 text-sm text-muted-foreground">No matching companies.</p>}
      {pages > 1 && <nav aria-label="Browse company pages" className="mt-4 flex items-center justify-center gap-3">
        <Button aria-label="Previous company page" title="Previous company page" disabled={page === 0} onClick={() => changePage(page - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg glass disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></Button>
        <span aria-live="polite" className="text-xs text-muted-foreground">Page {page + 1} of {pages}</span>
        <Button aria-label="Next company page" title="Next company page" disabled={page + 1 >= pages} onClick={() => changePage(page + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg glass disabled:opacity-40"><ChevronRight className="h-4 w-4" /></Button>
      </nav>}
    </section>
  );
}