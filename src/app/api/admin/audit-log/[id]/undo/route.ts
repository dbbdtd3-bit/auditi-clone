import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { UNDOABLE_ACTIONS, recordAudit } from '@/lib/audit';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdmin();
    if ('status' in authResult) return authResult;

    const { id } = await params;

    const entry = await prisma.auditLog.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    if (!UNDOABLE_ACTIONS.has(entry.action)) {
      return NextResponse.json({ error: 'Aktion nicht rückgängig machbar' }, { status: 400 });
    }
    if (entry.undone) {
      return NextResponse.json({ error: 'Bereits rückgängig gemacht' }, { status: 400 });
    }
    if (!entry.prevState) {
      return NextResponse.json({ error: 'Kein Snapshot vorhanden' }, { status: 400 });
    }

    const prev = entry.prevState as Record<string, unknown>;

    await prisma.$transaction(async (tx) => {
      switch (entry.action) {
        case 'PBC_ITEM_STATUS_CHANGED':
        case 'PBC_ITEM_UPDATED': {
          const itemData: Record<string, unknown> = {};
          if (prev.status !== undefined) itemData.status = prev.status;
          if (prev.assignedTo !== undefined) itemData.assignedTo = prev.assignedTo;
          if (prev.dueDate !== undefined) {
            itemData.dueDate = prev.dueDate ? new Date(prev.dueDate as string) : null;
          }
          if (prev.title !== undefined) itemData.title = prev.title;
          if (prev.description !== undefined) itemData.description = prev.description;
          await tx.pbcRequestItem.update({
            where: { id: entry.entityId! },
            data: itemData as never,
          });
          break;
        }
        case 'USER_UPDATED': {
          const userData: Record<string, unknown> = {};
          if (prev.role) userData.role = prev.role;
          if (prev.status) userData.status = prev.status;
          await tx.user.update({ where: { id: entry.entityId! }, data: userData as never });

          if (Array.isArray(prev.teamIds)) {
            await tx.teamMember.deleteMany({ where: { userId: entry.entityId! } });
            if ((prev.teamIds as string[]).length > 0) {
              await tx.teamMember.createMany({
                data: (prev.teamIds as string[]).map((teamId) => ({
                  teamId,
                  userId: entry.entityId!,
                })),
                skipDuplicates: true,
              });
            }
          }
          if (Array.isArray(prev.mandanten)) {
            const mandanten = prev.mandanten as Array<{ mandantId: string; role?: string }>;
            await tx.userMandant.deleteMany({ where: { userId: entry.entityId! } });
            if (mandanten.length > 0) {
              await tx.userMandant.createMany({
                data: mandanten.map((link) => ({
                  mandantId: link.mandantId,
                  userId: entry.entityId!,
                  role: link.role === 'MANDANT_ADMIN' ? 'MANDANT_ADMIN' : 'MANDANT_USER',
                })),
                skipDuplicates: true,
              });
            }
          } else if (Array.isArray(prev.mandantIds)) {
            await tx.userMandant.deleteMany({ where: { userId: entry.entityId! } });
            if ((prev.mandantIds as string[]).length > 0) {
              await tx.userMandant.createMany({
                data: (prev.mandantIds as string[]).map((mandantId) => ({
                  mandantId,
                  userId: entry.entityId!,
                })),
                skipDuplicates: true,
              });
            }
          }
          break;
        }
        case 'TEAM_DELETED': {
          const teamData: Record<string, unknown> = {
            name: prev.name,
            accentColor: prev.accentColor ?? 'BLUE',
          };
          if (prev.description) teamData.description = prev.description;
          const team = await tx.team.create({ data: teamData as never });
          const members = prev.members as { userId: string }[] | undefined;
          if (members && members.length > 0) {
            await tx.teamMember.createMany({
              data: members.map((m) => ({ teamId: team.id, userId: m.userId })),
              skipDuplicates: true,
            });
          }
          break;
        }
        case 'PBC_LIST_DELETED': {
          const listData: Record<string, unknown> = {
            title: prev.title,
            workspaceId: prev.workspaceId,
          };
          if (prev.description) listData.description = prev.description;
          await tx.pbcRequestList.create({ data: listData as never });
          break;
        }
      }

      await tx.auditLog.update({
        where: { id },
        data: { undone: true, undoneAt: new Date(), undoneById: authResult.id },
      });
    });

    await recordAudit({
      actorId: authResult.id,
      actorEmail: authResult.email,
      action: 'AUDIT_UNDONE',
      entityType: entry.entityType ?? undefined,
      entityId: entry.entityId ?? undefined,
      details: { originalAction: entry.action, originalId: entry.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/admin/audit-log/[id]/undo error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
