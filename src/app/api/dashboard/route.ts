import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/require-auth';
import {
  visibleCampaignWhere,
  visibleEngagementWhere,
  visibleMandantWhere,
  visiblePbcWorkspaceWhere,
} from '@/lib/mandant-access';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    const [
      mandantenCount,
      engagementStats,
      campaignStats,
      requestStats,
      pbcStats,
      recentEngagements,
      campaignKpis,
    ] = await Promise.all([
      prisma.mandant.count({ where: visibleMandantWhere(user) }),

      prisma.engagement.groupBy({
        by: ['status'],
        where: visibleEngagementWhere(user),
        _count: { id: true },
      }),

      prisma.confirmationCampaign.groupBy({
        by: ['status'],
        where: visibleCampaignWhere(user),
        _count: { id: true },
      }),

      prisma.confirmationRequest.groupBy({
        by: ['status'],
        where: { campaign: visibleCampaignWhere(user) },
        _count: { id: true },
      }),

      prisma.pbcRequestItem.groupBy({
        by: ['status'],
        where: { list: { workspace: visiblePbcWorkspaceWhere(user) } },
        _count: { id: true },
      }),

      prisma.engagement.findMany({
        where: { status: 'ACTIVE', ...visibleEngagementWhere(user) },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          mandant: { select: { name: true } },
          _count: { select: { campaigns: true } },
        },
      }),

      prisma.confirmationCampaign.findMany({
        where: { status: { in: ['ACTIVE', 'COMPLETED'] }, ...visibleCampaignWhere(user) },
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
