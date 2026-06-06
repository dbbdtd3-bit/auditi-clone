import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { recordAudit } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if ('status' in authResult) return authResult;

  const { id } = await params;
  const body = await req.json();
  const teamIds = Array.isArray(body.teamIds)
    ? body.teamIds.filter((teamId: unknown): teamId is string => typeof teamId === 'string')
    : [];

  const mandant = await prisma.mandant.findUnique({
    where: { id },
    include: { teamLinks: true },
  });
  if (!mandant) return NextResponse.json({ error: 'Mandant nicht gefunden' }, { status: 404 });

  const prevState = { teamIds: mandant.teamLinks.map((link) => link.teamId) };

  await prisma.$transaction(async (tx) => {
    await tx.teamMandant.deleteMany({ where: { mandantId: id } });
    if (teamIds.length > 0) {
      await tx.teamMandant.createMany({
        data: teamIds.map((teamId: string) => ({ teamId, mandantId: id })),
        skipDuplicates: true,
      });
    }
  });

  await recordAudit({
    actorId: authResult.id,
    actorEmail: authResult.email,
    action: 'MANDANT_TEAMS_UPDATED',
    entityType: 'Mandant',
    entityId: id,
    prevState,
    details: { teamIds },
  });

  return NextResponse.json({ ok: true });
}
