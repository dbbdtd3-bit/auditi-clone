import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ListPageClient } from '@/components/pbc/list-page-client';
import { canAccessWorkspace } from '@/lib/pbc-access';

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
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) notFound();
  const isWp = user.role === 'WP_ADMIN' || user.role === 'WP_TEAM';
  if (!await canAccessWorkspace(user.id, isWp, workspaceId)) notFound();

  const list = await getList(listId, workspaceId);
  if (!list) notFound();

  const engagement = list.workspace.engagement;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'PBC', href: '/pbc' },
        { label: engagement.title, href: `/pbc/${workspaceId}` },
        { label: list.title },
      ]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">{list.title}</h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            {engagement.title} · {engagement.mandant.name}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
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
          currentUserId={user.id}
          currentUserRole={user.role ?? ''}
          createdById={list.createdById}
        />
      </div>
    </div>
  );
}
