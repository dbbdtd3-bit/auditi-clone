'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApproveUserDialog } from './approve-user-dialog';
import { CheckCircle, XCircle } from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  kind: 'WP' | 'CLIENT';
  createdAt: string;
};

interface PendingUsersTableProps {
  users: User[];
  onRefresh: () => void;
}

export function PendingUsersTable({ users, onRefresh }: PendingUsersTableProps) {
  const [approveTarget, setApproveTarget] = useState<User | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  async function handleReject(user: User) {
    if (!confirm(`Anfrage von „${user.name}" ablehnen?`)) return;
    setRejectingId(user.id);
    try {
      await fetch(`/api/admin/users/${user.id}/reject`, { method: 'POST' });
      onRefresh();
    } finally {
      setRejectingId(null);
    }
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-dataly-slate py-6 text-center">Keine ausstehenden Registrierungen.</p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Registriert am</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-dataly-slate">{user.email}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {user.kind === 'WP' ? 'Kanzlei' : 'Mandant'}
                </Badge>
              </TableCell>
              <TableCell className="text-dataly-muted text-sm">
                {new Date(user.createdAt).toLocaleDateString('de-DE')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-700 border-green-200 hover:bg-green-50"
                    onClick={() => setApproveTarget(user)}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Freischalten
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleReject(user)}
                    disabled={rejectingId === user.id}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Ablehnen
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ApproveUserDialog
        user={approveTarget}
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        onApproved={onRefresh}
      />
    </>
  );
}
