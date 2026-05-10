import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace, getListWorkspaceId } from '@/lib/pbc-access';

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
    const { orderedIds } = body as { orderedIds: string[] };

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds erforderlich' }, { status: 400 });
    }

    // Tenant isolation: all ids must belong to this list
    const count = await prisma.pbcRequestItem.count({
      where: { id: { in: orderedIds }, listId },
    });
    if (count !== orderedIds.length) {
      return NextResponse.json({ error: 'Ungültige Item-IDs' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          tx.pbcRequestItem.update({ where: { id }, data: { sortOrder: idx } })
        )
      );

      await tx.pbcActivity.create({
        data: {
          listId,
          event: 'ITEMS_REORDERED',
          actor: user.name || 'Unbekannt',
          actorId: user.id,
          meta: { count: orderedIds.length },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/pbc/lists/[listId]/items/reorder error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
