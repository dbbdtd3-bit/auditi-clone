'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEAM_COLOR_HEX, TEAM_COLOR_LABEL } from '@/lib/team-colors';
import { NewTeamDialog } from './new-team-dialog';
import { DeleteTeamButton } from './delete-team-button';

type Member = {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string; role: string };
};

type Team = {
  id: string;
  name: string;
  description: string | null;
  accentColor: string;
  members: Member[];
  mandanten: { mandant: { id: string; name: string; legalName: string | null } }[];
};

type MandantOption = { id: string; name: string; legalName?: string | null };

interface Props {
  teams: Team[];
  currentUserId: string;
  isAdmin: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  WP_ADMIN: 'Administrator',
  WP_TEAM: 'WP-Team',
  MANDANT_ADMIN: 'Mandant Admin',
  MANDANT_USER: 'Mandant',
};

export function TeamProfileView({ teams, currentUserId, isAdmin }: Props) {
  const [selectedId, setSelectedId] = useState<string>(teams[0]?.id ?? '');
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [allMandanten, setAllMandanten] = useState<MandantOption[]>([]);
  const [savingMandantId, setSavingMandantId] = useState<string | null>(null);
  const router = useRouter();

  const selected = teams.find((t) => t.id === selectedId);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/mandanten')
      .then((res) => res.json())
      .then((data) => setAllMandanten(Array.isArray(data) ? data : []))
      .catch(() => setAllMandanten([]));
  }, [isAdmin]);

  async function toggleMandant(mandantId: string, checked: boolean) {
    if (!selected) return;
    setSavingMandantId(mandantId);

    const currentTeamIds = teams
      .filter((team) => team.mandanten.some((link) => link.mandant.id === mandantId))
      .map((team) => team.id);
    const nextTeamIds = checked
      ? Array.from(new Set([...currentTeamIds, selected.id]))
      : currentTeamIds.filter((teamId) => teamId !== selected.id);

    await fetch(`/api/mandanten/${mandantId}/teams`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamIds: nextTeamIds }),
    });

    setSavingMandantId(null);
    router.refresh();
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-12 w-12 text-dataly-line-strong mb-4" />
        <p className="text-dataly-slate text-sm">Noch keine Teams vorhanden.</p>
        {isAdmin && (
          <Button className="mt-4" onClick={() => setNewTeamOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Neues Team
          </Button>
        )}
        <NewTeamDialog
          open={newTeamOpen}
          onOpenChange={setNewTeamOpen}
          onCreated={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Team switcher dropdown */}
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-dataly-line bg-dataly-surface px-3 py-2 text-sm font-medium text-dataly-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-dataly-blue"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <Button size="sm" onClick={() => setNewTeamOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Neues Team
          </Button>
        )}
      </div>

      {selected && (
        <div className="rounded-xl border border-dataly-line bg-dataly-surface shadow-sm overflow-hidden">
          {/* Team header */}
          <div
            className="h-2 w-full"
            style={{ backgroundColor: TEAM_COLOR_HEX[selected.accentColor] ?? '#3b82f6' }}
          />
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-dataly-ink">{selected.name}</h2>
                {selected.description && (
                  <p className="mt-1 text-sm text-dataly-slate">{selected.description}</p>
                )}
                <p className="mt-1 text-xs text-dataly-muted">
                  Akzentfarbe: {TEAM_COLOR_LABEL[selected.accentColor] ?? selected.accentColor}
                </p>
              </div>
              {isAdmin && (
                <ColorPicker
                  teamId={selected.id}
                  current={selected.accentColor}
                  onUpdated={() => router.refresh()}
                />
              )}
            </div>

            {/* Members */}
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-dataly-muted mb-3">
                Mitglieder ({selected.members.length})
              </p>
              <div className="space-y-2">
                {selected.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-dataly-line bg-dataly-surface-subtle px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-dataly-ink">{m.user.name}</p>
                      <p className="text-xs text-dataly-slate">{m.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABEL[m.user.role] ?? m.user.role}
                      </Badge>
                      {m.user.id === currentUserId && (
                        <Badge className="text-xs bg-dataly-info-soft text-dataly-blue border-0">Ich</Badge>
                      )}
                    </div>
                  </div>
                ))}
                {selected.members.length === 0 && (
                  <p className="text-sm text-dataly-muted px-1">Keine Mitglieder.</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-dataly-muted mb-3">
                Mandanten ({selected.mandanten.length})
              </p>
              {isAdmin ? (
                <div className="grid gap-2">
                  {allMandanten.map((mandant) => {
                    const checked = selected.mandanten.some((link) => link.mandant.id === mandant.id);
                    return (
                      <label
                        key={mandant.id}
                        className="flex items-center justify-between rounded-lg border border-dataly-line bg-dataly-surface-subtle px-4 py-2.5 text-sm"
                      >
                        <span>
                          <span className="block font-medium text-dataly-ink">{mandant.name}</span>
                          {mandant.legalName && mandant.legalName !== mandant.name && (
                            <span className="block text-xs text-dataly-muted">{mandant.legalName}</span>
                          )}
                        </span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-dataly-blue"
                          checked={checked}
                          disabled={savingMandantId === mandant.id}
                          onChange={(event) => toggleMandant(mandant.id, event.target.checked)}
                        />
                      </label>
                    );
                  })}
                  {allMandanten.length === 0 && (
                    <p className="text-sm text-dataly-muted px-1">Keine Mandanten vorhanden.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {selected.mandanten.map((link) => (
                    <div
                      key={link.mandant.id}
                      className="rounded-lg border border-dataly-line bg-dataly-surface-subtle px-4 py-2.5"
                    >
                      <p className="text-sm font-medium text-dataly-ink">{link.mandant.name}</p>
                      {link.mandant.legalName && (
                        <p className="text-xs text-dataly-slate">{link.mandant.legalName}</p>
                      )}
                    </div>
                  ))}
                  {selected.mandanten.length === 0 && (
                    <p className="text-sm text-dataly-muted px-1">Keine Mandanten zugeordnet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Admin: Delete Team */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-dataly-line flex justify-end">
                <DeleteTeamButton
                  teamId={selected.id}
                  teamName={selected.name}
                  onDeleted={() => {
                    const remaining = teams.filter((t) => t.id !== selected.id);
                    setSelectedId(remaining[0]?.id ?? '');
                    router.refresh();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <NewTeamDialog
        open={newTeamOpen}
        onOpenChange={setNewTeamOpen}
        onCreated={(newId) => {
          router.refresh();
          if (newId) setSelectedId(newId);
        }}
      />
    </div>
  );
}

function ColorPicker({
  teamId,
  current,
  onUpdated,
}: {
  teamId: string;
  current: string;
  onUpdated: () => void;
}) {
  const colors = ['BLUE', 'RED', 'PURPLE', 'YELLOW', 'ORANGE', 'GREEN'];
  const [saving, setSaving] = useState(false);

  async function setColor(color: string) {
    if (color === current || saving) return;
    setSaving(true);
    await fetch(`/api/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accentColor: color }),
    });
    setSaving(false);
    onUpdated();
  }

  return (
    <div className="flex gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          title={TEAM_COLOR_LABEL[c]}
          onClick={() => setColor(c)}
          className={cn(
            'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
            current === c ? 'border-dataly-ink scale-110' : 'border-transparent'
          )}
          style={{ backgroundColor: TEAM_COLOR_HEX[c] }}
        />
      ))}
    </div>
  );
}
