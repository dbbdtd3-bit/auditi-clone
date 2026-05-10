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
import { NativeSelect as Select } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface Mandant {
  id: string;
  name: string;
}

export function CreateEngagementDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mandanten, setMandanten] = React.useState<Mandant[]>([]);
  const [mandantenLoading, setMandantenLoading] = React.useState(false);

  const currentYear = new Date().getFullYear();

  const [form, setForm] = React.useState({
    mandantId: '',
    title: '',
    fiscalYear: String(currentYear),
    type: 'JAHRESABSCHLUSS',
  });

  React.useEffect(() => {
    if (open) {
      setMandantenLoading(true);
      fetch('/api/mandanten')
        .then((r) => r.json())
        .then((data) => {
          setMandanten(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length > 0) {
            setForm((prev) => (prev.mandantId ? prev : { ...prev, mandantId: data[0].id }));
          }
        })
        .catch(() => setMandanten([]))
        .finally(() => setMandantenLoading(false));
    }
  }, [open]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.mandantId || !form.title.trim() || !form.fiscalYear || !form.type) {
      setError('Alle Pflichtfelder sind erforderlich.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandantId: form.mandantId,
          title: form.title.trim(),
          fiscalYear: Number(form.fiscalYear),
          type: form.type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unbekannter Fehler');
        return;
      }

      setOpen(false);
      setForm({ mandantId: '', title: '', fiscalYear: String(currentYear), type: 'JAHRESABSCHLUSS' });
      router.push(`/engagements/${data.id}`);
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
        Engagement anlegen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Engagement anlegen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Prüfungsauftrag. Ein PBC-Workspace wird automatisch angelegt.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eng-mandantId">Mandant *</Label>
              {mandantenLoading ? (
                <p className="text-sm text-slate-500">Lade Mandanten...</p>
              ) : (
                <Select
                  id="eng-mandantId"
                  name="mandantId"
                  value={form.mandantId}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="">Mandant auswählen...</option>
                  {mandanten.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              )}
              {mandanten.length === 0 && !mandantenLoading && (
                <p className="text-xs text-amber-600">
                  Keine Mandanten vorhanden. Bitte zuerst einen Mandanten anlegen.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eng-title">Titel *</Label>
              <Input
                id="eng-title"
                name="title"
                placeholder="z.B. Jahresabschlussprüfung 2024"
                value={form.title}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eng-fiscalYear">Geschäftsjahr *</Label>
              <Input
                id="eng-fiscalYear"
                name="fiscalYear"
                type="number"
                min="2000"
                max="2100"
                value={form.fiscalYear}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eng-type">Auftragsart *</Label>
              <Select
                id="eng-type"
                name="type"
                value={form.type}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="JAHRESABSCHLUSS">Jahresabschluss</option>
                <option value="SONDERPRUEFUNG">Sonderprüfung</option>
                <option value="DUE_DILIGENCE">Due Diligence</option>
              </Select>
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
                disabled={loading || mandanten.length === 0}
              >
                {loading ? 'Wird angelegt...' : 'Anlegen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
