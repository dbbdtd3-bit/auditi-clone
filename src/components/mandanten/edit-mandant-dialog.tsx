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
import { Pencil } from 'lucide-react';

interface MandantAddress {
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
}

interface Mandant {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  address: MandantAddress | null;
}

interface Props {
  mandant: Mandant;
}

export function EditMandantDialog({ mandant }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const address = mandant.address as MandantAddress | null;

  const [form, setForm] = React.useState({
    name: mandant.name,
    legalName: mandant.legalName || '',
    taxId: mandant.taxId || '',
    street: address?.street || '',
    zip: address?.zip || '',
    city: address?.city || '',
    country: address?.country || 'DE',
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
      const res = await fetch(`/api/mandanten/${mandant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          legalName: form.legalName.trim() || null,
          taxId: form.taxId.trim() || null,
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
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Bearbeiten
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mandant bearbeiten</DialogTitle>
            <DialogDescription>
              Stammdaten von {mandant.name} aktualisieren.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Kurzname *</Label>
              <Input
                id="edit-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-legalName">Vollständiger Firmenname</Label>
              <Input
                id="edit-legalName"
                name="legalName"
                value={form.legalName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-taxId">Steuernummer / USt-IdNr.</Label>
              <Input
                id="edit-taxId"
                name="taxId"
                value={form.taxId}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-street">Straße & Hausnummer</Label>
              <Input
                id="edit-street"
                name="street"
                value={form.street}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-zip">PLZ</Label>
                <Input
                  id="edit-zip"
                  name="zip"
                  value={form.zip}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="edit-city">Stadt *</Label>
                <Input
                  id="edit-city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-country">Land</Label>
              <Input
                id="edit-country"
                name="country"
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
                {loading ? 'Wird gespeichert...' : 'Speichern'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
