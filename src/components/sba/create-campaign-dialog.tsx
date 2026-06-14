'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect as Select } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface Props {
  engagementId: string;
}

export function CreateCampaignDialog({ engagementId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = React.useState({
    title: '',
    balanceDate: today,
    confirmationMethod: 'STATED',
    counterpartyType: 'DEBTOR',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.balanceDate) {
      setError('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementId,
          title: form.title.trim(),
          balanceDate: form.balanceDate,
          confirmationMethod: form.confirmationMethod,
          counterpartyType: form.counterpartyType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unbekannter Fehler');
        return;
      }

      setOpen(false);
      setForm({
        title: '',
        balanceDate: today,
        confirmationMethod: 'STATED',
        counterpartyType: 'DEBTOR',
      });
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="bg-dataly-blue hover:bg-dataly-navy" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Kampagne erstellen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SBA-Kampagne erstellen</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="camp-title">Kampagnen-Titel *</Label>
              <Input
                id="camp-title"
                name="title"
                placeholder="z. B. Debitoren Q4 2024"
                value={form.title}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="camp-balanceDate">Stichtag *</Label>
              <Input
                id="camp-balanceDate"
                name="balanceDate"
                type="date"
                value={form.balanceDate}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="camp-confirmationMethod">Methode *</Label>
                <Select
                  id="camp-confirmationMethod"
                  name="confirmationMethod"
                  value={form.confirmationMethod}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="STATED">Geschlossen (Saldo genannt)</option>
                  <option value="OPEN">Offen</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="camp-counterpartyType">Richtung *</Label>
                <Select
                  id="camp-counterpartyType"
                  name="counterpartyType"
                  value={form.counterpartyType}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="DEBTOR">Debitoren</option>
                  <option value="CREDITOR">Kreditoren</option>
                </Select>
              </div>
            </div>

            <p className="rounded-md border border-dataly-line bg-dataly-surface-subtle px-3 py-2 text-xs leading-5 text-dataly-slate">
              Bei offenen Bestätigungen wird der interne Buchsaldo nicht an den Empfänger
              übermittelt. Bei geschlossenen Bestätigungen wird der Saldo zur Bestätigung angezeigt.
            </p>

            {error && (
              <p className="rounded-md border border-dataly-danger/30 bg-dataly-danger-soft px-3 py-2 text-sm text-dataly-danger">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Wird erstellt...' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
