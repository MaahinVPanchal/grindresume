import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/Button';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [
    { title: 'Reset your password - GrinderResume' },
    { name: 'description', content: 'Choose a new password for your GrinderResume account.' },
    { property: 'og:title', content: 'Reset your password - GrinderResume' },
    { property: 'og:description', content: 'Securely set a new password for your GrinderResume workspace.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ResetPasswordPage,
});

const primary = 'inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const fromLink = hash.includes('type=recovery') || new URLSearchParams(window.location.search).has('code');
    const linkError = new URLSearchParams(hash.slice(1)).get('error_description');
    if (linkError) { setError(linkError.replace(/\+/g, ' ')); setState('invalid'); return; }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setState('ready');
    });
    const timer = window.setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      setState((cur) => (cur !== 'checking' ? cur : s.session && fromLink ? 'ready' : 'invalid'));
    }, 1200);
    return () => { data.subscription.unsubscribe(); window.clearTimeout(timer); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords don’t match.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setBusy(false); return; }
    // Sign out everywhere so the old session can't be reused; sign in again with the new password.
    await supabase.auth.signOut({ scope: 'global' });
    setBusy(false);
    setState('done');
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md py-12">
        <div className="rounded-lg glass p-6">
          <h1 className="mb-2 text-lg font-semibold">Reset your password</h1>
          {state === 'checking' && <p className="text-sm text-muted-foreground">Checking your reset link…</p>}
          {state === 'invalid' && (
            <div className="space-y-4 text-sm">
              <p>{error || 'This reset link is invalid or has expired.'} Request a new one from the sign-in form.</p>
              <Link to="/resume" className="underline">Back to sign in</Link>
            </div>
          )}
          {state === 'ready' && (
            <form className="space-y-4" onSubmit={submit}>
              <p className="text-sm text-muted-foreground">Choose a new password. You’ll sign in with it afterwards.</p>
              <label className="block text-xs">New password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="New password" className="mt-1 w-full rounded-md border bg-glass-strong p-3 text-sm" /></label>
              <label className="block text-xs">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Confirm new password" className="mt-1 w-full rounded-md border bg-glass-strong p-3 text-sm" /></label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save new password'}</Button>
            </form>
          )}
          {state === 'done' && (
            <div className="space-y-4 text-sm">
              <p role="status">Your password was changed. Please sign in with your new password.</p>
              <Button className={primary} onClick={() => navigate({ to: '/resume' })}>Go to sign in</Button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
