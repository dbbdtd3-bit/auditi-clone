import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { enqueueConfirmationEmail } from '@/lib/queue';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

type RouteParams = {
  params: Promise<{ id: string; requestId: string }>;
};

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id, requestId } = await params;

    const request = await prisma.confirmationRequest.findFirst({
      where: { id: requestId, campaignId: id },
      include: { campaign: true },
    });

    if (!request) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    if (request.campaign.status === 'COMPLETED' || request.campaign.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Ungültige Anfrage: Abgeschlossene oder archivierte Kampagnen können nicht versendet werden.' },
        { status: 400 }
      );
    }

    if (request.status !== 'DRAFT' && request.status !== 'BOUNCED') {
      return NextResponse.json(
        { error: 'Ungültige Anfrage: Nur Entwürfe oder unzustellbare Anfragen können versendet werden.' },
        { status: 400 }
      );
    }

    if (request.campaign.status === 'DRAFT') {
      await prisma.confirmationCampaign.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
    }

    await prisma.confirmationRequest.update({
      where: { id: requestId },
      data: { status: 'QUEUED' },
    });

    await enqueueConfirmationEmail(requestId);

    await prisma.auditEvent.create({
      data: {
        requestId,
        event: 'QUEUED',
        actor: user.email ?? user.id,
        meta: { campaignId: id, source: 'single' },
      },
    });

    void recordAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'SBA_REQUEST_SENT',
      entityType: 'ConfirmationRequest',
      entityId: requestId,
      details: {
        campaignId: id,
        partnerName: request.partnerName,
        partnerEmail: request.partnerEmail,
      },
    });

    return NextResponse.json({ queued: 1 });
  } catch (error) {
    console.error('POST /api/campaigns/[id]/requests/[requestId]/send error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
