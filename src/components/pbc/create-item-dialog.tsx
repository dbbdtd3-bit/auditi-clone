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
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface Props {
  listId: string;
}

export function CreateItemDialog({ listId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: '', description: '', dueDate: '' });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Titel ist erforderlich.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/pbc/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          dueDate: form.dueDate || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unbekannter Fehler');
        return;
      }

      setOpen(false);
      setForm({ title: '', description: '', dueDate: '' });
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
        Anforderung hinzufügen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anforderung hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie eine neue Dokumentenanforderung zu dieser Liste hinzu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="item-title">Titel *</Label>
              <Input
                id="item-title"
                name="title"
                placeholder="z.B. Anlagenverzeichnis 2024"
                value={form.title}
                onChange={handleChange}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-description">Beschreibung</Label>
              <Textarea
                id="item-description"
                name="description"
                placeholder="Optionale Beschreibung oder Hinweise für den Mandanten..."
                value={form.description}
                onChange={handleChange}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-dueDate">Fälligkeitsdatum</Label>
              <Input
                id="item-dueDate"
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                disabled={loading}
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
