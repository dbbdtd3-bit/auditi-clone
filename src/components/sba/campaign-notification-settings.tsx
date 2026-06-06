'use client';

import * as React from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

type UserOption = { id: string; name: string; email: string };
type Recipient = { userId: string };

export function CampaignNotificationSettings({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = React.useState(false);
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/campaigns/${campaignId}/notification-recipients`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(Array.isArray(data.candidates) ? data.candidates : []);
        setSelectedIds(
          Array.isArray(data.recipients)
            ? data.recipients.map((recipient: Recipient) => recipient.userId)
            : []
        );
      })
      .finally(() => setLoading(false));
  }, [campaignId, open]);

  function toggle(userId: string) {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/campaigns/${campaignId}/notification-recipients`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: selectedIds }),
    });
    setSaving(false);
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Bell className="h-4 w-4" />
        Benachrichtigungen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kampagnen-Benachrichtigungen</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex justify-center py-10 text-dataly-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {users.map((user) => (
                <label key={user.id} className="flex items-start gap-2 rounded-md border border-dataly-line bg-dataly-surface-subtle px-3 py-2">
                  <Checkbox checked={selectedIds.includes(user.id)} onCheckedChange={() => toggle(user.id)} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-dataly-ink">{user.name}</span>
                    <span className="block truncate text-xs text-dataly-muted">{user.email}</span>
                  </span>
                </label>
              ))}
              {users.length === 0 && (
                <p className="py-6 text-center text-sm text-dataly-slate">Keine Kanzlei-Benutzer verfuegbar.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={save} disabled={saving || loading}>
              {saving ? 'Speichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

