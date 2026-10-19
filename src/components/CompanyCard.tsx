import { companyLink } from "@/lib/company-slug";
import { cleanDomain } from "@/lib/companies";
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { CommunityCompany } from '@/lib/company-profile';
import { companyLogo } from '@/lib/company-profile';

export function CompanyMark({ website, name }: { website: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-glass-strong font-semibold">{failed || !website ? name.charAt(0).toUpperCase() : <img key={website} src={companyLogo(website)} alt="" onError={() => setFailed(true)} className="h-11 w-11 rounded-lg object-contain" loading="lazy" />}</div>;
}
export function CompanyCard({ company: c }: { company: CommunityCompany }) {
  return <Link {...companyLink(c.name, cleanDomain(c.website))} className="group flex min-h-44 flex-col rounded-lg glass p-4 transition hover:-translate-y-0.5 hover:bg-glass-strong">
    <div className="flex items-center gap-3"><CompanyMark website={c.website} name={c.name}/><div className="min-w-0"><div className="break-words font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.industry || 'GrinderResume Community'}</div></div></div>
    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{c.one_liner || new URL(c.website).hostname}</p>
    <div className="mt-auto flex flex-wrap justify-between gap-2 pt-3 text-xs text-muted-foreground"><span>{c.location || 'Community company'}</span><span>{c.people >= 3 ? `${c.people} alumni` : 'Shared by members'}</span></div>
  </Link>;
}