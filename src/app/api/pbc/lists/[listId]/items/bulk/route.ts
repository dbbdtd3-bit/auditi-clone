import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PbcItemStatus } from '@prisma/client';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace, getListWorkspaceId } from '@/lib/pbc-access';
import { deleteObject } from '@/lib/obs';

type BulkOp = 'status' | 'dueDate' | 'assign' | 'delete';

const VALID_STATUSES = ['OPEN', 'UPLOADED', 'ACCEPTED', 'NEEDS_REVISION', 'REJECTED'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { listId } = await params;

    const workspaceId = await getListWorkspaceId(listId);
    if (!workspaceId) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

    const body = await req.json();
    const { ids, op, value } = body as { ids: string[]; op: BulkOp; value?: string | null };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids erforderlich' }, { status: 400 });
    }

    // Tenant isolation: all ids must belong to this list
    const count = await prisma.pbcRequestItem.count({
      where: { id: { in: ids }, listId },
    });
    if (count !== ids.length) {
      return NextResponse.json({ error: 'Ungültige Item-IDs' }, { status: 400 });
    }

    if (op === 'delete') {
      const files = await prisma.pbcFile.findMany({
        where: { item: { id: { in: ids }, listId } },
        select: { obsKey: true },
      });

      await prisma.$transaction(async (tx) => {
        await tx.pbcRequestItem.deleteMany({ where: { id: { in: ids }, listId } });
        await tx.pbcActivity.create({
          data: {
            listId,
            event: 'BULK_STATUS_CHANGED',
            actor: user.name || 'Unbekannt',
            actorId: user.id,
            meta: { op: 'delete', count: ids.length },
          },
        });
      });

      for (const file of files) {
        try { await deleteObject(file.obsKey); } catch { /* best-effort */ }
      }

      return NextResponse.json({ success: true, count: ids.length });
    }

    if (op === 'status') {
      if (!value || !VALID_STATUSES.includes(value)) {
        return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.pbcRequestItem.updateMany({
          where: { id: { in: ids }, listId },
          data: { status: value as PbcItemStatus },
        });
        await tx.pbcActivity.create({
          data: {
            listId,
            event: 'BULK_STATUS_CHANGED',
            actor: user.name || 'Unbekannt',
            actorId: user.id,
            meta: { op: 'status', to: value, count: ids.length },
          },
        });
      });

      return NextResponse.json({ success: true, count: ids.length });
    }

    if (op === 'dueDate') {
      const parsedDate = value ? new Date(value) : null;
      if (value && parsedDate && isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 });
      }

      await prisma.pbcRequestItem.updateMany({
        where: { id: { in: ids }, listId },
        data: { dueDate: parsedDate },
      });

      return NextResponse.json({ success: true, count: ids.length });
    }

    if (op === 'assign') {
      await prisma.pbcRequestItem.updateMany({
        where: { id: { in: ids }, listId },
        data: { assignedTo: value || null },
      });

      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: 'Unbekannte Operation' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/pbc/lists/[listId]/items/bulk error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
