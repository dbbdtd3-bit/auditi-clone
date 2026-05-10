import { PrismaClient, Prisma } from '@prisma/client';

export type ActivityEvent =
  | 'ITEM_CREATED'
  | 'ITEM_UPDATED'
  | 'ITEM_STATUS_CHANGED'
  | 'ITEM_DELETED'
  | 'FILE_UPLOADED'
  | 'FILE_DELETED'
  | 'COMMENT_ADDED'
  | 'LIST_COMMENT_ADDED'
  | 'BULK_STATUS_CHANGED'
  | 'ITEMS_REORDERED'
  | 'TEMPLATE_APPLIED';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function logActivity(
  tx: Tx,
  params: {
    listId: string;
    itemId?: string;
    event: ActivityEvent;
    actor?: string;
    actorId?: string;
    meta?: Prisma.InputJsonObject;
  }
): Promise<void> {
  await tx.pbcActivity.create({
    data: {
      listId: params.listId,
      itemId: params.itemId,
      event: params.event,
      actor: params.actor,
      actorId: params.actorId,
      meta: params.meta,
    },
  });
}
