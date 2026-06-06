import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { enqueueReminder } from '@/lib/queue';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

const MAX_REMINDER_COUNT = 3;

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
        { error: 'Ungültige Anfrage: Abgeschlossene oder archivierte Kampagnen können nicht erinnert werden.' },
        { status: 400 }
      );
    }

    if (request.status !== 'SENT') {
      return NextResponse.json(
        { error: 'Ungültige Anfrage: Nur versendete offene Anfragen können erinnert werden.' },
        { status: 400 }
      );
    }

    if (request.reminderCount >= MAX_REMINDER_COUNT) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage: Maximale Anzahl an Erinnerungen erreicht.' },
        { status: 400 }
      );
    }

    await enqueueReminder(requestId);

    await prisma.auditEvent.create({
      data: {
        requestId,
        event: 'REMINDER_QUEUED',
        actor: user.email ?? user.id,
        meta: {
          campaignId: id,
          reminderCount: request.reminderCount + 1,
          source: 'single',
        },
      },
    });

    void recordAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'SBA_REQUEST_REMINDED',
      entityType: 'ConfirmationRequest',
      entityId: requestId,
      details: {
        campaignId: id,
        partnerName: request.partnerName,
        partnerEmail: request.partnerEmail,
        reminderCount: request.reminderCount + 1,
      },
    });

    return NextResponse.json({ queued: 1 });
  } catch (error) {
    console.error('POST /api/campaigns/[id]/requests/[requestId]/remind error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
