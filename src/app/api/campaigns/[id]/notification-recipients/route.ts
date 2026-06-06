import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { visibleCampaignWhere } from '@/lib/mandant-access';
import { recordAudit } from '@/lib/audit';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!isWpUser(user)) return forbidden();

  const { id } = await params;
  const allowed = await prisma.confirmationCampaign.count({
    where: { id, ...visibleCampaignWhere(user) },
  });
  if (!allowed) return forbidden();

  const [recipients, users] = await Promise.all([
    prisma.confirmationCampaignNotificationRecipient.findMany({
      where: { campaignId: id },
      include: { user: { select: { id: true, name: true, email: true, status: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findMany({
      where: { kind: 'WP', status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return NextResponse.json({ recipients, candidates: users });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!isWpUser(user)) return forbidden();

  const { id } = await params;
  const allowed = await prisma.confirmationCampaign.count({
    where: { id, ...visibleCampaignWhere(user) },
  });
  if (!allowed) return forbidden();

  const body = await req.json();
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((userId: unknown): userId is string => typeof userId === 'string')
    : [];

  await prisma.$transaction(async (tx) => {
    await tx.confirmationCampaignNotificationRecipient.deleteMany({ where: { campaignId: id } });
    if (userIds.length > 0) {
      await tx.confirmationCampaignNotificationRecipient.createMany({
        data: userIds.map((userId: string) => ({ campaignId: id, userId })),
        skipDuplicates: true,
      });
    }
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'SBA_CAMPAIGN_RECIPIENTS_UPDATED',
    entityType: 'ConfirmationCampaign',
    entityId: id,
    details: { userIds },
  });

  return NextResponse.json({ ok: true });
}
