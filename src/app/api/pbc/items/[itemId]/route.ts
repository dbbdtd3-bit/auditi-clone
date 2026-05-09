import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deleteObject } from '@/lib/obs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId } = await params;

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
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId } = await params;
    const body = await req.json();
    const { title, description, status, assignedTo, dueDate } = body as {
      title?: string;
      description?: string;
      status?: string;
      assignedTo?: string;
      dueDate?: string | null;
    };

    const item = await prisma.pbcRequestItem.update({
      where: { id: itemId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status: status as 'OPEN' | 'UPLOADED' | 'ACCEPTED' | 'NEEDS_REVISION' }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
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
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
