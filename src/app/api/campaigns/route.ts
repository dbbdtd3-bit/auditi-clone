import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { visibleCampaignWhere, visibleEngagementWhere } from '@/lib/mandant-access';
import { isConfirmationMethod, isCounterpartyType } from '@/lib/sba';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { searchParams } = new URL(req.url);
    const engagementId = searchParams.get('engagementId');

    const campaigns = await prisma.confirmationCampaign.findMany({
      where: {
        ...visibleCampaignWhere(user),
        ...(engagementId ? { engagementId } : {}),
      },
      include: {
        _count: { select: { requests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('GET /api/campaigns error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const body = await req.json();
    const { engagementId, title, balanceDate, confirmationMethod, counterpartyType } = body;

    if (!engagementId || !title || !balanceDate) {
      return NextResponse.json({ error: 'Ungültige Anfrage: engagementId, title und balanceDate sind Pflichtfelder' }, { status: 400 });
    }

    const method = confirmationMethod || 'STATED';
    const type = counterpartyType || 'DEBTOR';

    if (!isConfirmationMethod(method)) {
      return NextResponse.json({ error: 'UngÃ¼ltige Anfrage: BestÃ¤tigungsmethode ist ungÃ¼ltig.' }, { status: 400 });
    }

    if (!isCounterpartyType(type)) {
      return NextResponse.json({ error: 'UngÃ¼ltige Anfrage: Richtung ist ungÃ¼ltig.' }, { status: 400 });
    }

    const engagement = await prisma.engagement.findFirst({
      where: { id: engagementId, ...visibleEngagementWhere(user) },
    });
    if (!engagement) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const campaign = await prisma.confirmationCampaign.create({
      data: {
        engagementId,
        createdById: user.id,
        title,
        balanceDate: new Date(balanceDate),
        confirmationMethod: method,
        counterpartyType: type,
        status: 'DRAFT',
        notificationRecipients: {
          create: { userId: user.id },
        },
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('POST /api/campaigns error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
