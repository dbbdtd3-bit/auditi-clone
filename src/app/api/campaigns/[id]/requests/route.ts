import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;

    const campaign = await prisma.confirmationCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const requests = await prisma.confirmationRequest.findMany({
      where: { campaignId: id },
      include: { response: true, review: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('GET /api/campaigns/[id]/requests error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

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
      return NextResponse.json(
        { error: 'UngÃ¼ltige Anfrage: Abgeschlossene oder archivierte Kampagnen kÃ¶nnen nicht bearbeitet werden.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { partnerName, partnerEmail, accountNumber, expectedBalance, currency } = body;

    if (!partnerName || !partnerEmail || expectedBalance === undefined || expectedBalance === null) {
      return NextResponse.json({ error: 'Ungültige Anfrage: partnerName, partnerEmail und expectedBalance sind Pflichtfelder' }, { status: 400 });
    }

    const publicToken = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const request = await prisma.confirmationRequest.create({
      data: {
        campaignId: id,
        partnerName,
        partnerEmail,
        accountNumber: accountNumber ?? null,
        expectedBalance,
        currency: currency ?? 'EUR',
        status: 'DRAFT',
        publicToken,
        tokenExpiresAt,
        review: {
          create: {
            addressVerificationStatus: 'UNVERIFIED',
          },
        },
      },
      include: { response: true, review: true },
    });

    await prisma.auditEvent.create({
      data: {
        requestId: request.id,
        event: 'CREATED',
        actor: user.email ?? user.id,
        meta: { source: 'manual' },
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error('POST /api/campaigns/[id]/requests error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
