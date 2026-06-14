import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { visibleCampaignWhere } from '@/lib/mandant-access';

const VALID_CAMPAIGN_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
const COMPLETED_DIFFERENCE_STATUSES = ['RESOLVED', 'MISSTATEMENT', 'NOT_MISSTATEMENT'];
const DOCUMENTED_ALTERNATIVE_STATUSES = ['COMPLETED', 'NOT_POSSIBLE'];

async function validateCampaignCompletion(campaignId: string) {
  const requests = await prisma.confirmationRequest.findMany({
    where: { campaignId },
    include: { response: true, review: true },
    orderBy: { createdAt: 'asc' },
  });

  const blockers: string[] = [];
  if (requests.length === 0) {
    blockers.push('Die Kampagne enthÃ¤lt keine BestÃ¤tigungsanfragen.');
  }

  for (const request of requests) {
    const label = request.partnerName;
    const review = request.review;

    if (['QUEUED', 'SENT', 'RESPONDED', 'CLOSED', 'BOUNCED'].includes(request.status)) {
      if (review?.addressVerificationStatus !== 'VERIFIED') {
        blockers.push(`${label}: EmpfÃ¤nger/Adresse ist nicht verifiziert.`);
      }
    }

    if (request.status === 'DRAFT' || request.status === 'QUEUED') {
      blockers.push(`${label}: Anfrage ist noch nicht beantwortet oder alternativ geprÃ¼ft.`);
      continue;
    }

    if (request.status === 'SENT' || request.status === 'BOUNCED') {
      if (!review || !DOCUMENTED_ALTERNATIVE_STATUSES.includes(review.alternativeProcedureStatus)) {
        blockers.push(`${label}: Nichtantwort/Unzustellbarkeit braucht eine dokumentierte alternative PrÃ¼fungshandlung.`);
      }
      continue;
    }

    if (request.status === 'RESPONDED') {
      if (review?.reliabilityStatus !== 'RELIABLE') {
        blockers.push(`${label}: Antwort ist noch nicht als verlÃ¤sslich beurteilt.`);
      }

      if (
        request.response?.hasDifference &&
        (!review || !COMPLETED_DIFFERENCE_STATUSES.includes(review.differenceResolutionStatus))
      ) {
        blockers.push(`${label}: Differenz ist noch nicht abschlieÃŸend geklÃ¤rt.`);
      }
    }
  }

  return blockers;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;

    const campaign = await prisma.confirmationCampaign.findUnique({
      where: { id },
      include: {
        requests: {
          include: { response: true, review: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    const allowed = await prisma.confirmationCampaign.count({
      where: { id, ...visibleCampaignWhere(user) },
    });
    if (!allowed) return forbidden();

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('GET /api/campaigns/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Ungültige Anfrage: status ist erforderlich' }, { status: 400 });
    }

    if (!VALID_CAMPAIGN_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Ungültige Anfrage: status muss einer von ${VALID_CAMPAIGN_STATUSES.join(', ')} sein` }, { status: 400 });
    }

    const campaign = await prisma.confirmationCampaign.findFirst({
      where: { id, ...visibleCampaignWhere(user) },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    if (status === 'COMPLETED') {
      const blockers = await validateCampaignCompletion(id);
      if (blockers.length > 0) {
        return NextResponse.json(
          {
            error: 'Kampagne kann noch nicht abgeschlossen werden.',
            blockers,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.confirmationCampaign.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/campaigns/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;

    const campaign = await prisma.confirmationCampaign.findUnique({
      where: { id },
      include: {
        requests: {
          where: { status: { in: ['QUEUED', 'SENT', 'RESPONDED', 'CLOSED'] } },
          select: { id: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    const allowed = await prisma.confirmationCampaign.count({
      where: { id, ...visibleCampaignWhere(user) },
    });
    if (!allowed) return forbidden();

    if (campaign.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Ungültige Anfrage: Nur DRAFT-Kampagnen können gelöscht werden' }, { status: 400 });
    }

    if (campaign.requests.length > 0) {
      return NextResponse.json({ error: 'Ungültige Anfrage: Kampagne hat bereits versendete Anfragen und kann nicht gelöscht werden' }, { status: 400 });
    }

    await prisma.confirmationCampaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/campaigns/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
