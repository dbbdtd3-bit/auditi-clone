'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
    <div className="w-full max-w-[1500px] space-y-6">
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <TeamSummaryPanel
                      label="Mitgliederanzahl"
                      count={team.members.length}
                      buttonLabel="Mitglieder anzeigen"
                    >
                      <TeamMembersDialog
                        team={team}
                        currentUserId={currentUserId}
                      />
                    </TeamSummaryPanel>

                    <TeamSummaryPanel
                      label="Mandantenanzahl"
                      count={team.mandanten.length}
                      buttonLabel={isAdmin ? 'Mandanten verwalten' : 'Mandanten anzeigen'}
                    >
                      <TeamMandantenDialog
                        team={team}
                        isAdmin={isAdmin}
                        allMandanten={allMandanten}
                        filteredMandanten={filteredMandanten}
                        mandantQuery={mandantQuery}
                        savingMandantId={savingMandantId}
                        onQueryChange={(value) =>
                          setMandantQueries((prev) => ({ ...prev, [team.id]: value }))
                        }
                        onToggleMandant={(mandantId, checked) => toggleMandant(team, mandantId, checked)}
                      />
                    </TeamSummaryPanel>
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

function TeamSummaryPanel({
  label,
  count,
  buttonLabel,
  children,
}: {
  label: string;
  count: number;
  buttonLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-dataly-line bg-dataly-surface-subtle px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold leading-none text-dataly-ink tabular-nums">{count}</p>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 px-3">
              {buttonLabel}
            </Button>
          </DialogTrigger>
          {children}
        </Dialog>
      </div>
    </div>
  );
}

function TeamMembersDialog({
  team,
  currentUserId,
}: {
  team: Team;
  currentUserId: string;
}) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Mitglieder von {team.name}</DialogTitle>
        <DialogDescription>
          {team.members.length} {team.members.length === 1 ? 'Mitglied' : 'Mitglieder'} sind diesem Team zugeordnet.
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {team.members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-3 rounded-md border border-dataly-line bg-dataly-surface-subtle px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-dataly-ink">{member.user.name}</p>
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
          <div className="rounded-md border border-dashed border-dataly-line bg-dataly-surface-subtle px-4 py-6 text-center">
            <p className="text-sm font-medium text-dataly-ink">Noch keine Mitglieder zugeordnet.</p>
            <p className="mt-1 text-sm text-dataly-slate">
              Weisen Sie Kanzlei-Mitarbeiter unter Login & Sicherheit einem Team zu.
            </p>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

function TeamMandantenDialog({
  team,
  isAdmin,
  allMandanten,
  filteredMandanten,
  mandantQuery,
  savingMandantId,
  onQueryChange,
  onToggleMandant,
}: {
  team: Team;
  isAdmin: boolean;
  allMandanten: MandantOption[];
  filteredMandanten: MandantOption[];
  mandantQuery: string;
  savingMandantId: string | null;
  onQueryChange: (value: string) => void;
  onToggleMandant: (mandantId: string, checked: boolean) => void;
}) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Mandanten von {team.name}</DialogTitle>
        <DialogDescription>
          {isAdmin
            ? 'Suchen und verwalten Sie die Mandanten, die dieses Team sehen darf.'
            : `${team.mandanten.length} Mandanten sind diesem Team zugeordnet.`}
        </DialogDescription>
      </DialogHeader>

      {isAdmin && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dataly-muted" />
          <Input
            value={mandantQuery}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Mandanten suchen..."
            className="h-10 pl-9"
          />
        </div>
      )}

      {isAdmin ? (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {filteredMandanten.map((mandant) => {
            const checked = team.mandanten.some((link) => link.mandant.id === mandant.id);
            return (
              <label
                key={mandant.id}
                className="flex items-center justify-between gap-3 rounded-md border border-dataly-line bg-dataly-surface-subtle px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-dataly-ink">{mandant.name}</span>
                  {mandant.legalName && mandant.legalName !== mandant.name && (
                    <span className="block truncate text-xs text-dataly-muted">{mandant.legalName}</span>
                  )}
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-dataly-blue"
                  checked={checked}
                  disabled={savingMandantId === mandant.id}
                  onChange={(event) => onToggleMandant(mandant.id, event.target.checked)}
                />
              </label>
            );
          })}
          {allMandanten.length === 0 && (
            <div className="rounded-md border border-dashed border-dataly-line bg-dataly-surface-subtle px-4 py-6 text-center">
              <p className="text-sm font-medium text-dataly-ink">Noch keine Mandanten vorhanden.</p>
              <p className="mt-1 text-sm text-dataly-slate">Legen Sie zuerst Mandanten an, um Teamzugriff zu steuern.</p>
            </div>
          )}
          {allMandanten.length > 0 && filteredMandanten.length === 0 && (
            <div className="rounded-md border border-dashed border-dataly-line bg-dataly-surface-subtle px-4 py-6 text-center">
              <p className="text-sm font-medium text-dataly-ink">Kein Mandant gefunden.</p>
              <p className="mt-1 text-sm text-dataly-slate">Passen Sie die Suche an.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {team.mandanten.map((link) => (
            <div
              key={link.mandant.id}
              className="rounded-md border border-dataly-line bg-dataly-surface-subtle px-4 py-3"
            >
              <p className="truncate text-sm font-semibold text-dataly-ink">{link.mandant.name}</p>
              {link.mandant.legalName && (
                <p className="truncate text-xs text-dataly-slate">{link.mandant.legalName}</p>
              )}
            </div>
          ))}
          {team.mandanten.length === 0 && (
            <div className="rounded-md border border-dashed border-dataly-line bg-dataly-surface-subtle px-4 py-6 text-center">
              <p className="text-sm font-medium text-dataly-ink">Noch keine Mandanten zugeordnet.</p>
              <p className="mt-1 text-sm text-dataly-slate">Ein Admin kann Mandanten im Teamprofil zuordnen.</p>
            </div>
          )}
        </div>
      )}
    </DialogContent>
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
