import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { getPresignedDownload, deleteObject } from '@/lib/obs';
import { canAccessWorkspace, getFileContext } from '@/lib/pbc-access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { fileId } = await params;

    const ctx = await getFileContext(fileId);
    if (!ctx) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), ctx.workspaceId)) return forbidden();

    const file = await prisma.pbcFile.findUnique({ where: { id: fileId } });
    if (!file) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    const downloadUrl = await getPresignedDownload(file.obsKey);

    return NextResponse.json({ ...file, downloadUrl });
  } catch (error) {
    console.error('GET /api/pbc/files/[fileId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { fileId } = await params;

    const ctx = await getFileContext(fileId);
    if (!ctx) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    const file = await prisma.pbcFile.findUnique({
      where: { id: fileId },
      select: { obsKey: true, filename: true },
    });
    if (!file) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.pbcFile.delete({ where: { id: fileId } });
      await tx.pbcActivity.create({
        data: {
          listId: ctx.listId,
          itemId: ctx.itemId,
          event: 'FILE_DELETED',
          actor: user.name || 'Unbekannt',
          actorId: user.id,
          meta: { filename: file.filename },
        },
      });
    });

    try {
      await deleteObject(file.obsKey);
    } catch {
      // Best-effort OBS cleanup
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/pbc/files/[fileId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
