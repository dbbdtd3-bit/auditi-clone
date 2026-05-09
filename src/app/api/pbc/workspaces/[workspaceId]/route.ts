import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

async function canAccessWorkspace(userId: string, isWp: boolean, workspaceId: string): Promise<boolean> {
  if (isWp) return true;
  const member = await prisma.pbcMember.findFirst({ where: { workspaceId, userId } });
  return member !== null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { workspaceId } = await params;

    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

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
