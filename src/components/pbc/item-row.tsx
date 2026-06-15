'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { differenceInDays } from 'date-fns';
import { GripVertical, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Item {
  id: string;
  title: string;
  status: string;
  dueDate: string | Date | null;
  _count: { files: number; comments: number };
}

interface Props {
  item: Item;
  listId: string;
  workspaceId: string;
  checked: boolean;
  onCheckedChange: (id: string, checked: boolean) => void;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' }> = {
  OPEN: { label: 'Offen', variant: 'secondary' },
  UPLOADED: { label: 'Hochgeladen', variant: 'default' },
  ACCEPTED: { label: 'Akzeptiert', variant: 'success' },
  NEEDS_REVISION: { label: 'Überarbeitung', variant: 'warning' },
  REJECTED: { label: 'Abgelehnt', variant: 'destructive' },
};

export function ItemRow({ item, listId, workspaceId, checked, onCheckedChange }: Props) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cfg = STATUS_BADGE[item.status] || STATUS_BADGE.OPEN;

  let dueBadge: React.ReactNode = null;
  if (item.dueDate) {
    const days = differenceInDays(new Date(item.dueDate), new Date());
    if (days < 0) {
      dueBadge = <span className="text-[10px] text-red-600 font-medium">vor {Math.abs(days)} {Math.abs(days) === 1 ? 'Tag' : 'Tagen'} fällig</span>;
    } else if (days <= 7) {
      dueBadge = <span className="text-[10px] text-yellow-600 font-medium">diese Woche fällig</span>;
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow group',
        checked && 'ring-2 ring-blue-500'
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(item.id, !!val)}
        onClick={(e) => e.stopPropagation()}
      />

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => router.push(`/pbc/${workspaceId}/lists/${listId}/items/${item.id}`, { scroll: false })}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900 truncate">{item.title}</span>
          <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0 shrink-0">{cfg.label}</Badge>
          {dueBadge}
        </div>
      </div>

      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-slate-400" />
      </div>
    </div>
  );
}
