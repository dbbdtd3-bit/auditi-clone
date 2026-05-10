'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  teamId: string;
  teamName: string;
  onDeleted: () => void;
}

export function DeleteTeamButton({ teamId, teamName, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
    setLoading(false);
    setOpen(false);
    onDeleted();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        Team löschen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Team löschen?</DialogTitle>
            <DialogDescription>
              Das Team <strong>{teamName}</strong> wird dauerhaft gelöscht. Alle Mitglieder
              werden aus dem Team entfernt. Diese Aktion kann rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Wird gelöscht…' : 'Endgültig löschen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
