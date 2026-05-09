import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { deleteObject } from '@/lib/obs';

const VALID_STATUSES = ['OPEN', 'UPLOADED', 'ACCEPTED', 'NEEDS_REVISION'];

async function canAccessWorkspace(userId: string, isWp: boolean, workspaceId: string): Promise<boolean> {
  if (isWp) return true;
  const member = await prisma.pbcMember.findFirst({ where: { workspaceId, userId } });
  return member !== null;
}

async function getItemWorkspaceId(itemId: string): Promise<string | null> {
  const item = await prisma.pbcRequestItem.findUnique({
    where: { id: itemId },
    select: { list: { select: { workspaceId: true } } },
  });
  return item?.list?.workspaceId ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { itemId } = await params;

    const workspaceId = await getItemWorkspaceId(itemId);
    if (!workspaceId) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

    const item = await prisma.pbcRequestItem.findUnique({
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
    });

    if (!item) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(item);
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

    const item = await prisma.pbcRequestItem.update({
      where: { id: itemId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(parsedDueDate !== undefined && { dueDate: parsedDueDate }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
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

    const files = await prisma.pbcFile.findMany({ where: { itemId } });

    await prisma.pbcRequestItem.delete({ where: { id: itemId } });

    for (const file of files) {
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
