import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace } from '@/lib/pbc-access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { workspaceId } = await params;

    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

    const members = await prisma.pbcMember.findMany({
      where: { workspaceId },
      select: {
        userId: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const users = members.map((m) => ({
      id: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error('GET /api/pbc/workspaces/[workspaceId]/users error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
