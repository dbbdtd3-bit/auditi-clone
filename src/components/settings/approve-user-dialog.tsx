'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  kind: 'WP' | 'CLIENT';
};

type Team = { id: string; name: string };
type Mandant = { id: string; name: string };

interface ApproveUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}

const WP_ROLES = [
  { value: 'WP_ADMIN', label: 'WP Admin' },
  { value: 'WP_TEAM', label: 'WP Mitarbeiter' },
];

const CLIENT_ROLES = [
  { value: 'MANDANT_ADMIN', label: 'Mandant Admin' },
  { value: 'MANDANT_USER', label: 'Mandant Benutzer' },
];

export function ApproveUserDialog({ user, open, onOpenChange, onApproved }: ApproveUserDialogProps) {
  const [role, setRole] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedMandanten, setSelectedMandanten] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [mandanten, setMandanten] = useState<Mandant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setRole('');
    setSelectedTeams([]);
    setSelectedMandanten([]);
    setError('');

    Promise.all([
      fetch('/api/teams').then((r) => r.json()),
      fetch('/api/mandanten').then((r) => r.json()),
    ]).then(([t, m]) => {
      setTeams(Array.isArray(t) ? t : []);
      setMandanten(Array.isArray(m) ? m : []);
    });
  }, [open]);

  const isWp = user?.kind === 'WP';
  const roles = isWp ? WP_ROLES : CLIENT_ROLES;

  function toggleTeam(id: string) {
    setSelectedTeams((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function toggleMandant(id: string) {
    setSelectedMandanten((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function handleApprove() {
    if (!user || !role) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          teamIds: isWp ? selectedTeams : [],
          mandantIds: !isWp ? selectedMandanten : [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Fehler beim Freischalten');
        return;
      }
      onApproved();
      onOpenChange(false);
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Benutzer freischalten</DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-4">
            <div className="rounded-md bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">{user.name}</p>
              <p className="text-slate-500">{user.email}</p>
              <p className="text-slate-400 text-xs mt-1">{user.kind === 'WP' ? 'Kanzlei-Mitarbeiter' : 'Mandant'}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Rolle zuweisen</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Rolle wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isWp && teams.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Teams (optional)</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {teams.map((team) => (
                    <label key={team.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={selectedTeams.includes(team.id)}
                        onCheckedChange={() => toggleTeam(team.id)}
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!isWp && mandanten.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Mandanten (optional)</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {mandanten.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={selectedMandanten.includes(m.id)}
                        onCheckedChange={() => toggleMandant(m.id)}
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleApprove} disabled={!role || loading} className="bg-blue-700 hover:bg-blue-800">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Freischalten'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
