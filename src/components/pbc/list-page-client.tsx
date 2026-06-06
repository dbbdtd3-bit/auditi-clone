'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ListToolbar } from './list-toolbar';
import { ItemList } from './item-list';
import { StatusSidebar } from './status-sidebar';
import { BulkActionBar } from './bulk-action-bar';

interface Item {
  id: string;
  title: string;
  status: string;
  dueDate: Date | string | null;
  sortOrder: number;
  assignedTo: string | null;
  _count: { files: number; comments: number };
}

interface Comment {
  id: string;
  author: string;
  role: string;
  text: string;
  createdAt: Date | string;
}

interface Activity {
  id: string;
  event: string;
  actor?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: Date | string;
  itemId?: string | null;
}

interface Props {
  listId: string;
  workspaceId: string;
  initialItems: Item[];
  initialComments: Comment[];
  initialActivities: Activity[];
  currentUserId: string;
  currentUserRole: string;
  createdById: string | null;
}

export function ListPageClient({
  listId,
  workspaceId,
  initialItems,
  initialComments,
  initialActivities,
  currentUserRole,
}: Props) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState('');

  React.useEffect(() => { setItems(initialItems); }, [initialItems]);

  const filtered = search
    ? items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()))
    : items;

  function handleMasterCheck(checked: boolean) {
    if (checked) setSelectedIds(new Set(filtered.map((i) => i.id)));
    else setSelectedIds(new Set());
  }

  function handleSelectId(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleReorder(orderedIds: string[]) {
    const map = new Map(items.map((i) => [i.id, i]));
    const reordered = orderedIds.map((id, idx) => ({ ...map.get(id)!, sortOrder: idx }));
    const rest = items.filter((i) => !orderedIds.includes(i.id));
    setItems([...reordered, ...rest]);
  }

  function handleDone() {
    setSelectedIds(new Set());
    router.refresh();
  }

  const isWp = currentUserRole === 'WP_ADMIN' || currentUserRole === 'WP_TEAM';

  return (
    <div className="space-y-4">
      <ListToolbar
        listId={listId}
        search={search}
        onSearchChange={setSearch}
        totalSelected={selectedIds.size}
        totalItems={filtered.length}
        onMasterCheck={handleMasterCheck}
        onItemsChanged={() => router.refresh()}
        isWp={isWp}
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <ItemList
            items={filtered}
            listId={listId}
            workspaceId={workspaceId}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
        <div className="col-span-1">
          <StatusSidebar
            items={items}
            listId={listId}
            initialComments={initialComments}
            initialActivities={initialActivities}
          />
        </div>
      </div>

      <BulkActionBar
        selectedIds={selectedIds}
        listId={listId}
        onClear={() => setSelectedIds(new Set())}
        onDone={handleDone}
      />
    </div>
  );
}
