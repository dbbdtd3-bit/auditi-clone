import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { searchParams } = new URL(req.url);
    const engagementId = searchParams.get('engagementId');

    const campaigns = await prisma.confirmationCampaign.findMany({
      where: engagementId ? { engagementId } : undefined,
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
    const { engagementId, title, balanceDate } = body;

    if (!engagementId || !title || !balanceDate) {
      return NextResponse.json({ error: 'Ungültige Anfrage: engagementId, title und balanceDate sind Pflichtfelder' }, { status: 400 });
    }

    const engagement = await prisma.engagement.findUnique({ where: { id: engagementId } });
    if (!engagement) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const campaign = await prisma.confirmationCampaign.create({
      data: {
        engagementId,
        title,
        balanceDate: new Date(balanceDate),
        status: 'DRAFT',
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('POST /api/campaigns error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
