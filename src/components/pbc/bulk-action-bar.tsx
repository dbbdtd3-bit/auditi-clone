'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { DueDatePopover } from './due-date-popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Download, Trash2, X } from 'lucide-react';

interface Props {
  selectedIds: Set<string>;
  listId: string;
  onClear: () => void;
  onDone: () => void;
}

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Offen' },
  { value: 'UPLOADED', label: 'Hochgeladen' },
  { value: 'ACCEPTED', label: 'Akzeptiert' },
  { value: 'NEEDS_REVISION', label: 'Überarbeitung nötig' },
  { value: 'REJECTED', label: 'Abgelehnt' },
];

async function bulkOp(listId: string, ids: string[], op: string, value?: string | null) {
  const res = await fetch(`/api/pbc/lists/${listId}/items/bulk`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, op, value }),
  });
  if (!res.ok) throw new Error('Bulk-Operation fehlgeschlagen');
}

export function BulkActionBar({ selectedIds, listId, onClear, onDone }: Props) {
  const [loading, setLoading] = React.useState(false);
  const ids = Array.from(selectedIds);

  if (selectedIds.size === 0) return null;

  async function handleStatus(status: string) {
    setLoading(true);
    try {
      await bulkOp(listId, ids, 'status', status);
      onDone();
    } catch { alert('Fehler beim Ändern des Status'); }
    finally { setLoading(false); }
  }

  async function handleDueDate(date: Date | null) {
    setLoading(true);
    try {
      await bulkOp(listId, ids, 'dueDate', date ? date.toISOString() : null);
      onDone();
    } catch { alert('Fehler beim Setzen der Frist'); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!confirm(`${ids.length} Anforderung(en) wirklich löschen?`)) return;
    setLoading(true);
    try {
      await bulkOp(listId, ids, 'delete');
      onDone();
    } catch { alert('Fehler beim Löschen'); }
    finally { setLoading(false); }
  }

  async function handleDownload() {
    window.open(`/api/pbc/lists/${listId}/download`, '_blank');
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center p-3 bg-white border-t border-slate-200 shadow-lg gap-3">
      <span className="text-sm font-medium text-slate-700">{ids.length} ausgewählt</span>

      <Button variant="ghost" size="sm" onClick={onClear} disabled={loading}>
        <X className="h-3.5 w-3.5 mr-1" />
        Abwählen
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            Status <ChevronDown className="h-3.5 w-3.5 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {STATUS_OPTIONS.map((s) => (
            <DropdownMenuItem key={s.value} onClick={() => handleStatus(s.value)}>
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DueDatePopover value={null} onChange={handleDueDate} disabled={loading} />

      <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
        <Download className="h-3.5 w-3.5 mr-1" />
        Herunterladen
      </Button>

      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Löschen
      </Button>
    </div>
  );
}
