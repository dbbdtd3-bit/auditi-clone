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
    const { templateId } = body as { templateId: string };

    if (!templateId) {
      return NextResponse.json({ error: 'templateId erforderlich' }, { status: 400 });
    }

    const template = await prisma.pbcTemplate.findUnique({
      where: { id: templateId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) return NextResponse.json({ error: 'Vorlage nicht gefunden' }, { status: 404 });

    const created = await prisma.$transaction(async (tx) => {
      const maxSortOrder = await tx.pbcRequestItem.aggregate({
        where: { listId },
        _max: { sortOrder: true },
      });
      let nextSort = (maxSortOrder._max.sortOrder ?? -1) + 1;

      const items = await Promise.all(
        template.items.map((tItem) =>
          tx.pbcRequestItem.create({
            data: {
              listId,
              title: tItem.title,
              description: tItem.description,
              sortOrder: nextSort++,
            },
          })
        )
      );

      await tx.pbcActivity.create({
        data: {
          listId,
          event: 'TEMPLATE_APPLIED',
          actor: user.name || 'Unbekannt',
          actorId: user.id,
          meta: { templateId, templateName: template.name, itemCount: items.length },
        },
      });

      return items;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/lists/[listId]/items/from-template error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
