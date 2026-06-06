'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X } from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  kind: 'WP' | 'CLIENT';
  teams: { team: { id: string; name: string } }[];
  mandanten: { role: 'MANDANT_ADMIN' | 'MANDANT_USER'; mandant: { id: string; name: string } }[];
  createdAt: string;
};

type TeamOption = { id: string; name: string };
type MandantOption = { id: string; name: string };
type MandantSelection = { mandantId: string; role: 'MANDANT_ADMIN' | 'MANDANT_USER' };

const ROLE_LABELS: Record<string, string> = {
  WP_ADMIN: 'WP Admin',
  WP_TEAM: 'WP Mitarbeiter',
  MANDANT_ADMIN: 'Mandant Admin',
  MANDANT_USER: 'Mandant Benutzer',
};

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];
const CLIENT_ROLES = ['MANDANT_ADMIN', 'MANDANT_USER'];

interface ActiveUsersTableProps {
  users: User[];
  kind: 'WP' | 'CLIENT';
  onRefresh: () => void;
}

export function ActiveUsersTable({ users, kind, onRefresh }: ActiveUsersTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editTeamIds, setEditTeamIds] = useState<string[]>([]);
  const [editMandanten, setEditMandanten] = useState<MandantSelection[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [mandanten, setMandanten] = useState<MandantOption[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadOptions() {
    if (teams.length > 0 && mandanten.length > 0) return;
    const [teamData, mandantData] = await Promise.all([
      fetch('/api/teams').then((r) => r.json()).catch(() => ({ teams: [] })),
      fetch('/api/mandanten').then((r) => r.json()).catch(() => []),
    ]);
    setTeams(Array.isArray(teamData?.teams) ? teamData.teams : []);
    setMandanten(Array.isArray(mandantData) ? mandantData : []);
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditRole(user.role);
    setEditTeamIds(user.teams.map((t) => t.team.id));
    setEditMandanten(user.mandanten.map((m) => ({ mandantId: m.mandant.id, role: m.role })));
    void loadOptions();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRole('');
    setEditTeamIds([]);
    setEditMandanten([]);
  }

  function toggleTeam(teamId: string) {
    setEditTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  }

  function toggleMandant(mandantId: string) {
    setEditMandanten((prev) =>
      prev.some((link) => link.mandantId === mandantId)
        ? prev.filter((link) => link.mandantId !== mandantId)
        : [...prev, { mandantId, role: 'MANDANT_USER' }]
    );
  }

  function setMandantRole(mandantId: string, role: 'MANDANT_ADMIN' | 'MANDANT_USER') {
    setEditMandanten((prev) =>
      prev.map((link) => (link.mandantId === mandantId ? { ...link, role } : link))
    );
  }

  async function saveEdit(userId: string) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { role: editRole };
      if (kind === 'WP') body.teamIds = editTeamIds;
      else body.mandanten = editMandanten;

      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      cancelEdit();
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: User) {
    const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    onRefresh();
  }

  const roles = kind === 'WP' ? WP_ROLES : CLIENT_ROLES;

  if (users.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-dataly-slate">
        Keine {kind === 'WP' ? 'Kanzlei-Mitarbeiter' : 'Mandanten'} vorhanden.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>E-Mail</TableHead>
          <TableHead>Rolle</TableHead>
          <TableHead>{kind === 'WP' ? 'Teams' : 'Mandanten'}</TableHead>
          <TableHead>Aktiv</TableHead>
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} className={user.status === 'DISABLED' ? 'opacity-50' : ''}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell className="text-sm text-dataly-slate">{user.email}</TableCell>
            <TableCell>
              {editingId === user.id ? (
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role} className="text-xs">
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="text-xs font-normal">
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm text-dataly-slate">
              <MembershipCell
                user={user}
                kind={kind}
                editing={editingId === user.id}
                teams={teams}
                mandanten={mandanten}
                editTeamIds={editTeamIds}
                editMandanten={editMandanten}
                onToggleTeam={toggleTeam}
                onToggleMandant={toggleMandant}
                onMandantRoleChange={setMandantRole}
              />
            </TableCell>
            <TableCell>
              <Switch
                checked={user.status === 'ACTIVE'}
                onCheckedChange={() => toggleStatus(user)}
                aria-label={`${user.name} aktivieren/deaktivieren`}
              />
            </TableCell>
            <TableCell className="text-right">
              {editingId === user.id ? (
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => saveEdit(user.id)}
                    disabled={saving}
                    aria-label="Aenderungen speichern"
                  >
                    <Check className="h-3.5 w-3.5 text-dataly-success" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={cancelEdit}
                    aria-label="Bearbeitung abbrechen"
                  >
                    <X className="h-3.5 w-3.5 text-dataly-muted" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => startEdit(user)}
                  aria-label={`${user.name} bearbeiten`}
                >
                  <Pencil className="h-3.5 w-3.5 text-dataly-muted" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MembershipCell({
  user,
  kind,
  editing,
  teams,
  mandanten,
  editTeamIds,
  editMandanten,
  onToggleTeam,
  onToggleMandant,
  onMandantRoleChange,
}: {
  user: User;
  kind: 'WP' | 'CLIENT';
  editing: boolean;
  teams: TeamOption[];
  mandanten: MandantOption[];
  editTeamIds: string[];
  editMandanten: MandantSelection[];
  onToggleTeam: (teamId: string) => void;
  onToggleMandant: (mandantId: string) => void;
  onMandantRoleChange: (mandantId: string, role: 'MANDANT_ADMIN' | 'MANDANT_USER') => void;
}) {
  if (!editing) {
    if (kind === 'WP') return <>{user.teams.map((t) => t.team.name).join(', ') || '-'}</>;
    return (
      <>
        {user.mandanten
          .map((m) => `${m.mandant.name} (${ROLE_LABELS[m.role]})`)
          .join(', ') || '-'}
      </>
    );
  }

  if (kind === 'WP') {
    return (
      <div className="max-h-32 min-w-44 space-y-1 overflow-y-auto">
        {teams.map((team) => (
          <label key={team.id} className="flex items-center gap-2 text-xs text-dataly-ink">
            <Checkbox
              checked={editTeamIds.includes(team.id)}
              onCheckedChange={() => onToggleTeam(team.id)}
            />
            <span>{team.name}</span>
          </label>
        ))}
        {teams.length === 0 && <span className="text-xs text-dataly-muted">Keine Teams</span>}
      </div>
    );
  }

  return (
    <div className="max-h-40 min-w-56 space-y-2 overflow-y-auto">
      {mandanten.map((mandant) => {
        const selected = editMandanten.find((link) => link.mandantId === mandant.id);
        return (
          <div key={mandant.id} className="space-y-1">
            <label className="flex items-center gap-2 text-xs text-dataly-ink">
              <Checkbox
                checked={Boolean(selected)}
                onCheckedChange={() => onToggleMandant(mandant.id)}
              />
              <span>{mandant.name}</span>
            </label>
            {selected && (
              <NativeSelect
                className="h-7 text-xs"
                value={selected.role}
                onChange={(event) =>
                  onMandantRoleChange(
                    mandant.id,
                    event.target.value === 'MANDANT_ADMIN' ? 'MANDANT_ADMIN' : 'MANDANT_USER'
                  )
                }
              >
                <option value="MANDANT_USER">Mandant Benutzer</option>
                <option value="MANDANT_ADMIN">Mandant Admin</option>
              </NativeSelect>
            )}
          </div>
        );
      })}
      {mandanten.length === 0 && <span className="text-xs text-dataly-muted">Keine Mandanten</span>}
    </div>
  );
}

