import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace, getListWorkspaceId } from '@/lib/pbc-access';

export async function POST(
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
    const { title, description, dueDate } = body as {
      title: string;
      description?: string;
      dueDate?: string;
    };

    if (!title) {
      return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 });
    }

    let parsedDueDate: Date | null = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 });
      }
    }

    const item = await prisma.$transaction(async (tx) => {
      const maxSortOrder = await tx.pbcRequestItem.aggregate({
        where: { listId },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
      const created = await tx.pbcRequestItem.create({
        data: {
          listId,
          title,
          description: description || null,
          dueDate: parsedDueDate,
          sortOrder,
        },
      });

      await tx.pbcActivity.create({
        data: {
          listId,
          itemId: created.id,
          event: 'ITEM_CREATED',
          actor: user.name || 'Unbekannt',
          actorId: user.id,
          meta: { title },
        },
      });

      return created;
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/lists/[listId]/items error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
