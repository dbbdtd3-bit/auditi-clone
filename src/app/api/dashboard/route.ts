import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const [
      mandantenCount,
      engagementStats,
      campaignStats,
      requestStats,
      pbcStats,
      recentEngagements,
      campaignKpis,
    ] = await Promise.all([
      prisma.mandant.count(),

      prisma.engagement.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      prisma.confirmationCampaign.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      prisma.confirmationRequest.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      prisma.pbcRequestItem.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      prisma.engagement.findMany({
        where: { status: 'ACTIVE' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          mandant: { select: { name: true } },
          _count: { select: { campaigns: true } },
        },
      }),

      prisma.confirmationCampaign.findMany({
        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          engagement: {
            select: {
              title: true,
              mandant: { select: { name: true } },
            },
          },
          requests: {
            select: { status: true, response: { select: { hasDifference: true } } },
          },
        },
      }),
    ]);

    const toMap = <T extends { status: string; _count: { id: number } }>(
      rows: T[],
    ) => Object.fromEntries(rows.map((r) => [r.status, r._count.id]));

    const kpis = campaignKpis.map((c) => {
      const total = c.requests.length;
      const sent = c.requests.filter((r) =>
        ['SENT', 'RESPONDED', 'CLOSED'].includes(r.status),
      ).length;
      const responded = c.requests.filter((r) =>
        ['RESPONDED', 'CLOSED'].includes(r.status),
      ).length;
      const hasDifferences = c.requests.filter(
        (r) => r.response?.hasDifference,
      ).length;

      return {
        id: c.id,
        title: c.title,
        status: c.status,
        engagementTitle: c.engagement.title,
        mandantName: c.engagement.mandant.name,
        total,
        sent,
        responded,
        hasDifferences,
        responseRate: sent > 0 ? Math.round((responded / sent) * 100) : 0,
      };
    });

    return NextResponse.json({
      mandantenCount,
      engagementStats: toMap(engagementStats),
      campaignStats: toMap(campaignStats),
      requestStats: toMap(requestStats),
      pbcStats: toMap(pbcStats),
      recentEngagements,
      campaignKpis: kpis,
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
