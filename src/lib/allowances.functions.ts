import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { FREE_ALLOWANCES, remainingAllowance } from './allowances';

export const getAccountAllowances = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { demoRemaining } = await import('./demo.server');
    const [{ data: keys, error: keyError }, { data: rows, error: usageError }, { data: ats, error: atsError }] = await Promise.all([
      context.supabase.from('user_api_keys').select('nebius,tavily').eq('user_id', context.userId).maybeSingle(),
      context.supabase.from('feature_allowance_usage').select('kind').eq('user_id', context.userId),
      supabaseAdmin.rpc('demo_used', { _bucket: `v:${context.userId}`, _kind: 'ats' }),
    ]);
    if (keyError || usageError || atsError) throw new Error('Your allowances could not load.');
    const chat = await demoRemaining(context.userId);
    return Object.entries(FREE_ALLOWANCES).map(([kind, rule]) => ({
      kind, label: rule.label, limit: rule.limit, period: rule.period,
      unlimited: Boolean(keys?.[rule.provider]),
      remaining: kind === 'chat' ? chat : remainingAllowance(kind as keyof typeof FREE_ALLOWANCES,
        kind === 'ats' ? Number(ats) : (rows ?? []).filter(row => row.kind === kind).length),
    }));
  });

export const reserveResumeUpload = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ path: z.string().max(400), apiKey: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`) || data.path.includes('..')) throw new Error('Invalid upload path.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.apiKey?.trim()) {
      // A caller-supplied key is used for processing; it never unlocks the owner's AI key.
      const { error } = await supabaseAdmin.from('feature_allowance_usage').insert({ user_id: context.userId, kind: 'upload', period: '1970-01-01', resource: data.path });
      if (error) throw new Error('Upload could not be authorized.');
    } else {
      const { data: left, error } = await supabaseAdmin.rpc('consume_feature_allowance', { _user: context.userId, _kind: 'upload', _resource: data.path });
      if (error) throw new Error('Upload allowance could not be checked.');
      if (Number(left) < 0) throw new Error('Your one free resume upload has been used. Connect your own Nebius key for unlimited uploads.');
    }
  });

export const getAdminFineTuneDataset = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (error || admin !== true) throw new Error('Fine-tuning exports are available to admins only.');
    const { data, error: datasetError } = await context.supabase.rpc('admin_dataset');
    if (datasetError) throw new Error('The dataset could not load.');
    return data;
  });