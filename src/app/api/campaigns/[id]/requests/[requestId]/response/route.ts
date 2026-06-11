import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPresignedDownload } from '@/lib/obs';
import { canViewMandant } from '@/lib/mandant-permissions';
import { getAuthUser, forbidden, isWpUser, unauthorized } from '@/lib/require-auth';

type RouteParams = {
  params: Promise<{ id: string; requestId: string }>;
};

function attachmentFilename(key: string): string {
  const raw = key.split('/').pop() || 'beleg';
  return raw.replace(/^\d+-/, '') || raw;
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id, requestId } = await params;
    const request = await prisma.confirmationRequest.findFirst({
      where: { id: requestId, campaignId: id },
      include: {
        campaign: {
          include: {
            engagement: { select: { mandantId: true } },
          },
        },
        response: {
          include: {
            comments: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const canView = await canViewMandant(user, request.campaign.engagement.mandantId);
    if (!canView) return forbidden();

    if (!request.response) {
      return NextResponse.json({ error: 'Noch keine Antwort vorhanden' }, { status: 404 });
    }

    let attachment: { key: string; filename: string; downloadUrl: string | null } | null = null;
    if (request.response.attachmentKey) {
      const key = request.response.attachmentKey;
      const expectedPrefix = `sba/${request.id}/`;
      let downloadUrl: string | null = null;

      if (key.startsWith(expectedPrefix)) {
        try {
          downloadUrl = await getPresignedDownload(key, 900);
        } catch (error) {
          console.error('SBA attachment presign failed:', error);
        }
      }

      attachment = {
        key,
        filename: attachmentFilename(key),
        downloadUrl,
      };
    }

    return NextResponse.json({
      id: request.response.id,
      respondedBy: request.response.respondedBy,
      respondedAt: request.response.respondedAt.toISOString(),
      hasDifference: request.response.hasDifference,
      confirmedBalance: request.response.confirmedBalance?.toString() ?? null,
      differenceNote: request.response.differenceNote,
      attachment,
      comments: request.response.comments.map((comment) => ({
        id: comment.id,
        author: comment.author,
        role: comment.role,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/campaigns/[id]/requests/[requestId]/response error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
