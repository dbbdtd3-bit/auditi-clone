import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace, getListWorkspaceId } from '@/lib/pbc-access';

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

    const activities = await prisma.pbcActivity.findMany({
      where: { listId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('GET /api/pbc/lists/[listId]/activities error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
