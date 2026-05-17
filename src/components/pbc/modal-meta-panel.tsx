'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NativeSelect as Select } from '@/components/ui/select';
import { DueDatePopover } from './due-date-popover';
import { Badge } from '@/components/ui/badge';

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
  onUpdated: (updated: { status?: string; dueDate?: string | null; assignedTo?: string | null }) => void;
}

export function ModalMetaPanel({ item, onUpdated }: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    const key = Object.keys(data)[0];
    setSaving(key);
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
      }
    } finally {
      setSaving(null);
    }
  }

  const statusCfg = STATUS_OPTIONS.find((s) => s.value === item.status) ?? STATUS_OPTIONS[0];

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

      <div className="space-y-3">
        <Label className="text-xs text-slate-500">Frist</Label>
        <DueDatePopover
          value={item.dueDate ? new Date(item.dueDate) : null}
          onChange={(date) => patch({ dueDate: date ? date.toISOString() : null })}
          disabled={saving === 'dueDate'}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Zugewiesen an</Label>
        <Input
          defaultValue={item.assignedTo ?? ''}
          placeholder="Name eingeben..."
          disabled={saving === 'assignedTo'}
          onBlur={(e) => {
            const val = e.target.value.trim() || null;
            if (val !== (item.assignedTo ?? null)) {
              patch({ assignedTo: val });
            }
          }}
        />
      </div>
    </div>
  );
}
