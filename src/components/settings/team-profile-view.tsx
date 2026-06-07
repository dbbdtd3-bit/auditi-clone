'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users } from 'lucide-react';
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
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [allMandanten, setAllMandanten] = useState<MandantOption[]>([]);
  const [savingMandantId, setSavingMandantId] = useState<string | null>(null);
  const [teamQuery, setTeamQuery] = useState('');
  const [mandantQueries, setMandantQueries] = useState<Record<string, string>>({});
  const router = useRouter();

  const normalizedTeamQuery = teamQuery.trim().toLowerCase();
  const filteredTeams = normalizedTeamQuery
    ? teams.filter((team) =>
        [team.name, team.description ?? ''].some((value) =>
          value.toLowerCase().includes(normalizedTeamQuery)
        )
      )
    : teams;

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/mandanten')
      .then((res) => res.json())
      .then((data) => setAllMandanten(Array.isArray(data) ? data : []))
      .catch(() => setAllMandanten([]));
  }, [isAdmin]);

  async function toggleMandant(team: Team, mandantId: string, checked: boolean) {
    setSavingMandantId(mandantId);

    const currentTeamIds = teams
      .filter((team) => team.mandanten.some((link) => link.mandant.id === mandantId))
      .map((team) => team.id);
    const nextTeamIds = checked
      ? Array.from(new Set([...currentTeamIds, team.id]))
      : currentTeamIds.filter((teamId) => teamId !== team.id);

    await fetch(`/api/mandanten/${mandantId}/teams`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamIds: nextTeamIds }),
    });

    setSavingMandantId(null);
    router.refresh();
  }

  function getFilteredMandanten(teamId: string) {
    const query = (mandantQueries[teamId] ?? '').trim().toLowerCase();
    if (!query) return allMandanten;
    return allMandanten.filter((mandant) =>
      [mandant.name, mandant.legalName ?? ''].some((value) => value.toLowerCase().includes(query))
    );
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
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dataly-muted" />
          <Input
            value={teamQuery}
            onChange={(event) => setTeamQuery(event.target.value)}
            placeholder="Teams suchen..."
            className="h-10 pl-9"
          />
        </div>

        {isAdmin && (
          <Button size="sm" className="sm:ml-auto" onClick={() => setNewTeamOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Neues Team
          </Button>
        )}
      </div>

      {filteredTeams.length === 0 ? (
        <div className="rounded-lg border border-dataly-line bg-dataly-surface px-5 py-8 text-center">
          <p className="text-sm font-medium text-dataly-ink">Kein Team gefunden.</p>
          <p className="mt-1 text-sm text-dataly-slate">Passen Sie die Suche an oder legen Sie ein neues Team an.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredTeams.map((team) => {
            const filteredMandanten = getFilteredMandanten(team.id);
            const mandantQuery = mandantQueries[team.id] ?? '';

            return (
              <div key={team.id} className="overflow-hidden rounded-lg border border-dataly-line bg-dataly-surface shadow-sm">
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: TEAM_COLOR_HEX[team.accentColor] ?? '#3b82f6' }}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-dataly-ink">{team.name}</h2>
                      {team.description && (
                        <p className="mt-1 text-sm leading-5 text-dataly-slate">{team.description}</p>
                      )}
                      <p className="mt-1 text-xs text-dataly-muted">
                        Akzentfarbe: {TEAM_COLOR_LABEL[team.accentColor] ?? team.accentColor}
                      </p>
                    </div>
                    {isAdmin && (
                      <ColorPicker
                        teamId={team.id}
                        current={team.accentColor}
                        onUpdated={() => router.refresh()}
                      />
                    )}
                  </div>

                  <div className="mt-6">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-dataly-muted">
                      Mitglieder ({team.members.length})
                    </p>
                    <div className="space-y-2">
                      {team.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-dataly-line bg-dataly-surface-subtle px-4 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-dataly-ink">{member.user.name}</p>
                            <p className="truncate text-xs text-dataly-slate">{member.user.email}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {ROLE_LABEL[member.user.role] ?? member.user.role}
                            </Badge>
                            {member.user.id === currentUserId && (
                              <Badge className="border-0 bg-dataly-info-soft text-xs text-dataly-blue">Ich</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {team.members.length === 0 && (
                        <p className="rounded-md border border-dashed border-dataly-line bg-dataly-surface-subtle px-4 py-3 text-sm text-dataly-muted">
                          Keine Mitglieder.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
                        Mandanten ({team.mandanten.length})
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="relative mb-3">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dataly-muted" />
                        <Input
                          value={mandantQuery}
                          onChange={(event) =>
                            setMandantQueries((prev) => ({ ...prev, [team.id]: event.target.value }))
                          }
                          placeholder="Mandanten suchen..."
                          className="h-9 pl-9 text-sm"
                        />
                      </div>
                    )}
                    {isAdmin ? (
                      <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                        {filteredMandanten.map((mandant) => {
                          const checked = team.mandanten.some((link) => link.mandant.id === mandant.id);
                          return (
                            <label
                              key={mandant.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-dataly-line bg-dataly-surface-subtle px-4 py-2.5 text-sm"
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-dataly-ink">{mandant.name}</span>
                                {mandant.legalName && mandant.legalName !== mandant.name && (
                                  <span className="block truncate text-xs text-dataly-muted">{mandant.legalName}</span>
                                )}
                              </span>
                              <input
                                type="checkbox"
                                className="h-4 w-4 shrink-0 accent-dataly-blue"
                                checked={checked}
                                disabled={savingMandantId === mandant.id}
                                onChange={(event) => toggleMandant(team, mandant.id, event.target.checked)}
                              />
                            </label>
                          );
                        })}
                        {allMandanten.length === 0 && (
                          <p className="rounded-md border border-dashed border-dataly-line bg-dataly-surface-subtle px-4 py-3 text-sm text-dataly-muted">
                            Keine Mandanten vorhanden.
                          </p>
                        )}
                        {allMandanten.length > 0 && filteredMandanten.length === 0 && (
                          <p className="rounded-md border border-dashed border-dataly-line bg-dataly-surface-subtle px-4 py-3 text-sm text-dataly-muted">
                            Kein Mandant gefunden.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {team.mandanten.map((link) => (
                          <div
                            key={link.mandant.id}
                            className="rounded-md border border-dataly-line bg-dataly-surface-subtle px-4 py-2.5"
                          >
                            <p className="truncate text-sm font-medium text-dataly-ink">{link.mandant.name}</p>
                            {link.mandant.legalName && (
                              <p className="truncate text-xs text-dataly-slate">{link.mandant.legalName}</p>
                            )}
                          </div>
                        ))}
                        {team.mandanten.length === 0 && (
                          <p className="rounded-md border border-dashed border-dataly-line bg-dataly-surface-subtle px-4 py-3 text-sm text-dataly-muted">
                            Keine Mandanten zugeordnet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="mt-6 flex justify-end border-t border-dataly-line pt-4">
                      <DeleteTeamButton
                        teamId={team.id}
                        teamName={team.name}
                        onDeleted={() => router.refresh()}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewTeamDialog
        open={newTeamOpen}
        onOpenChange={setNewTeamOpen}
        onCreated={(newId) => {
          router.refresh();
          if (newId) setTeamQuery('');
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
