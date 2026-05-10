'use client';

import { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kind, setKind] = useState<'WP' | 'CLIENT'>('WP');
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Auditi</h1>
            <p className="mt-1 text-slate-400 text-sm">Prüfungsplattform für WP &amp; StB</p>
          </div>

          <div className="px-8 py-8">
            {success ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Registrierung eingereicht</h2>
                <p className="text-sm text-slate-500">
                  Ihr Konto wurde angelegt und wartet auf die Freischaltung durch einen Administrator.
                  Sie erhalten keine automatische Benachrichtigung — sprechen Sie bitte Ihren Administrator an.
                </p>
                <Link href="/login" className="block text-sm text-blue-700 hover:underline mt-4">
                  Zurück zur Anmeldung
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Konto erstellen</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Ihr Konto wird nach Prüfung durch den Administrator freigeschaltet.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2.5 rounded-md bg-red-50 border border-red-200 p-3">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Kontotyp</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setKind('WP')}
                        className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                          kind === 'WP'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Kanzlei-Mitarbeiter
                      </button>
                      <button
                        type="button"
                        onClick={() => setKind('CLIENT')}
                        className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                          kind === 'CLIENT'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Mandant
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm font-medium text-slate-700">
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
                    <label htmlFor="email" className="text-sm font-medium text-slate-700">
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
                    <label htmlFor="password" className="text-sm font-medium text-slate-700">
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

                  <Button
                    type="submit"
                    className="w-full bg-blue-700 hover:bg-blue-800"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Registrieren...
                      </>
                    ) : (
                      'Registrieren'
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                  Bereits ein Konto?{' '}
                  <Link href="/login" className="text-blue-700 hover:underline font-medium">
                    Anmelden
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Auditi &mdash; Vertraulich &amp; sicher
        </p>
      </div>
    </div>
  );
}
