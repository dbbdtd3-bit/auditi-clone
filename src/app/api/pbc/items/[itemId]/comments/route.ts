import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace, getItemContext } from '@/lib/pbc-access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { itemId } = await params;

    const ctx = await getItemContext(itemId);
    if (!ctx) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), ctx.workspaceId)) return forbidden();

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

    const ctx = await getItemContext(itemId);
    if (!ctx) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), ctx.workspaceId)) return forbidden();

    const body = await req.json();
    const { text } = body as { text: string };

    if (!text) {
      return NextResponse.json({ error: 'Text ist erforderlich' }, { status: 400 });
    }

    const author = user.name || 'Unbekannt';
    const role = user.role || 'WP_TEAM';

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.pbcComment.create({
        data: { itemId, text, author, role },
      });

      await tx.pbcActivity.create({
        data: {
          listId: ctx.listId,
          itemId,
          event: 'COMMENT_ADDED',
          actor: author,
          actorId: user.id,
        },
      });

      return created;
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/items/[itemId]/comments error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
