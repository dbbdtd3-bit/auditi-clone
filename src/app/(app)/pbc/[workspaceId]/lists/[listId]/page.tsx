import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  ArrowLeft,
  Calendar,
  Paperclip,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { CreateItemDialog } from '@/components/pbc/create-item-dialog';

const statusConfig: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning';
  colorClass: string;
}> = {
  OPEN: { label: 'Offen', variant: 'secondary', colorClass: 'bg-slate-100' },
  UPLOADED: { label: 'Hochgeladen', variant: 'default', colorClass: 'bg-blue-100' },
  ACCEPTED: { label: 'Akzeptiert', variant: 'success', colorClass: 'bg-green-100' },
  NEEDS_REVISION: { label: 'Überarbeitung nötig', variant: 'warning', colorClass: 'bg-amber-100' },
};

async function getList(listId: string) {
  try {
    return await prisma.pbcRequestList.findUnique({
      where: { id: listId },
      include: {
        workspace: {
          include: { engagement: { include: { mandant: true } } },
        },
        items: {
          include: {
            _count: { select: { files: true, comments: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  } catch {
    return null;
  }
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ workspaceId: string; listId: string }>;
}) {
  const { workspaceId, listId } = await params;
  const list = await getList(listId);

  if (!list) notFound();
  if (list.workspaceId !== workspaceId) notFound();

  const engagement = list.workspace.engagement;

  return (
    <div>
      <Header
        title={list.title}
        description={`${engagement.title} · ${engagement.mandant.name}`}
      />

      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/pbc" className="hover:text-slate-900 transition-colors">PBC</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/pbc/${workspaceId}`} className="hover:text-slate-900 transition-colors truncate max-w-[160px]">
            {engagement.title}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900 truncate max-w-[160px]">{list.title}</span>
        </nav>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/pbc/${workspaceId}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Workspace
          </Link>
          <CreateItemDialog listId={listId} />
        </div>

        {/* Summary */}
        <div className="flex gap-2 flex-wrap">
          {(['OPEN', 'UPLOADED', 'ACCEPTED', 'NEEDS_REVISION'] as const).map((s) => {
            const count = list.items.filter((i) => i.status === s).length;
            if (count === 0) return null;
            const cfg = statusConfig[s];
            return (
              <Badge key={s} variant={cfg.variant}>
                {count} {cfg.label}
              </Badge>
            );
          })}
          <span className="text-xs text-slate-400 self-center">
            {list.items.length} {list.items.length === 1 ? 'Anforderung' : 'Anforderungen'} gesamt
          </span>
        </div>

        {/* Items */}
        {list.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-8 w-8 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Noch keine Anforderungen in dieser Liste.</p>
              <p className="text-xs text-slate-400 mt-1">
                Fügen Sie die erste Anforderung mit dem Button oben rechts hinzu.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {list.items.map((item) => {
              const cfg = statusConfig[item.status] || statusConfig.OPEN;
              return (
                <Link
                  key={item.id}
                  href={`/pbc/${workspaceId}/lists/${listId}/items/${item.id}`}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-start gap-4 py-4">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5 ${cfg.colorClass}`}>
                        <FileText className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          {item.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span className="text-xs text-slate-500">
                                {new Date(item.dueDate).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          )}
                          {item._count.files > 0 && (
                            <div className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3 text-slate-400" />
                              <span className="text-xs text-slate-500">{item._count.files}</span>
                            </div>
                          )}
                          {item._count.comments > 0 && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-slate-400" />
                              <span className="text-xs text-slate-500">{item._count.comments}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
