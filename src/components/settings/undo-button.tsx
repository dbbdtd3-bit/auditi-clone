'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';

interface UndoButtonProps {
  entryId: string;
  onSuccess: () => void;
}

export function UndoButton({ entryId, onSuccess }: UndoButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUndo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audit-log/${entryId}/undo`, { method: 'POST' });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Fehler');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1.5"
        onClick={handleUndo}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RotateCcw className="h-3 w-3" />
        )}
        Rückgängig
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
