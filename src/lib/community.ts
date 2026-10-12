import { supabase } from '@/integrations/supabase/client';
import type { Resume } from '@/lib/resume-model';
import type { CommunityCompany } from './company-profile';

const SELF = /^(self[- ]?employed|freelance|freelancer|independent|confidential|stealth|n\/?a)$/i;

/** Employer names from experience entries only — never titles, dates or descriptions. */
export function employersFrom(resume: Resume): { key: string; name: string }[] {
  const out = new Map<string, string>();
  for (const s of resume.sections) {
    if (s.kind !== 'experience') continue;
    for (const e of s.entries) {
      const name = ((e.subtitle || '').split(/\s[·|–—-]\s|\(|,|·|\|/)[0] || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (name.length < 2 || SELF.test(name)) continue;
      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(inc|llc|ltd|limited|corp|corporation|pvt|private|gmbh|co)\b/g, '').trim();
      if (key && !out.has(key)) out.set(key, name);
    }
  }
  return [...out].map(([key, name]) => ({ key, name }));
}

export async function getSharing(): Promise<boolean> {
  const { data, error } = await supabase.from('company_sharing').select('share').maybeSingle();
  if (error) throw error;
  return !!data?.share;
}

export async function setSharing(userId: string, share: boolean, _resume?: Resume) {
  const { error } = await supabase.from('company_sharing').upsert({ user_id: userId, share, updated_at: new Date().toISOString() });
  if (error) throw error;
  if (!share) {
    const { error: e } = await supabase.from('shared_companies').delete().eq('user_id', userId);
    if (e) throw e;
  }
}

export async function communityCompanies(): Promise<CommunityCompany[]> {
  const { data, error } = await supabase.rpc('community_catalog');
  if (error) throw error;
  return data || [];
}
