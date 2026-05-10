import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { recordAudit } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdmin();
    if ('status' in authResult) return authResult;

    const { id } = await params;
    const body = await req.json();
    const { role, status, teamIds, mandantIds } = body as {
      role?: string;
      status?: string;
      teamIds?: string[];
      mandantIds?: string[];
    };

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        teams: true,
        mandanten: true,
      },
    });
    if (!existing) return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });

    const prevState = {
      role: existing.role,
      status: existing.status,
      teamIds: existing.teams.map((t) => t.teamId),
      mandantIds: existing.mandanten.map((m) => m.mandantId),
    };

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(role ? { role: role as 'WP_ADMIN' | 'WP_TEAM' | 'MANDANT_ADMIN' | 'MANDANT_USER' } : {}),
          ...(status ? { status: status as 'PENDING' | 'ACTIVE' | 'DISABLED' } : {}),
        },
      });

      if (teamIds !== undefined) {
        await tx.teamMember.deleteMany({ where: { userId: id } });
        if (teamIds.length > 0) {
          await tx.teamMember.createMany({
            data: teamIds.map((teamId) => ({ teamId, userId: id })),
            skipDuplicates: true,
          });
        }
      }

      if (mandantIds !== undefined) {
        await tx.userMandant.deleteMany({ where: { userId: id } });
        if (mandantIds.length > 0) {
          await tx.userMandant.createMany({
            data: mandantIds.map((mandantId) => ({ mandantId, userId: id })),
            skipDuplicates: true,
          });
        }
      }
    });

    await recordAudit({
      actorId: authResult.id,
      actorEmail: authResult.email,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      prevState,
      details: { role, status, teamIds, mandantIds },
    });

    return NextResponse.json({ message: 'Benutzer aktualisiert' });
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
