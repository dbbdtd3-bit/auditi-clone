import * as React from 'react';
import { ItemListSkeleton } from '@/components/pbc/item-list-skeleton';
import { StatusSidebarSkeleton } from '@/components/pbc/status-sidebar-skeleton';

export default function ListLoading() {
  return (
    <div className="flex gap-6 p-6">
      <div className="flex-1 min-w-0">
        {/* Toolbar placeholder */}
        <div className="animate-pulse h-9 w-48 rounded-md bg-slate-200 mb-4" />
        <ItemListSkeleton />
      </div>
      <div className="w-72 shrink-0">
        <StatusSidebarSkeleton />
      </div>
    </div>
  );
}
