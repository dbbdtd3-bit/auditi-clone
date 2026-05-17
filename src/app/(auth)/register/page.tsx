'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Building2, CheckCircle2, Loader2, UserRound } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AccountKind = 'WP' | 'CLIENT';

const accountKinds: Array<{
  value: AccountKind;
  label: string;
  description: string;
  icon: typeof Building2;
}> = [
  {
    value: 'WP',
    label: 'Kanzlei',
    description: 'WP/StB-Team',
    icon: Building2,
  },
  {
    value: 'CLIENT',
    label: 'Mandant',
    description: 'Upload- und Antwortzugang',
    icon: UserRound,
  },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kind, setKind] = useState<AccountKind>('WP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, kind }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registrierung fehlgeschlagen');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Ein Netzwerkfehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={success ? 'Registrierung eingereicht' : 'Konto erstellen'}
      description={
        success
          ? 'Ihr Konto wartet jetzt auf die Freischaltung durch einen Administrator.'
          : 'Neue Zugänge werden erst nach Prüfung durch einen Administrator freigeschaltet.'
      }
      footer={
        <p className="text-center text-sm text-dataly-slate">
          Bereits freigeschaltet?{' '}
          <Link href="/login" className="font-semibold text-dataly-blue underline-offset-4 hover:underline">
            Anmelden
          </Link>
        </p>
      }
    >
      {success ? (
        <div className="rounded-lg border border-dataly-success/25 bg-dataly-success-soft p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-dataly-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-sm leading-[22px] text-dataly-ink">
            Ein Administrator prüft Ihre Anfrage. Sobald Ihr Konto aktiv ist, können Sie sich mit
            Ihrer E-Mail-Adresse anmelden.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-md border border-dataly-danger/30 bg-dataly-danger-soft p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-dataly-danger" />
              <p className="text-sm text-dataly-danger">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-dataly-ink">Kontotyp</label>
            <div
              role="radiogroup"
              aria-label="Kontotyp"
              className="grid grid-cols-2 gap-1 rounded-md border border-dataly-line bg-dataly-surface-subtle p-1"
            >
              {accountKinds.map((option) => {
                const Icon = option.icon;
                const selected = kind === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setKind(option.value)}
                    className={`min-h-16 rounded-sm border px-3 py-2 text-left transition-colors ${
                      selected
                        ? 'border-dataly-line-strong bg-white text-dataly-navy shadow-[0_1px_2px_rgba(16,32,51,0.08)]'
                        : 'border-transparent text-dataly-slate hover:bg-white'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-4 text-dataly-slate">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-semibold text-dataly-ink">
              Vollständiger Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Max Mustermann"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-dataly-ink">
              E-Mail-Adresse
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@kanzlei.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-dataly-ink">
              Passwort
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Mindestens 8 Zeichen"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrierung wird eingereicht...
              </>
            ) : (
              'Registrierung einreichen'
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
