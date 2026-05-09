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
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

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
