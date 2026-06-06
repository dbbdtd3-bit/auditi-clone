import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { getPresignedDownload } from '@/lib/obs';
import { canAccessWorkspace, getItemContext } from '@/lib/pbc-access';
import { enqueuePbcUploadDigest } from '@/lib/queue';

const OBS_KEY_PATTERN = /^pbc\/\d+-[a-zA-Z0-9._-]+$/;

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
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { itemId } = await params;

    const ctx = await getItemContext(itemId);
    if (!ctx) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), ctx.workspaceId)) return forbidden();

    const body = await req.json();
    const { filename, obsKey, mimeType, sizeBytes } = body as {
      filename: string;
      obsKey: string;
      mimeType: string;
      sizeBytes: number;
    };

    if (!filename || !obsKey || !mimeType) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }

    if (!OBS_KEY_PATTERN.test(obsKey)) {
      return NextResponse.json({ error: 'Ungültiger Dateipfad' }, { status: 400 });
    }

    const uploadedBy = user.name || 'Unbekannt';

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

      await tx.pbcActivity.create({
        data: {
          listId: ctx.listId,
          itemId,
          event: 'FILE_UPLOADED',
          actor: uploadedBy,
          actorId: user.id,
          meta: { filename, sizeBytes: Number(sizeBytes) },
        },
      });

      return created;
    });

    if (!isWpUser(user)) {
      const now = new Date();
      const currentList = await prisma.pbcRequestList.findUnique({
        where: { id: ctx.listId },
        select: { uploadDigestStartedAt: true },
      });

      await prisma.pbcRequestList.update({
        where: { id: ctx.listId },
        data: {
          uploadDigestStartedAt: currentList?.uploadDigestStartedAt ?? now,
          uploadDigestLastActivityAt: now,
        },
      });
      await enqueuePbcUploadDigest(ctx.listId);
    }

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/items/[itemId]/files error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
