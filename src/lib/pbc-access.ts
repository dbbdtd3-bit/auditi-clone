import { prisma } from '@/lib/db';

export async function canAccessWorkspace(
  userId: string,
  isWp: boolean,
  workspaceId: string
): Promise<boolean> {
  const workspace = await prisma.pbcWorkspace.findUnique({
    where: { id: workspaceId },
    select: {
      engagement: {
        select: {
          mandantId: true,
          mandant: {
            select: {
              teamLinks: {
                where: { team: { members: { some: { userId } } } },
                select: { id: true },
                take: 1,
              },
              userLinks: {
                where: { userId },
                select: { userId: true },
                take: 1,
              },
              users: {
                where: { id: userId },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
      members: {
        where: { userId },
        select: { userId: true },
        take: 1,
      },
    },
  });

  if (!workspace) return false;

  if (isWp) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (dbUser?.role === 'WP_ADMIN') return true;
    return workspace.engagement.mandant.teamLinks.length > 0;
  }

  return (
    workspace.members.length > 0 ||
    workspace.engagement.mandant.userLinks.length > 0 ||
    workspace.engagement.mandant.users.length > 0
  );
}

export async function getListWorkspaceId(listId: string): Promise<string | null> {
  const list = await prisma.pbcRequestList.findUnique({
    where: { id: listId },
    select: { workspaceId: true },
  });
  return list?.workspaceId ?? null;
}

export async function getItemContext(
  itemId: string
): Promise<{ workspaceId: string; listId: string } | null> {
  const item = await prisma.pbcRequestItem.findUnique({
    where: { id: itemId },
    select: { listId: true, list: { select: { workspaceId: true } } },
  });
  if (!item) return null;
  return { workspaceId: item.list.workspaceId, listId: item.listId };
}

export async function getFileContext(
  fileId: string
): Promise<{ workspaceId: string; listId: string; itemId: string } | null> {
  const file = await prisma.pbcFile.findUnique({
    where: { id: fileId },
    select: { itemId: true, item: { select: { listId: true, list: { select: { workspaceId: true } } } } },
  });
  if (!file) return null;
  return {
    workspaceId: file.item.list.workspaceId,
    listId: file.item.listId,
    itemId: file.itemId,
  };
}
