import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ListPageClient } from '@/components/pbc/list-page-client';

async function getList(listId: string, workspaceId: string) {
  try {
    const list = await prisma.pbcRequestList.findUnique({
      where: { id: listId },
      include: {
        workspace: {
          include: { engagement: { include: { mandant: true } } },
        },
        items: {
          include: { _count: { select: { files: true, comments: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        comments: { orderBy: { createdAt: 'asc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!list || list.workspaceId !== workspaceId) return null;
    return list;
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
  const list = await getList(listId, workspaceId);
  if (!list) notFound();

  const engagement = list.workspace.engagement;

  return (
    <div>
      <Header
        title={list.title}
        description={`${engagement.title} · ${engagement.mandant.name}`}
      />

      <div className="p-6 space-y-4">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/pbc" className="hover:text-slate-900 transition-colors">PBC</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/pbc/${workspaceId}`} className="hover:text-slate-900 transition-colors truncate max-w-[160px]">
            {engagement.title}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900 truncate max-w-[200px]">{list.title}</span>
        </nav>

        <ListPageClient
          listId={listId}
          workspaceId={workspaceId}
          initialItems={list.items.map((i) => ({
            id: i.id,
            title: i.title,
            status: i.status,
            dueDate: i.dueDate,
            sortOrder: i.sortOrder,
            assignedTo: i.assignedTo,
            _count: i._count,
          }))}
          initialComments={list.comments.map((c) => ({
            id: c.id,
            author: c.author,
            role: c.role,
            text: c.text,
            createdAt: c.createdAt,
          }))}
          initialActivities={list.activities.map((a) => ({
            id: a.id,
            event: a.event,
            actor: a.actor,
            meta: a.meta as Record<string, unknown> | null,
            createdAt: a.createdAt,
            itemId: a.itemId,
          }))}
        />
      </div>
    </div>
  );
}
