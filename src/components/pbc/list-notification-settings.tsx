'use client';

import * as React from 'react';
import { Bell, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

type Audience = 'KANZLEI_UPLOADS' | 'MANDANT_REQUESTS';

type UserOption = {
  id: string;
  name: string;
  email: string;
  mandantRole?: string;
};

type Recipient = {
  userId: string;
  audience: Audience;
};

interface RecipientData {
  recipients: Recipient[];
  candidates: {
    kanzlei: UserOption[];
    mandant: UserOption[];
  };
  permissions: {
    canManageKanzlei: boolean;
    canManageMandant: boolean;
  };
}

export function ListNotificationSettings({
  listId,
  isWp,
}: {
  listId: string;
  isWp: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<RecipientData | null>(null);
  const [kanzleiIds, setKanzleiIds] = React.useState<string[]>([]);
  const [mandantIds, setMandantIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [notifying, setNotifying] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/pbc/lists/${listId}/notification-recipients`)
      .then((res) => res.json())
      .then((payload) => {
        setData(payload);
        setKanzleiIds(
          payload.recipients
            ?.filter((recipient: Recipient) => recipient.audience === 'KANZLEI_UPLOADS')
            .map((recipient: Recipient) => recipient.userId) ?? []
        );
        setMandantIds(
          payload.recipients
            ?.filter((recipient: Recipient) => recipient.audience === 'MANDANT_REQUESTS')
            .map((recipient: Recipient) => recipient.userId) ?? []
        );
      })
      .finally(() => setLoading(false));
  }, [listId, open]);

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, userId: string) {
    setter((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function saveAudience(audience: Audience, userIds: string[]) {
    setSaving(true);
    await fetch(`/api/pbc/lists/${listId}/notification-recipients`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience, userIds }),
    });
    setSaving(false);
  }

  async function notifyMandant() {
    setNotifying(true);
    await fetch(`/api/pbc/lists/${listId}/notify-mandant`, { method: 'POST' });
    setNotifying(false);
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="shrink-0">
        <Settings2 className="h-4 w-4" />
        Benachrichtigungen
      </Button>
      {isWp && (
        <Button variant="outline" onClick={notifyMandant} disabled={notifying} className="shrink-0">
          {notifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          Mandant benachrichtigen
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Benachrichtigungen</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-10 text-dataly-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : data ? (
            <div className="grid gap-5 md:grid-cols-2">
              <RecipientSection
                title="Kanzlei bei Uploads"
                description="Diese Personen erhalten den 5-Minuten-Digest nach Mandanten-Uploads."
                users={data.candidates.kanzlei}
                selectedIds={kanzleiIds}
                disabled={!data.permissions.canManageKanzlei}
                onToggle={(userId) => toggle(setKanzleiIds, userId)}
                onSave={() => saveAudience('KANZLEI_UPLOADS', kanzleiIds)}
                saving={saving}
              />
              <RecipientSection
                title="Mandant informieren"
                description="Wenn leer, werden automatisch alle Mandant-Admins benachrichtigt."
                users={data.candidates.mandant}
                selectedIds={mandantIds}
                disabled={!data.permissions.canManageMandant}
                onToggle={(userId) => toggle(setMandantIds, userId)}
                onSave={() => saveAudience('MANDANT_REQUESTS', mandantIds)}
                saving={saving}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Schliessen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecipientSection({
  title,
  description,
  users,
  selectedIds,
  disabled,
  onToggle,
  onSave,
  saving,
}: {
  title: string;
  description: string;
  users: UserOption[];
  selectedIds: string[];
  disabled: boolean;
  onToggle: (userId: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="rounded-lg border border-dataly-line bg-dataly-surface-subtle p-3">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-dataly-ink">{title}</h3>
          <Badge variant="outline">{selectedIds.length}</Badge>
        </div>
        <p className="mt-1 text-xs leading-5 text-dataly-slate">{description}</p>
      </div>
      <div className="max-h-56 space-y-2 overflow-y-auto">
        {users.map((user) => (
          <label key={user.id} className="flex items-start gap-2 rounded-md bg-white px-3 py-2 text-sm">
            <Checkbox
              checked={selectedIds.includes(user.id)}
              disabled={disabled}
              onCheckedChange={() => onToggle(user.id)}
            />
            <span className="min-w-0">
              <span className="block truncate font-medium text-dataly-ink">{user.name}</span>
              <span className="block truncate text-xs text-dataly-muted">{user.email}</span>
            </span>
          </label>
        ))}
        {users.length === 0 && (
          <p className="py-4 text-center text-sm text-dataly-slate">Keine Benutzer verfuegbar.</p>
        )}
      </div>
      {!disabled && (
        <Button size="sm" className="mt-3 w-full" onClick={onSave} disabled={saving}>
          {saving ? 'Speichert...' : 'Auswahl speichern'}
        </Button>
      )}
    </section>
  );
}

