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

    const workspace = await prisma.pbcWorkspace.findUnique({
      where: { id: workspaceId },
      include: {
        engagement: { include: { mandant: true } },
        requestLists: {
          include: {
            _count: { select: { items: true } },
            items: {
              select: {
                id: true,
                status: true,
                _count: { select: { files: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        members: {
          include: { user: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('GET /api/pbc/workspaces/[workspaceId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
