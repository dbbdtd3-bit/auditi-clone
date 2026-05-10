'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X } from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  kind: 'WP' | 'CLIENT';
  teams: { team: { id: string; name: string } }[];
  mandanten: { mandant: { id: string; name: string } }[];
  createdAt: string;
};

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
  const [saving, setSaving] = useState(false);

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditRole(user.role);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRole('');
  }

  async function saveEdit(userId: string) {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      setEditingId(null);
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
      <p className="text-sm text-slate-500 py-6 text-center">
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
            <TableCell className="text-slate-500 text-sm">{user.email}</TableCell>
            <TableCell>
              {editingId === user.id ? (
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="text-xs font-normal">
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm text-slate-500">
              {kind === 'WP'
                ? user.teams.map((t) => t.team.name).join(', ') || '—'
                : user.mandanten.map((m) => m.mandant.name).join(', ') || '—'}
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
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(user.id)} disabled={saving}>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                </div>
              ) : (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(user)}>
                  <Pencil className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
