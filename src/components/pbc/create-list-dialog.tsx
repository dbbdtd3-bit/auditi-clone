'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface Props {
  workspaceId: string;
}

export function CreateListDialog({ workspaceId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Titel ist erforderlich.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/pbc/workspaces/${workspaceId}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unbekannter Fehler');
        return;
      }

      setOpen(false);
      setTitle('');
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="bg-blue-700 hover:bg-blue-800" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Neue Liste
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anforderungsliste erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue PBC-Anforderungsliste für diesen Workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="list-title">Listenname *</Label>
              <Input
                id="list-title"
                placeholder="z.B. Anlagevermögen, Finanzen & Liquidität"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                className="bg-blue-700 hover:bg-blue-800"
                disabled={loading}
              >
                {loading ? 'Wird erstellt...' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
