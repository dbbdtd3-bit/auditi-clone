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

    const comments = await prisma.pbcListComment.findMany({
      where: { listId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('GET /api/pbc/lists/[listId]/comments error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { listId } = await params;

    const workspaceId = await getListWorkspaceId(listId);
    if (!workspaceId) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

    const body = await req.json();
    const { text } = body as { text: string };

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text ist erforderlich' }, { status: 400 });
    }

    const author = user.name || 'Unbekannt';
    const role = (user as { role?: string }).role || 'WP_TEAM';

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.pbcListComment.create({
        data: { listId, text: text.trim(), author, authorId: user.id, role },
      });

      await tx.pbcActivity.create({
        data: {
          listId,
          event: 'LIST_COMMENT_ADDED',
          actor: author,
          actorId: user.id,
        },
      });

      return created;
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/lists/[listId]/comments error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
