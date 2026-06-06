'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Users, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

type MandantRole = 'MANDANT_ADMIN' | 'MANDANT_USER';

type Member = {
  role: MandantRole;
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
};

type TeamOption = { id: string; name: string };

const ROLE_LABEL: Record<MandantRole, string> = {
  MANDANT_ADMIN: 'Mandant Admin',
  MANDANT_USER: 'Mandant Benutzer',
};

export function MandantAccessPanels({
  mandantId,
  members,
  selectedTeamIds,
  teams,
  canManageTeams,
  canManageUsers,
}: {
  mandantId: string;
  members: Member[];
  selectedTeamIds: string[];
  teams: TeamOption[];
  canManageTeams: boolean;
  canManageUsers: boolean;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [teamIds, setTeamIds] = React.useState(selectedTeamIds);

  React.useEffect(() => setTeamIds(selectedTeamIds), [selectedTeamIds]);

  async function updateMemberRole(userId: string, role: MandantRole) {
    await fetch(`/api/mandanten/${mandantId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  async function removeMember(userId: string) {
    if (!confirm('Benutzer von diesem Mandanten entfernen?')) return;
    await fetch(`/api/mandanten/${mandantId}/members/${userId}`, { method: 'DELETE' });
    router.refresh();
  }

  async function toggleTeam(teamId: string, checked: boolean) {
    const next = checked ? Array.from(new Set([...teamIds, teamId])) : teamIds.filter((id) => id !== teamId);
    setTeamIds(next);
    await fetch(`/api/mandanten/${mandantId}/teams`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamIds: next }),
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
            Benutzer ({members.length})
          </h2>
          {canManageUsers && (
            <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Einladen
            </Button>
          )}
        </div>

        {members.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="mb-3 h-8 w-8 text-dataly-muted" />
              <p className="text-sm font-medium text-dataly-ink">Noch keine Benutzer zugeordnet</p>
              <p className="mt-1 text-xs text-dataly-slate">
                Laden Sie Mandantenkontakte ein, damit sie Dokumente und Listen sehen koennen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {members.map((member) => (
              <Card key={member.user.id}>
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-dataly-info-soft text-xs font-semibold text-dataly-blue">
                    {member.user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-dataly-ink">{member.user.name}</p>
                    <p className="truncate text-xs text-dataly-muted">{member.user.email}</p>
                  </div>
                  {canManageUsers ? (
                    <NativeSelect
                      className="h-8 w-40 text-xs"
                      value={member.role}
                      onChange={(event) =>
                        updateMemberRole(
                          member.user.id,
                          event.target.value === 'MANDANT_ADMIN' ? 'MANDANT_ADMIN' : 'MANDANT_USER'
                        )
                      }
                    >
                      <option value="MANDANT_USER">Mandant Benutzer</option>
                      <option value="MANDANT_ADMIN">Mandant Admin</option>
                    </NativeSelect>
                  ) : (
                    <Badge variant="secondary">{ROLE_LABEL[member.role]}</Badge>
                  )}
                  {canManageUsers && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-dataly-muted hover:text-dataly-danger"
                      onClick={() => removeMember(member.user.id)}
                      aria-label={`${member.user.name} entfernen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <InviteDialog
          mandantId={mandantId}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onDone={() => router.refresh()}
        />
      </section>

      {canManageTeams && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-dataly-muted" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
              Teamzugriff
            </h2>
          </div>
          <Card>
            <CardContent className="space-y-2 p-4">
              {teams.map((team) => (
                <label
                  key={team.id}
                  className="flex min-h-11 items-center justify-between rounded-md border border-dataly-line bg-dataly-surface-subtle px-3 py-2 text-sm"
                >
                  <span className="font-medium text-dataly-ink">{team.name}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-dataly-blue"
                    checked={teamIds.includes(team.id)}
                    onChange={(event) => toggleTeam(team.id, event.target.checked)}
                  />
                </label>
              ))}
              {teams.length === 0 && (
                <p className="py-4 text-center text-sm text-dataly-slate">
                  Keine Teams vorhanden.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function InviteDialog({
  mandantId,
  open,
  onOpenChange,
  onDone,
}: {
  mandantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [form, setForm] = React.useState({ name: '', email: '', role: 'MANDANT_USER' as MandantRole });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [inviteUrl, setInviteUrl] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInviteUrl('');
    setLoading(true);

    try {
      const res = await fetch(`/api/mandanten/${mandantId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Einladung konnte nicht erstellt werden');
        return;
      }
      setInviteUrl(data.inviteUrl || '');
      setForm({ name: '', email: '', role: 'MANDANT_USER' });
      onDone();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mandanten-Benutzer einladen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">E-Mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Rolle</Label>
            <NativeSelect
              id="invite-role"
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  role: event.target.value === 'MANDANT_ADMIN' ? 'MANDANT_ADMIN' : 'MANDANT_USER',
                }))
              }
              disabled={loading}
            >
              <option value="MANDANT_USER">Mandant Benutzer</option>
              <option value="MANDANT_ADMIN">Mandant Admin</option>
            </NativeSelect>
          </div>
          {inviteUrl && (
            <div className="rounded-md border border-dataly-success/25 bg-dataly-success-soft px-3 py-2 text-xs text-dataly-ink">
              Einladung erstellt und per E-Mail versendet. Link: {inviteUrl}
            </div>
          )}
          {error && <p className="rounded-md bg-dataly-danger-soft px-3 py-2 text-sm text-dataly-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Schliessen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Wird erstellt...' : 'Einladung erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

