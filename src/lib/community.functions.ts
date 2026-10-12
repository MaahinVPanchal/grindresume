import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { CompanyProfileSchema, companyLogo } from './company-profile';

export const inspectCompanyWebsite = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ website: z.string().min(1).max(253) }).parse(d))
  .handler(async ({ data }) => {
    try { const { readCompanyMetadata } = await import('./company-metadata.server'); return { ok: true as const, ...await readCompanyMetadata(data.website) }; }
    catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : 'Website lookup failed. Enter details yourself.' }; }
  });

export const confirmCompany = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => CompanyProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: sharing, error: sharingError } = await context.supabase.from('company_sharing').select('share').eq('user_id', context.userId).maybeSingle();
    if (sharingError || !sharing?.share) throw new Error('Enable employer sharing before confirming a company.');
    const { error } = await context.supabase.from('shared_companies').upsert({ user_id: context.userId, name_key: data.key, display_name: data.name, website: data.website, logo_url: companyLogo(data.website), one_liner: data.oneLiner, industry: data.industry, location: data.location, confirmed_at: new Date().toISOString() }, { onConflict: 'user_id,name_key' });
    if (error) throw new Error('Could not save the company. Please retry.');
    return { ok: true };
  });