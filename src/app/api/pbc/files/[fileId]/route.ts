import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPresignedDownload, deleteObject } from '@/lib/obs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileId } = await params;

    const file = await prisma.pbcFile.findUnique({ where: { id: fileId } });
    if (!file) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

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
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
