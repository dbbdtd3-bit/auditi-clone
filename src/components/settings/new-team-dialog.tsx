'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TEAM_COLOR_HEX, TEAM_COLOR_LABEL } from '@/lib/team-colors';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (newTeamId?: string) => void;
}

export function NewTeamDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState('BLUE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colors = ['BLUE', 'RED', 'PURPLE', 'YELLOW', 'ORANGE', 'GREEN'];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name erforderlich'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), accentColor }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Fehler'); return; }
      setName('');
      setDescription('');
      setAccentColor('BLUE');
      onOpenChange(false);
      onCreated(data.team?.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neues Team anlegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Teamname</Label>
            <Input
              id="team-name"
              placeholder="z.B. Prüfungsteam 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-desc">Beschreibung (optional)</Label>
            <Input
              id="team-desc"
              placeholder="Kurze Beschreibung des Teams"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Akzentfarbe</Label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={TEAM_COLOR_LABEL[c]}
                  onClick={() => setAccentColor(c)}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                    accentColor === c ? 'border-slate-800 scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: TEAM_COLOR_HEX[c] }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Wird erstellt…' : 'Team erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
