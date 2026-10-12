import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/Button';
import { FEATURED, logoFor } from '@/lib/companies';

type FeaturedCompany = (typeof FEATURED)[number];
const rows: FeaturedCompany[][] = [[], [], [], []];
let compactIndex = 0;
for (const company of FEATURED) {
  const row = company[0].length >= 14 ? rows[3] : rows[compactIndex++ % 3];
  row?.push(company);
}

export function CompanyTicker({ onSelect }: { onSelect: (name: string, domain: string) => void }) {
  const [paused, setPaused] = useState(false);
  return (
    <section aria-label="Explore companies" className="mx-auto mt-8 max-w-6xl min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Try exploring</p>
        <Button aria-label={paused ? 'Play company ticker' : 'Pause company ticker'} aria-pressed={paused} title={paused ? 'Play company ticker' : 'Pause company ticker'} onClick={() => setPaused(value => !value)} className="flex h-8 w-8 items-center justify-center rounded-lg glass text-muted-foreground hover:text-foreground">
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className={`company-ticker space-y-2${paused ? ' ticker-paused' : ''}`}>
        {rows.map((companies, rowIndex) => (
          <div key={rowIndex} className={`company-ticker-lane ticker-lane-${rowIndex + 1}`}>
            <div className="company-ticker-track">
              {[false, true].map(duplicate => (
                <div key={String(duplicate)} aria-hidden={duplicate || undefined} className={`company-ticker-group${duplicate ? ' ticker-duplicate' : ''}`}>
                  {companies.map(([name, domain]) => (
                    <Button key={name} tabIndex={duplicate ? -1 : 0} onClick={() => onSelect(name, domain)} className="flex h-11 shrink-0 items-center justify-start gap-2 whitespace-nowrap rounded-lg glass px-4 text-sm transition hover:bg-glass-strong">
                      <img src={logoFor(domain)} alt="" className="h-5 w-5 shrink-0 rounded" loading="lazy" />
                      {name}
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}