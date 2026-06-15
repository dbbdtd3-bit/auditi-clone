import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ItemDetailModal } from '@/components/pbc/item-detail-modal';
import { getPresignedDownload } from '@/lib/obs';
import { auth } from '@/lib/auth';
import { canAccessWorkspace } from '@/lib/pbc-access';
import { getPbcListAssigneeOptions } from '@/lib/pbc-assignees';

export default async function ModalItemPage({
  params,
}: {
  params: Promise<{ workspaceId: string; listId: string; itemId: string }>;
}) {
  const { workspaceId, listId, itemId } = await params;

  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) notFound();

  const isWp = user.role === 'WP_ADMIN' || user.role === 'WP_TEAM';
  if (!await canAccessWorkspace(user.id, isWp, workspaceId)) notFound();

  const [item, siblings, assigneeOptions] = await Promise.all([
    prisma.pbcRequestItem.findUnique({
      where: { id: itemId },
      include: {
        files: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'asc' } },
        list: {
          include: {
            activities: { orderBy: { createdAt: 'desc' }, take: 50 },
            workspace: true,
          },
        },
      },
    }),
    prisma.pbcRequestItem.findMany({
      where: { listId },
      select: { id: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    }),
    getPbcListAssigneeOptions(listId),
  ]);

  if (!item) notFound();
  if (!assigneeOptions) notFound();
  if (item.listId !== listId || item.list.workspaceId !== workspaceId) notFound();

  const idx = siblings.findIndex((s) => s.id === itemId);
  const prevItemId = idx > 0 ? siblings[idx - 1].id : null;
  const nextItemId = idx < siblings.length - 1 ? siblings[idx + 1].id : null;

  const filesWithUrls = await Promise.all(
    item.files.map(async (f) => {
      try {
        const downloadUrl = await getPresignedDownload(f.obsKey);
        return { ...f, downloadUrl };
      } catch {
        return { ...f, downloadUrl: null };
      }
    })
  );

  return (
    <ItemDetailModal
      item={{
        ...item,
        files: filesWithUrls,
        prevItemId,
        nextItemId,
        list: {
          id: item.list.id,
          title: item.list.title,
          activities: item.list.activities.map((a) => ({
            ...a,
            meta: a.meta as Record<string, unknown> | null,
          })),
          workspace: { id: item.list.workspaceId },
        },
      }}
      assigneeOptions={assigneeOptions}
    />
  );
}
