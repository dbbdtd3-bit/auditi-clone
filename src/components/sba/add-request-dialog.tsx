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
import { UserPlus } from 'lucide-react';

interface Props {
  campaignId: string;
}

export function AddRequestDialog({ campaignId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    partnerName: '',
    partnerEmail: '',
    accountNumber: '',
    expectedBalance: '',
    currency: 'EUR',
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function resetForm() {
    setForm({
      partnerName: '',
      partnerEmail: '',
      accountNumber: '',
      expectedBalance: '',
      currency: 'EUR',
    });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.partnerName.trim() || !form.partnerEmail.trim() || !form.expectedBalance) {
      setError('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        partnerName: form.partnerName.trim(),
        partnerEmail: form.partnerEmail.trim(),
        expectedBalance: parseFloat(form.expectedBalance),
        currency: form.currency,
      };
      if (form.accountNumber.trim()) {
        body.accountNumber = form.accountNumber.trim();
      }

      const res = await fetch(`/api/campaigns/${campaignId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unbekannter Fehler');
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        <UserPlus className="h-4 w-4" />
        Partner hinzufügen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partner hinzufügen</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="req-partnerName">Name des Partners *</Label>
              <Input
                id="req-partnerName"
                name="partnerName"
                placeholder="z.B. Müller GmbH"
                value={form.partnerName}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-partnerEmail">E-Mail *</Label>
              <Input
                id="req-partnerEmail"
                name="partnerEmail"
                type="email"
                placeholder="z.B. buchhaltung@mueller.de"
                value={form.partnerEmail}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-accountNumber">
                Kontonummer{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="req-accountNumber"
                name="accountNumber"
                placeholder="z.B. 1200"
                value={form.accountNumber}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="req-expectedBalance">Erwarteter Saldo *</Label>
                <Input
                  id="req-expectedBalance"
                  name="expectedBalance"
                  type="number"
                  step="0.01"
                  placeholder="z.B. 150000.00"
                  value={form.expectedBalance}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="req-currency">Währung</Label>
                <Select
                  id="req-currency"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="CHF">CHF</option>
                </Select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </p>
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
                {loading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
