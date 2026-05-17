'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle } from 'lucide-react';

const loginErrorCopy: Record<string, string> = {
  pending_account: 'Ihr Konto wartet noch auf die Freischaltung durch einen Administrator.',
  disabled_account: 'Ihr Konto wurde deaktiviert. Bitte wenden Sie sich an Ihren Administrator.',
  credentials: 'E-Mail oder Passwort ist falsch. Bitte erneut versuchen.',
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(loginErrorCopy[result.code ?? 'credentials'] ?? loginErrorCopy.credentials);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2.5 rounded-md border border-dataly-danger/30 bg-dataly-danger-soft p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-dataly-danger" />
          <p className="text-sm text-dataly-danger">{error}</p>
        </div>
      )}

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
          autoFocus
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
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Anmelden...
          </>
        ) : (
          'Anmelden'
        )}
      </Button>
    </form>
  );
}
