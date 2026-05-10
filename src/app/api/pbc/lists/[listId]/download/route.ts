import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace, getListWorkspaceId } from '@/lib/pbc-access';
import { obs } from '@/lib/obs';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';

const BUCKET = process.env.OBS_BUCKET!;

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

    const list = await prisma.pbcRequestList.findUnique({
      where: { id: listId },
      select: {
        title: true,
        items: {
          select: {
            title: true,
            files: { select: { obsKey: true, filename: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!list) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    const zip = new JSZip();

    for (const item of list.items) {
      if (item.files.length === 0) continue;
      const folder = zip.folder(item.title.replace(/[/\\:*?"<>|]/g, '_'))!;

      for (const file of item.files) {
        try {
          const response = await obs.send(
            new GetObjectCommand({ Bucket: BUCKET, Key: file.obsKey })
          );
          const chunks: Uint8Array[] = [];
          for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
          }
          folder.file(file.filename, Buffer.concat(chunks));
        } catch {
          // skip files that can't be fetched
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
    const safeName = list.title.replace(/[/\\:*?"<>|]/g, '_');
    const blob = new Blob([zipBuffer], { type: 'application/zip' });

    return new Response(blob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}.zip"`,
        'Content-Length': String(zipBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('GET /api/pbc/lists/[listId]/download error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
