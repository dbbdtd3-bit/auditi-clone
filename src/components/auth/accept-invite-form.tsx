'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InviteData {
  name: string;
  email: string;
  mandantName: string;
  role: string;
  expiresAt: string;
}

export function AcceptInviteForm({ token }: { token: string }) {
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Einladung konnte nicht geladen werden');
        setInvite(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Einladung konnte nicht angenommen werden');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInvite) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-dataly-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Einladung wird geladen...
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border border-dataly-success/25 bg-dataly-success-soft p-5 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-dataly-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="text-sm leading-[22px] text-dataly-ink">
          Ihr Zugang wurde aktiviert. Sie koennen sich jetzt mit Ihrer E-Mail-Adresse anmelden.
        </p>
        <Button asChild className="mt-4 w-full">
          <Link href="/login">Zur Anmeldung</Link>
        </Button>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="flex items-start gap-2.5 rounded-md border border-dataly-danger/30 bg-dataly-danger-soft p-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-dataly-danger" />
        <p className="text-sm text-dataly-danger">{error}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {invite && (
        <div className="rounded-md border border-dataly-line bg-dataly-surface-subtle px-4 py-3 text-sm">
          <p className="font-semibold text-dataly-ink">{invite.name}</p>
          <p className="text-dataly-slate">{invite.email}</p>
          <p className="mt-1 text-xs text-dataly-muted">{invite.mandantName}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-md border border-dataly-danger/30 bg-dataly-danger-soft p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-dataly-danger" />
          <p className="text-sm text-dataly-danger">{error}</p>
        </div>
      )}

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
          autoComplete="new-password"
          disabled={submitting}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-semibold text-dataly-ink">
          Passwort bestaetigen
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Passwort erneut eingeben"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          disabled={submitting}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Zugang wird aktiviert...
          </>
        ) : (
          'Einladung annehmen'
        )}
      </Button>
    </form>
  );
}

