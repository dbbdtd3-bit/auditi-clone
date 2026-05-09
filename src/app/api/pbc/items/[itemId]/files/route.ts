import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { getPresignedDownload } from '@/lib/obs';

const OBS_KEY_PATTERN = /^pbc\/\d+-[a-zA-Z0-9._-]+$/;

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

    const workspaceId = await getItemWorkspaceId(itemId);
    if (!workspaceId) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

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

      return created;
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/items/[itemId]/files error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
