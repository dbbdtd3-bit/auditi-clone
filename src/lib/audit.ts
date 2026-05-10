import { prisma } from './db';

interface AuditInput {
  actorId?: string;
  actorEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: unknown;
  prevState?: unknown;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorEmail: input.actorEmail,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details as never,
        prevState: input.prevState as never,
      },
    });
  } catch {
    // Audit logging must never break the main flow
  }
}

export const UNDOABLE_ACTIONS = new Set([
  'PBC_ITEM_STATUS_CHANGED',
  'PBC_ITEM_UPDATED',
  'USER_UPDATED',
  'TEAM_DELETED',
  'PBC_LIST_DELETED',
]);
