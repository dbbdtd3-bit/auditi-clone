import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { getPresignedDownload, deleteObject } from '@/lib/obs';

async function canAccessWorkspace(userId: string, isWp: boolean, workspaceId: string): Promise<boolean> {
  if (isWp) return true;
  const member = await prisma.pbcMember.findFirst({ where: { workspaceId, userId } });
  return member !== null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { fileId } = await params;

    const file = await prisma.pbcFile.findUnique({
      where: { id: fileId },
      select: { obsKey: true, item: { select: { list: { select: { workspaceId: true } } } } },
    });
    if (!file) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const workspaceId = file.item.list.workspaceId;
    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

    const fullFile = await prisma.pbcFile.findUnique({ where: { id: fileId } });
    if (!fullFile) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const downloadUrl = await getPresignedDownload(fullFile.obsKey);

    return NextResponse.json({ ...fullFile, downloadUrl });
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

    const file = await prisma.pbcFile.findUnique({ where: { id: fileId } });
    if (!file) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    await prisma.pbcFile.delete({ where: { id: fileId } });

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
