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

interface FormData {
  name: string;
  legalName: string;
  taxId: string;
  street: string;
  zip: string;
  city: string;
  country: string;
}

export function CreateMandantDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormData>({
    name: '',
    legalName: '',
    taxId: '',
    street: '',
    zip: '',
    city: '',
    country: 'DE',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.city.trim()) {
      setError('Name und Stadt sind Pflichtfelder.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/mandanten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          legalName: form.legalName.trim() || undefined,
          taxId: form.taxId.trim() || undefined,
          address: {
            street: form.street.trim(),
            zip: form.zip.trim(),
            city: form.city.trim(),
            country: form.country.trim() || 'DE',
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unbekannter Fehler');
        return;
      }

      setOpen(false);
      setForm({ name: '', legalName: '', taxId: '', street: '', zip: '', city: '', country: 'DE' });
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
        Mandant anlegen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mandant anlegen</DialogTitle>
            <DialogDescription>
              Erfassen Sie die Stammdaten des neuen Mandanten.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Kurzname *</Label>
              <Input
                id="name"
                name="name"
                placeholder="z.B. Mustermann GmbH"
                value={form.name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="legalName">Vollständiger Firmenname</Label>
              <Input
                id="legalName"
                name="legalName"
                placeholder="z.B. Mustermann Verwaltungs GmbH & Co. KG"
                value={form.legalName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taxId">Steuernummer / USt-IdNr.</Label>
              <Input
                id="taxId"
                name="taxId"
                placeholder="z.B. DE123456789"
                value={form.taxId}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="street">Straße & Hausnummer</Label>
              <Input
                id="street"
                name="street"
                placeholder="z.B. Musterstraße 1"
                value={form.street}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="zip">PLZ</Label>
                <Input
                  id="zip"
                  name="zip"
                  placeholder="12345"
                  value={form.zip}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="city">Stadt *</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="z.B. München"
                  value={form.city}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">Land</Label>
              <Input
                id="country"
                name="country"
                placeholder="DE"
                value={form.country}
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
                {loading ? 'Wird angelegt...' : 'Anlegen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
