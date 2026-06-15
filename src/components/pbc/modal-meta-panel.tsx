'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { NativeSelect as Select } from '@/components/ui/select';
import { DueDatePopover } from './due-date-popover';
import { Badge } from '@/components/ui/badge';
import type { PbcAssigneeOption } from '@/lib/pbc-assignees';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Offen', variant: 'secondary' as const },
  { value: 'UPLOADED', label: 'Hochgeladen', variant: 'default' as const },
  { value: 'ACCEPTED', label: 'Akzeptiert', variant: 'success' as const },
  { value: 'NEEDS_REVISION', label: 'Überarbeitung nötig', variant: 'warning' as const },
  { value: 'REJECTED', label: 'Abgelehnt', variant: 'destructive' as const },
];

interface Props {
  item: {
    id: string;
    status: string;
    dueDate?: Date | string | null;
    assignedTo?: string | null;
  };
  assigneeOptions: PbcAssigneeOption[];
  onUpdated: (updated: { status?: string; dueDate?: string | null; assignedTo?: string | null }) => void;
}

export function ModalMetaPanel({ item, assigneeOptions, onUpdated }: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    const key = Object.keys(data)[0];
    setSaving(key);
    setError(null);
    try {
      const res = await fetch(`/api/pbc/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdated({ status: updated.status, dueDate: updated.dueDate, assignedTo: updated.assignedTo });
        router.refresh();
      } else {
        const payload = await res.json().catch(() => null);
        setError(payload?.error ?? 'Aenderung konnte nicht gespeichert werden.');
      }
    } finally {
      setSaving(null);
    }
  }

  const statusCfg = STATUS_OPTIONS.find((s) => s.value === item.status) ?? STATUS_OPTIONS[0];
  const hasCurrentAssignee =
    !!item.assignedTo && assigneeOptions.some((option) => option.value === item.assignedTo);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Status</Label>
        <Select
          value={item.status}
          onChange={(e) => patch({ status: e.target.value })}
          disabled={saving === 'status'}
          className="h-9"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <Label className="text-xs text-slate-500">Frist</Label>
        <DueDatePopover
          value={item.dueDate ? new Date(item.dueDate) : null}
          onChange={(date) => patch({ dueDate: date ? date.toISOString() : null })}
          disabled={saving === 'dueDate'}
          triggerClassName="h-9 w-fit px-3 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Zugewiesen an</Label>
        <Select
          value={item.assignedTo ?? ''}
          onChange={(e) => patch({ assignedTo: e.target.value || null })}
          disabled={saving === 'assignedTo'}
          className="h-10"
        >
          <option value="">Nicht zugewiesen</option>
          {item.assignedTo && !hasCurrentAssignee ? (
            <option value={item.assignedTo} disabled>
              {item.assignedTo} (nicht mehr berechtigt)
            </option>
          ) : null}
          {assigneeOptions.map((option) => (
            <option key={`${option.audience}:${option.id}`} value={option.value}>
              {option.email ? `${option.name} - ${option.email}` : option.name}
            </option>
          ))}
        </Select>
        {assigneeOptions.length === 0 ? (
          <p className="text-xs leading-5 text-dataly-muted">
            Keine berechtigten Personen fuer diese Liste gefunden.
          </p>
        ) : null}
        {error ? (
          <p className="text-xs leading-5 text-dataly-danger">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
