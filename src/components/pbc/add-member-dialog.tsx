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
import { Select } from '@/components/ui/select';
import { UserPlus, Info } from 'lucide-react';

interface Props {
  workspaceId: string;
}

export function AddMemberDialog({ workspaceId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [form, setForm] = React.useState({ email: '', role: 'MANDANT_UPLOADER' });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.email.trim()) {
      setError('E-Mail-Adresse ist erforderlich.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/pbc/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), role: form.role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unbekannter Fehler');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setForm({ email: '', role: 'MANDANT_UPLOADER' });
        router.refresh();
      }, 2000);
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Mitglied hinzufügen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitglied hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen Nutzer zum PBC-Workspace hinzu.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-md p-4">
                <Info className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">Nutzer wurde angelegt.</p>
                  <p className="text-sm text-green-700 mt-1">
                    E-Mail-Einladung wird nach Brevo-Konfiguration aktiviert.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="member-email">E-Mail-Adresse *</Label>
                <Input
                  id="member-email"
                  name="email"
                  type="email"
                  placeholder="mitarbeiter@mandant.de"
                  value={form.email}
                  onChange={handleChange}
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="member-role">Rolle *</Label>
                <Select
                  id="member-role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="MANDANT_UPLOADER">Mandant (Uploader)</option>
                  <option value="MANDANT_ADMIN">Mandant Admin</option>
                  <option value="WP_TEAM">WP-Team</option>
                </Select>
              </div>

              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md p-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Falls der Nutzer noch nicht existiert, wird ein Konto angelegt. E-Mail-Einladungen werden nach Brevo-Konfiguration aktiviert.
                </p>
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
                  {loading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
