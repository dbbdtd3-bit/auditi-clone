import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueReminder } from '@/lib/queue';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

const REMINDER_THRESHOLD_DAYS = 14;
const MAX_REMINDER_COUNT = 3;

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

    const thresholdDate = new Date(Date.now() - REMINDER_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    const overdueRequests = await prisma.confirmationRequest.findMany({
      where: {
        campaignId: id,
        status: 'SENT',
        sentAt: { lt: thresholdDate },
        reminderCount: { lt: MAX_REMINDER_COUNT },
      },
    });

    let queued = 0;
    for (const request of overdueRequests) {
      await enqueueReminder(request.id);

      await prisma.auditEvent.create({
        data: {
          requestId: request.id,
          event: 'REMINDER_QUEUED',
          actor: user.email ?? user.id,
          meta: {
            campaignId: id,
            reminderCount: request.reminderCount + 1,
          },
        },
      });

      queued++;
    }

    return NextResponse.json({ queued });
  } catch (error) {
    console.error('POST /api/campaigns/[id]/remind error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
