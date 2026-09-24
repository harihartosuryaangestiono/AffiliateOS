'use client';
import { useState } from 'react';
import {
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function LoginForm({ configured }: { configured: boolean }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function login(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fields = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(fields)),
      });
      const body = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(body.error);
      window.location.assign('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
      setBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <div className="login-brand">
        <span className="brand-symbol">
          <span className="brand-mark" aria-hidden="true">A</span>
        </span>
        AffiliateOS
      </div>
      <section className="login-card">
        <span className="login-icon">
          <LockKeyhole size={22} />
        </span>
        <h1>Welcome back.</h1>
        <p>Your affiliate operations, all in one place.</p>
        <form onSubmit={login} className="space-y-5 mt-8">
          <label htmlFor="login-email" className="form-field block">
            Work email
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              className="mt-2"
            />
          </label>
          <label htmlFor="login-password" className="form-field block">
            Password
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2"
            />
          </label>
          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}
          <Button
            className="w-full h-10"
            disabled={busy || !configured}
            type="submit"
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <>
                Sign in <ArrowRight size={15} />
              </>
            )}
          </Button>
        </form>
        <div className="pt-2">
          <button
            type="button"
            className="button-outline justify-center w-full"
            onClick={() => {
              document.cookie = 'affiliateos-mode=demo; path=/; max-age=86400';
              window.location.assign('/dashboard');
            }}
          >
            Explore demo workspace <ArrowRight size={14} />
          </button>
        </div>
        <p className="login-help">
          Need access? Contact your workspace administrator.
        </p>
      </section>
      <span className="login-footer">
        AffiliateOS · Affiliate operations, thoughtfully organized.
      </span>
    </main>
  );
}
