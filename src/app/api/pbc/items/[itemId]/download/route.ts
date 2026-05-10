import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace, getItemContext } from '@/lib/pbc-access';
import { obs } from '@/lib/obs';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';

const BUCKET = process.env.OBS_BUCKET!;

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

    const item = await prisma.pbcRequestItem.findUnique({
      where: { id: itemId },
      select: {
        title: true,
        files: { select: { obsKey: true, filename: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!item) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (item.files.length === 0) {
      return NextResponse.json({ error: 'Keine Dateien vorhanden' }, { status: 404 });
    }

    const zip = new JSZip();

    for (const file of item.files) {
      try {
        const response = await obs.send(
          new GetObjectCommand({ Bucket: BUCKET, Key: file.obsKey })
        );
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        zip.file(file.filename, Buffer.concat(chunks));
      } catch {
        // skip files that can't be fetched
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
    const safeName = item.title.replace(/[/\\:*?"<>|]/g, '_');
    const blob = new Blob([zipBuffer], { type: 'application/zip' });

    return new Response(blob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}.zip"`,
        'Content-Length': String(zipBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('GET /api/pbc/items/[itemId]/download error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
