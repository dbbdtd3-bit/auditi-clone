'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { FileText } from 'lucide-react';
import { ItemRow } from './item-row';

interface Item {
  id: string;
  title: string;
  status: string;
  dueDate: string | Date | null;
  sortOrder: number;
  _count: { files: number; comments: number };
}

interface Props {
  items: Item[];
  listId: string;
  workspaceId: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function ItemList({ items: initialItems, listId, workspaceId, selectedIds, onSelectionChange }: Props) {
  const [items, setItems] = React.useState(initialItems);

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    try {
      await fetch(`/api/pbc/lists/${listId}/items/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
      });
    } catch {
      setItems(items);
    }
  }

  function handleCheckedChange(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-8 w-8 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">Noch keine Anforderungen in dieser Liste.</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              listId={listId}
              workspaceId={workspaceId}
              checked={selectedIds.has(item.id)}
              onCheckedChange={handleCheckedChange}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
