'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/select';
import { UndoButton } from './undo-button';
import { Loader2, RotateCcw } from 'lucide-react';

type AuditEntry = {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  undone: boolean;
  createdAt: string;
  undoable: boolean;
};

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: 'Login',
  USER_REGISTERED: 'Registrierung',
  USER_APPROVED: 'Freischaltung',
  USER_REJECTED: 'Ablehnung',
  USER_UPDATED: 'Benutzer geändert',
  TEAM_CREATED: 'Team erstellt',
  TEAM_UPDATED: 'Team geändert',
  TEAM_DELETED: 'Team gelöscht',
  PBC_ITEM_STATUS_CHANGED: 'Status geändert',
  PBC_ITEM_UPDATED: 'Eintrag geändert',
  PBC_LIST_DELETED: 'Liste gelöscht',
  CAMPAIGN_SENT: 'Kampagne versendet',
  AUDIT_UNDONE: 'Rückgängig gemacht',
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export function AuditLogTable() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterAction, setFilterAction] = useState('');

  const fetchEntries = useCallback(
    async (nextCursor: string | null, reset: boolean) => {
      const params = new URLSearchParams({ limit: '50' });
      if (filterAction) params.set('action', filterAction);
      if (nextCursor) params.set('cursor', nextCursor);

      const res = await fetch(`/api/admin/audit-log?${params}`);
      const data = await res.json();

      setEntries((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    },
    [filterAction]
  );

  useEffect(() => {
    setLoading(true);
    fetchEntries(null, true).finally(() => setLoading(false));
  }, [fetchEntries]);

  async function loadMore() {
    setLoadingMore(true);
    await fetchEntries(cursor, false);
    setLoadingMore(false);
  }

  function refresh() {
    setLoading(true);
    fetchEntries(null, true).finally(() => setLoading(false));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <NativeSelect
          className="w-52 h-8 text-sm py-1"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="">Alle Aktionen</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="rounded-lg border border-dataly-line bg-dataly-surface overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12 text-dataly-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-sm text-dataly-slate py-12">Keine Einträge gefunden.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Datum</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Benutzer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-36">Rückgängig</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className={entry.undone ? 'opacity-50' : ''}>
                  <TableCell className="text-xs text-dataly-muted whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString('de-DE', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </Badge>
                      {entry.entityType && (
                        <span className="text-xs text-dataly-muted">{entry.entityType}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-dataly-slate">
                    {entry.actorEmail ?? '—'}
                  </TableCell>
                  <TableCell>
                    {entry.undone && (
                      <Badge
                        variant="outline"
                        className="text-xs text-dataly-muted gap-1 border-dataly-line"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rückgängig
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.undoable && !entry.undone && (
                      <UndoButton entryId={entry.id} onSuccess={refresh} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loadingMore}
            className="gap-2"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            Weitere laden
          </Button>
        </div>
      )}
    </div>
  );
}
