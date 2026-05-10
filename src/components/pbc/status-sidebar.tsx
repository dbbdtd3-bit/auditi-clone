'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusProgress } from './status-progress';
import { StatusCounters } from './status-counters';
import { ListCommentStream } from './list-comment-stream';
import { ActivityStream } from './activity-stream';

interface Item {
  id: string;
  status: string;
  dueDate: string | Date | null;
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
  items: Item[];
  listId: string;
  initialComments: Array<{ id: string; author: string; role: string; text: string; createdAt: Date | string }>;
  initialActivities: Activity[];
}

export function StatusSidebar({ items, listId, initialComments, initialActivities }: Props) {
  const counts = {
    OPEN: items.filter((i) => i.status === 'OPEN').length,
    UPLOADED: items.filter((i) => i.status === 'UPLOADED').length,
    ACCEPTED: items.filter((i) => i.status === 'ACCEPTED').length,
    NEEDS_REVISION: items.filter((i) => i.status === 'NEEDS_REVISION').length,
    REJECTED: items.filter((i) => i.status === 'REJECTED').length,
  };
  const total = items.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 h-fit">
      <Tabs defaultValue="status">
        <TabsList className="w-full">
          <TabsTrigger value="status" className="flex-1 text-xs">Status</TabsTrigger>
          <TabsTrigger value="comments" className="flex-1 text-xs">Bemerkungen</TabsTrigger>
          <TabsTrigger value="activities" className="flex-1 text-xs">Aktivitäten</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4 space-y-4">
          <StatusProgress counts={counts} total={total} />
          <StatusCounters counts={counts} />
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <ListCommentStream listId={listId} initialComments={initialComments} />
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <ActivityStream activities={initialActivities} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
