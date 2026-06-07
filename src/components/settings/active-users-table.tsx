'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronDown, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

function normalizeMandantRole(role: string): 'MANDANT_ADMIN' | 'MANDANT_USER' {
  return role === 'MANDANT_ADMIN' ? 'MANDANT_ADMIN' : 'MANDANT_USER';
}

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
        : [...prev, { mandantId, role: normalizeMandantRole(editRole) }]
    );
  }

  function handleRoleChange(role: string) {
    setEditRole(role);
    if (kind === 'CLIENT') {
      const mandantRole = normalizeMandantRole(role);
      setEditMandanten((prev) => prev.map((link) => ({ ...link, role: mandantRole })));
    }
  }

  async function saveEdit(userId: string) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { role: editRole };
      if (kind === 'WP') body.teamIds = editTeamIds;
      else {
        const mandantRole = normalizeMandantRole(editRole);
        body.mandanten = editMandanten.map((link) => ({
          mandantId: link.mandantId,
          role: mandantRole,
        }));
      }

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
          {kind === 'CLIENT' && <TableHead>Mandanten</TableHead>}
          <TableHead>Rolle</TableHead>
          {kind === 'WP' && <TableHead>Teams</TableHead>}
          <TableHead>Aktiv</TableHead>
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} className={user.status === 'DISABLED' ? 'opacity-50' : ''}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell className="text-sm text-dataly-slate">{user.email}</TableCell>
            {kind === 'CLIENT' && (
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
                />
              </TableCell>
            )}
            <TableCell>
              {editingId === user.id ? (
                <Select value={editRole} onValueChange={handleRoleChange}>
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
            {kind === 'WP' && (
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
                />
              </TableCell>
            )}
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
}) {
  if (!editing) {
    if (kind === 'WP') return <>{user.teams.map((t) => t.team.name).join(', ') || '-'}</>;
    return <>{user.mandanten.map((m) => m.mandant.name).join(', ') || '-'}</>;
  }

  if (kind === 'WP') {
    return (
      <MultiSelectDropdown
        options={teams}
        selectedIds={editTeamIds}
        onToggle={onToggleTeam}
        placeholder="Teams wählen"
        searchPlaceholder="Teams suchen..."
        emptyLabel="Keine Teams"
      />
    );
  }

  return (
    <MultiSelectDropdown
      options={mandanten}
      selectedIds={editMandanten.map((link) => link.mandantId)}
      onToggle={onToggleMandant}
      placeholder="Mandanten wählen"
      searchPlaceholder="Mandanten suchen..."
      emptyLabel="Keine Mandanten"
      widthClassName="w-64"
    />
  );
}

function MultiSelectDropdown({
  options,
  selectedIds,
  onToggle,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  widthClassName = 'w-52',
}: {
  options: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  widthClassName?: string;
}) {
  const selectedOptions = options.filter((option) => selectedIds.includes(option.id));
  const label =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? selectedOptions[0].name
        : `${selectedOptions.length} ausgewählt`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-7 justify-between gap-2 px-2 text-xs font-normal', widthClassName)}
        >
          <span className={cn('truncate', selectedOptions.length === 0 && 'text-dataly-muted')}>
            {label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-dataly-muted" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = selectedIds.includes(option.id);
                return (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => onToggle(option.id)}
                    className="cursor-pointer"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-sm border border-dataly-line',
                        selected && 'border-dataly-blue bg-dataly-blue text-white'
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate text-dataly-ink">{option.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
