import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PbcItemStatus } from '@prisma/client';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { deleteObject } from '@/lib/obs';
import { canAccessWorkspace, getItemContext } from '@/lib/pbc-access';
import { recordAudit } from '@/lib/audit';

const VALID_STATUSES: string[] = ['OPEN', 'UPLOADED', 'ACCEPTED', 'NEEDS_REVISION', 'REJECTED'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { itemId } = await params;

    const ctx = await getItemContext(itemId);
    if (!ctx) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), ctx.workspaceId)) return forbidden();

    const [item, siblings] = await Promise.all([
      prisma.pbcRequestItem.findUnique({
        where: { id: itemId },
        include: {
          files: { orderBy: { createdAt: 'desc' } },
          comments: { orderBy: { createdAt: 'asc' } },
          list: {
            include: {
              workspace: {
                include: { engagement: { include: { mandant: true } } },
              },
            },
          },
        },
      }),
      prisma.pbcRequestItem.findMany({
        where: { listId: ctx.listId },
        select: { id: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    if (!item) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    const idx = siblings.findIndex((s) => s.id === itemId);
    const prevItemId = idx > 0 ? siblings[idx - 1].id : null;
    const nextItemId = idx < siblings.length - 1 ? siblings[idx + 1].id : null;

    return NextResponse.json({ ...item, prevItemId, nextItemId });
  } catch (error) {
    console.error('GET /api/pbc/items/[itemId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { itemId } = await params;
    const body = await req.json();
    const { title, description, status, assignedTo, dueDate } = body as {
      title?: string;
      description?: string;
      status?: string;
      assignedTo?: string;
      dueDate?: string | null;
    };

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });
    }

    let parsedDueDate: Date | null | undefined = undefined;
    if (dueDate !== undefined) {
      if (dueDate === null) {
        parsedDueDate = null;
      } else {
        parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 });
        }
      }
    }

    const { item, prevSnapshot } = await prisma.$transaction(async (tx) => {
      const current = await tx.pbcRequestItem.findUnique({
        where: { id: itemId },
        select: { status: true, listId: true, assignedTo: true, dueDate: true, title: true, description: true },
      });
      if (!current) throw new Error('NOT_FOUND');

      const updated = await tx.pbcRequestItem.update({
        where: { id: itemId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status: status as PbcItemStatus }),
          ...(assignedTo !== undefined && { assignedTo }),
          ...(parsedDueDate !== undefined && { dueDate: parsedDueDate }),
        },
      });

      const isStatusChange = status !== undefined && status !== current.status;
      await tx.pbcActivity.create({
        data: {
          listId: current.listId,
          itemId,
          event: isStatusChange ? 'ITEM_STATUS_CHANGED' : 'ITEM_UPDATED',
          actor: user.name || 'Unbekannt',
          actorId: user.id,
          meta: isStatusChange ? { from: current.status, to: status } : { fields: Object.keys(body) },
        },
      });

      return { item: updated, prevSnapshot: current };
    });

    const isStatusChange = status !== undefined && status !== prevSnapshot.status;
    void recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: isStatusChange ? 'PBC_ITEM_STATUS_CHANGED' : 'PBC_ITEM_UPDATED',
      entityType: 'PbcRequestItem',
      entityId: itemId,
      prevState: prevSnapshot,
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    console.error('PUT /api/pbc/items/[itemId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { itemId } = await params;

    const item = await prisma.pbcRequestItem.findUnique({
      where: { id: itemId },
      select: { listId: true, title: true, files: { select: { obsKey: true } } },
    });
    if (!item) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.pbcRequestItem.delete({ where: { id: itemId } });
      await tx.pbcActivity.create({
        data: {
          listId: item.listId,
          itemId,
          event: 'ITEM_DELETED',
          actor: user.name || 'Unbekannt',
          actorId: user.id,
          meta: { title: item.title },
        },
      });
    });

    for (const file of item.files) {
      try {
        await deleteObject(file.obsKey);
      } catch {
        // Best-effort OBS cleanup
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/pbc/items/[itemId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
