import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

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

    const comments = await prisma.pbcComment.findMany({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('GET /api/pbc/items/[itemId]/comments error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { itemId } = await params;

    const workspaceId = await getItemWorkspaceId(itemId);
    if (!workspaceId) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

    const body = await req.json();
    const { text } = body as { text: string };

    if (!text) {
      return NextResponse.json({ error: 'Text ist erforderlich' }, { status: 400 });
    }

    const author = user.name || 'Unbekannt';
    const role = user.role || 'WP_TEAM';

    const comment = await prisma.pbcComment.create({
      data: {
        itemId,
        text,
        author,
        role,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/items/[itemId]/comments error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
