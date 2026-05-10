import { prisma } from '@/lib/db';

export async function canAccessWorkspace(
  userId: string,
  isWp: boolean,
  workspaceId: string
): Promise<boolean> {
  if (isWp) return true;
  const member = await prisma.pbcMember.findFirst({ where: { workspaceId, userId } });
  return member !== null;
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
