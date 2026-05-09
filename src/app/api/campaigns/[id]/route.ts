import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

const VALID_CAMPAIGN_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;

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
          include: { response: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

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

    const campaign = await prisma.confirmationCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
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
