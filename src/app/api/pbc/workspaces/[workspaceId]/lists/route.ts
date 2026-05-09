import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workspaceId } = await params;

    const lists = await prisma.pbcRequestList.findMany({
      where: { workspaceId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error('GET /api/pbc/workspaces/[workspaceId]/lists error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workspaceId } = await params;
    const body = await req.json();
    const { title } = body as { title: string };

    if (!title) {
      return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 });
    }

    const list = await prisma.pbcRequestList.create({
      data: { workspaceId, title },
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/workspaces/[workspaceId]/lists error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
