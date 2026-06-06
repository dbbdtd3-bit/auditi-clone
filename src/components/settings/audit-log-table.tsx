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
import { ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEntries = useCallback(
    async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filterAction) params.set('action', filterAction);

      const res = await fetch(`/api/admin/audit-log?${params}`);
      const data = await res.json();

      setEntries(Array.isArray(data.items) ? data.items : []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    },
    [filterAction, page, pageSize]
  );

  useEffect(() => {
    setLoading(true);
    fetchEntries().finally(() => setLoading(false));
  }, [fetchEntries]);

  function refresh() {
    setLoading(true);
    fetchEntries().finally(() => setLoading(false));
  }

  const pageNumbers = Array.from({ length: Math.min(3, totalPages) }, (_, idx) => {
    const start = Math.min(Math.max(page - 1, 1), Math.max(totalPages - 2, 1));
    return start + idx;
  }).filter((p) => p <= totalPages);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NativeSelect
          className="w-52 h-8 text-sm py-1"
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Alle Aktionen</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </NativeSelect>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-dataly-muted">Eintraege</span>
          <NativeSelect
            className="h-8 w-20 text-sm py-1"
            value={String(pageSize)}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="20">20</option>
            <option value="50">50</option>
          </NativeSelect>
        </div>
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

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-dataly-muted">
            Seite {page} von {totalPages} · {total} Eintraege
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              aria-label="Vorherige Seite"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageNumbers.map((pageNumber) => (
              <Button
                key={pageNumber}
                variant={pageNumber === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(pageNumber)}
                disabled={loading}
                className="w-9"
              >
                {pageNumber}
              </Button>
            ))}
          <Button
            variant="outline"
            size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              aria-label="Naechste Seite"
          >
              <ChevronRight className="h-4 w-4" />
          </Button>
          </div>
        </div>
      )}
    </div>
  );
}
