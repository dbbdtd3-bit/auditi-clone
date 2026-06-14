import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueConfirmationEmail } from '@/lib/queue';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { recordAudit } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;

    const campaign = await prisma.confirmationCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    if (campaign.status === 'COMPLETED' || campaign.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Ungültige Anfrage: Abgeschlossene oder archivierte Kampagnen können nicht versendet werden' }, { status: 400 });
    }

    const draftRequests = await prisma.confirmationRequest.findMany({
      where: { campaignId: id, status: 'DRAFT' },
      include: { review: true },
    });

    if (draftRequests.length === 0) {
      return NextResponse.json({ queued: 0 });
    }

    const unverified = draftRequests.filter(
      (request) => request.review?.addressVerificationStatus !== 'VERIFIED'
    );
    if (unverified.length > 0) {
      return NextResponse.json(
        {
          error: 'Versand blockiert: Alle EmpfÃ¤nger/Adressen mÃ¼ssen vor Versand verifiziert werden.',
          blockers: unverified.map((request) => request.partnerName),
        },
        { status: 400 }
      );
    }

    // Activate campaign if still DRAFT
    if (campaign.status === 'DRAFT') {
      await prisma.confirmationCampaign.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
    }

    let queued = 0;
    for (const request of draftRequests) {
      await prisma.confirmationRequest.update({
        where: { id: request.id },
        data: { status: 'QUEUED' },
      });

      await enqueueConfirmationEmail(request.id);

      await prisma.auditEvent.create({
        data: {
          requestId: request.id,
          event: 'QUEUED',
          actor: user.email ?? user.id,
          meta: { campaignId: id },
        },
      });

      queued++;
    }

    void recordAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'CAMPAIGN_SENT',
      entityType: 'ConfirmationCampaign',
      entityId: id,
      details: { queued, title: campaign.title },
    });

    return NextResponse.json({ queued });
  } catch (error) {
    console.error('POST /api/campaigns/[id]/send error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
