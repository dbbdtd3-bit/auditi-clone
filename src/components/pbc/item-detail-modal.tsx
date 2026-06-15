'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModalFileList } from './modal-file-list';
import { ModalMetaPanel } from './modal-meta-panel';
import { ModalTabs } from './modal-tabs';
import type { PbcAssigneeOption } from '@/lib/pbc-assignees';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  OPEN: { label: 'Offen', variant: 'secondary' },
  UPLOADED: { label: 'Hochgeladen', variant: 'default' },
  ACCEPTED: { label: 'Akzeptiert', variant: 'success' },
  NEEDS_REVISION: { label: 'Überarbeitung nötig', variant: 'warning' },
  REJECTED: { label: 'Abgelehnt', variant: 'destructive' },
};

interface PbcFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date | string;
  downloadUrl?: string | null;
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
  item: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    dueDate?: Date | string | null;
    assignedTo?: string | null;
    prevItemId?: string | null;
    nextItemId?: string | null;
    files: PbcFile[];
    comments: Comment[];
    list: {
      id: string;
      title: string;
      activities: Activity[];
      workspace: { id: string };
    };
  };
  assigneeOptions: PbcAssigneeOption[];
}

export function ItemDetailModal({ item: initialItem, assigneeOptions }: Props) {
  const router = useRouter();
  const [item, setItem] = React.useState(initialItem);
  const [open, setOpen] = React.useState(true);

  const workspaceId = item.list.workspace.id;
  const listId = item.list.id;

  function handleClose() {
    setOpen(false);
    router.back();
  }

  function navigate(itemId: string) {
    router.replace(`/pbc/${workspaceId}/lists/${listId}/items/${itemId}`, { scroll: false });
  }

  function handleMetaUpdated(updates: { status?: string; dueDate?: string | null; assignedTo?: string | null }) {
    setItem((prev) => ({ ...prev, ...updates }));
  }

  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.OPEN;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <VisuallyHidden>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>Anforderung bearbeiten</DialogDescription>
        </VisuallyHidden>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
          <Badge variant={statusCfg.variant} className="shrink-0">{statusCfg.label}</Badge>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 truncate">{item.list.title}</p>
            <h2 className="text-base font-semibold text-slate-900 truncate">{item.title}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={!item.prevItemId}
              onClick={() => item.prevItemId && navigate(item.prevItemId)}
              title="Vorherige Anforderung"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={!item.nextItemId}
              onClick={() => item.nextItemId && navigate(item.nextItemId)}
              title="Nächste Anforderung"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {item.description && (
              <p className="text-sm text-slate-600">{item.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Files */}
              <ModalFileList
                itemId={item.id}
                files={item.files}
                onRefresh={() => router.refresh()}
              />

              {/* Right: Meta */}
              <ModalMetaPanel
                item={item}
                assigneeOptions={assigneeOptions}
                onUpdated={handleMetaUpdated}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pb-6 border-t mt-2 pt-4">
            <ModalTabs
              itemId={item.id}
              comments={item.comments}
              activities={item.list.activities}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
