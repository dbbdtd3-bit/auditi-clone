import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { listId } = await params;

    const list = await prisma.pbcRequestList.findUnique({
      where: { id: listId },
      include: {
        items: {
          include: {
            _count: { select: { files: true, comments: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
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
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { listId } = await params;
    const body = await req.json();
    const { title } = body as { title?: string };

    const list = await prisma.pbcRequestList.update({
      where: { id: listId },
      data: { ...(title !== undefined && { title }) },
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
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { listId } = await params;

    await prisma.pbcRequestList.delete({ where: { id: listId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/pbc/lists/[listId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
