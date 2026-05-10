import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  FilePlus,
  RefreshCw,
  Edit2,
  Trash2,
  Upload,
  MessageSquare,
  CheckSquare,
  ArrowUpDown,
  LayoutTemplate,
} from 'lucide-react';

interface Activity {
  id: string;
  event: string;
  actor?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: Date | string;
  itemId?: string | null;
}

interface ActivityStreamProps {
  activities: Activity[];
}

function getEventIcon(event: string) {
  const cls = 'h-4 w-4 shrink-0 text-slate-400';
  switch (event) {
    case 'ITEM_CREATED': return <FilePlus className={cls} />;
    case 'ITEM_STATUS_CHANGED': return <RefreshCw className={cls} />;
    case 'ITEM_UPDATED': return <Edit2 className={cls} />;
    case 'ITEM_DELETED': return <Trash2 className={cls} />;
    case 'FILE_UPLOADED': return <Upload className={cls} />;
    case 'FILE_DELETED': return <Trash2 className={cls} />;
    case 'COMMENT_ADDED': return <MessageSquare className={cls} />;
    case 'LIST_COMMENT_ADDED': return <MessageSquare className={cls} />;
    case 'BULK_STATUS_CHANGED': return <CheckSquare className={cls} />;
    case 'ITEMS_REORDERED': return <ArrowUpDown className={cls} />;
    case 'TEMPLATE_APPLIED': return <LayoutTemplate className={cls} />;
    default: return <RefreshCw className={cls} />;
  }
}

function getEventText(event: string, meta?: Record<string, unknown> | null): string {
  switch (event) {
    case 'ITEM_CREATED':
      return `hat Anforderung „${meta?.title ?? ''}" erstellt`;
    case 'ITEM_STATUS_CHANGED':
      return `hat Status geändert: ${meta?.from ?? ''} → ${meta?.to ?? ''}`;
    case 'ITEM_UPDATED':
      return 'hat Anforderung aktualisiert';
    case 'ITEM_DELETED':
      return `hat Anforderung „${meta?.title ?? ''}" gelöscht`;
    case 'FILE_UPLOADED':
      return `hat Datei „${meta?.filename ?? ''}" hochgeladen`;
    case 'FILE_DELETED':
      return `hat Datei „${meta?.filename ?? ''}" gelöscht`;
    case 'COMMENT_ADDED':
      return 'hat einen Kommentar hinzugefügt';
    case 'LIST_COMMENT_ADDED':
      return 'hat eine Listenbemerkung hinzugefügt';
    case 'BULK_STATUS_CHANGED':
      return `hat ${meta?.count ?? 0} Anforderung(en) geändert`;
    case 'ITEMS_REORDERED':
      return `hat ${meta?.count ?? 0} Anforderungen neu sortiert`;
    case 'TEMPLATE_APPLIED':
      return `hat Vorlage „${meta?.templateName ?? ''}" angewendet`;
    default:
      return event;
  }
}

export function ActivityStream({ activities }: ActivityStreamProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">Noch keine Aktivitäten.</p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const date = new Date(activity.createdAt);
        const relative = formatDistanceToNow(date, { addSuffix: true, locale: de });

        return (
          <div key={activity.id} className="flex items-start gap-2.5">
            <div className="mt-0.5">{getEventIcon(activity.event)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700">
                <span className="font-medium">{activity.actor ?? 'System'}</span>{' '}
                {getEventText(activity.event, activity.meta)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{relative}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
