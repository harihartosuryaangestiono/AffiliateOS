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
  const [name, setName] = useState('Hariharto Surya');

  async function login(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fields = new FormData(e.currentTarget);
    const email = String(fields.get('email') || '');
    const enteredName = String(fields.get('name') || '').trim() || name.trim() || 'Hariharto Surya';

    // If Supabase is not connected on Vercel or running in standalone mode
    if (!configured) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('affiliateos-profile-name', enteredName);
        document.cookie = 'affiliateos-mode=demo; path=/; max-age=86400';
      }
      window.location.assign('/dashboard');
      return;
    }

    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(fields)),
      });
      const body = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(body.error);
      if (typeof window !== 'undefined') {
        localStorage.setItem('affiliateos-profile-name', enteredName);
      }
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
        <form onSubmit={login} className="space-y-4 mt-6">
          <label htmlFor="login-name" className="form-field block">
            Nama Anda
            <Input
              id="login-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hariharto Surya"
              required
              className="mt-1.5"
            />
          </label>
          <label htmlFor="login-email" className="form-field block">
            Work email
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="hariharto@company.com"
              defaultValue="hariharto@company.com"
              required
              className="mt-1.5"
            />
          </label>
          <label htmlFor="login-password" className="form-field block">
            Password
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              defaultValue="••••••••"
              required
              className="mt-1.5"
            />
          </label>
          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}
          <Button
            className="w-full h-10 mt-2 font-semibold"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <>
                Masuk ke Workspace <ArrowRight size={15} />
              </>
            )}
          </Button>
        </form>
        <div className="pt-2">
          <button
            type="button"
            className="button-outline justify-center w-full text-xs font-medium"
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('affiliateos-profile-name', name || 'Hariharto Surya');
                document.cookie = 'affiliateos-mode=demo; path=/; max-age=86400';
              }
              window.location.assign('/dashboard');
            }}
          >
            Masuk sebagai {name || 'Hariharto Surya'} (Admin) <ArrowRight size={14} />
          </button>
        </div>
        <p className="login-help text-xs text-muted-foreground mt-4">
          AffiliateOS Enterprise Edition · Role Admin otomatis diberikan.
        </p>
      </section>
      <span className="login-footer">
        AffiliateOS · Affiliate operations, thoughtfully organized.
      </span>
    </main>
  );
}
