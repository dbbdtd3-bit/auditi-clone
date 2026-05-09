import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPresignedDownload } from '@/lib/obs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId } = await params;

    const files = await prisma.pbcFile.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
    });

    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const downloadUrl = await getPresignedDownload(file.obsKey);
          return { ...file, downloadUrl };
        } catch {
          return { ...file, downloadUrl: null };
        }
      })
    );

    return NextResponse.json(filesWithUrls);
  } catch (error) {
    console.error('GET /api/pbc/items/[itemId]/files error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId } = await params;
    const body = await req.json();
    const { filename, obsKey, mimeType, sizeBytes, uploadedBy } = body as {
      filename: string;
      obsKey: string;
      mimeType: string;
      sizeBytes: number;
      uploadedBy: string;
    };

    if (!filename || !obsKey || !mimeType) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }

    const file = await prisma.$transaction(async (tx) => {
      const created = await tx.pbcFile.create({
        data: {
          itemId,
          filename,
          obsKey,
          mimeType,
          sizeBytes: Number(sizeBytes),
          uploadedBy,
        },
      });

      const item = await tx.pbcRequestItem.findUnique({ where: { id: itemId } });
      if (item?.status === 'OPEN') {
        await tx.pbcRequestItem.update({
          where: { id: itemId },
          data: { status: 'UPLOADED' },
        });
      }

      return created;
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/items/[itemId]/files error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
