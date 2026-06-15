import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { obs } from '@/lib/obs';
import { canViewMandant } from '@/lib/mandant-permissions';
import { getAuthUser, forbidden, isWpUser, unauthorized } from '@/lib/require-auth';

const BUCKET = process.env.OBS_BUCKET!;

function attachmentFilename(key: string): string {
  const raw = key.split('/').pop() || 'beleg';
  return raw.replace(/^\d+-/, '') || raw;
}

function safeFileSegment(value: string, fallback: string): string {
  const safe = value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);

  return safe || fallback;
}

function uniqueZipName(name: string, usedNames: Set<string>): string {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let counter = 2;
  let next = `${base}_${counter}${ext}`;

  while (usedNames.has(next)) {
    counter += 1;
    next = `${base}_${counter}${ext}`;
  }

  usedNames.add(next);
  return next;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;
    const campaign = await prisma.confirmationCampaign.findUnique({
      where: { id },
      select: {
        title: true,
        engagement: { select: { mandantId: true } },
        requests: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            partnerName: true,
            response: { select: { attachmentKey: true } },
          },
        },
      },
    });

    if (!campaign) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    if (!await canViewMandant(user, campaign.engagement.mandantId)) return forbidden();

    const zip = new JSZip();
    const usedNames = new Set<string>();
    let added = 0;

    for (const request of campaign.requests) {
      const key = request.response?.attachmentKey;
      if (!key || !key.startsWith(`sba/${request.id}/`)) continue;

      try {
        const response = await obs.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }

        const partner = safeFileSegment(request.partnerName, 'Partner');
        const filename = safeFileSegment(attachmentFilename(key), 'beleg');
        zip.file(uniqueZipName(`${partner}_${filename}`, usedNames), Buffer.concat(chunks));
        added += 1;
      } catch (error) {
        console.error('SBA bulk attachment fetch failed:', { requestId: request.id, error });
      }
    }

    if (added === 0) {
      return NextResponse.json({ error: 'Keine Dateien vorhanden' }, { status: 404 });
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
    const safeName = safeFileSegment(campaign.title, 'saldenbestaetigungen');
    const blob = new Blob([zipBuffer], { type: 'application/zip' });

    return new Response(blob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}-dateien.zip"`,
        'Content-Length': String(zipBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('GET /api/campaigns/[id]/files error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
