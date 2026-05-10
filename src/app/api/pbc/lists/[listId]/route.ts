import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { deleteObject } from '@/lib/obs';
import { canAccessWorkspace, getListWorkspaceId } from '@/lib/pbc-access';
import { recordAudit } from '@/lib/audit';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { listId } = await params;

    const workspaceId = await getListWorkspaceId(listId);
    if (!workspaceId) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

    const list = await prisma.pbcRequestList.findUnique({
      where: { id: listId },
      include: {
        items: {
          include: {
            _count: { select: { files: true, comments: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        comments: { orderBy: { createdAt: 'asc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('GET /api/pbc/lists/[listId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { listId } = await params;
    const body = await req.json();
    const { title, description } = body as { title?: string; description?: string };

    const list = await prisma.pbcRequestList.update({
      where: { id: listId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error('PUT /api/pbc/lists/[listId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { listId } = await params;

    const [listInfo, files, itemCount] = await Promise.all([
      prisma.pbcRequestList.findUnique({
        where: { id: listId },
        select: { title: true, description: true, workspaceId: true },
      }),
      prisma.pbcFile.findMany({ where: { item: { listId } }, select: { obsKey: true } }),
      prisma.pbcRequestItem.count({ where: { listId } }),
    ]);

    await prisma.pbcRequestList.delete({ where: { id: listId } });

    void recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'PBC_LIST_DELETED',
      entityType: 'PbcRequestList',
      entityId: listId,
      prevState: {
        title: listInfo?.title,
        description: listInfo?.description,
        workspaceId: listInfo?.workspaceId,
        itemCount,
      },
    });

    for (const file of files) {
      try {
        await deleteObject(file.obsKey);
      } catch (err) {
        console.error(`OBS cleanup failed for key ${file.obsKey}:`, err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/pbc/lists/[listId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
