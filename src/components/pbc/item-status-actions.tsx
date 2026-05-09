'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  itemId: string;
  currentStatus: string;
}

export function ItemStatusActions({ itemId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (currentStatus !== 'UPLOADED') return null;

  async function setStatus(status: 'ACCEPTED' | 'NEEDS_REVISION') {
    setError(null);
    setLoading(status);
    try {
      const res = await fetch(`/api/pbc/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Fehler beim Aktualisieren');
        return;
      }

      router.refresh();
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">WP-Entscheidung</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setStatus('ACCEPTED')}
          disabled={loading !== null}
        >
          <CheckCircle2 className="h-4 w-4" />
          {loading === 'ACCEPTED' ? 'Wird akzeptiert...' : 'Akzeptieren'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-400 text-amber-700 hover:bg-amber-50"
          onClick={() => setStatus('NEEDS_REVISION')}
          disabled={loading !== null}
        >
          <AlertTriangle className="h-4 w-4" />
          {loading === 'NEEDS_REVISION' ? 'Wird gesetzt...' : 'Überarbeitung nötig'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
