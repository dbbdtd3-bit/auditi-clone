import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { recordAudit } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdmin();
    if ('status' in authResult) return authResult;

    const { id } = await params;
    const body = await req.json();
    const { role, teamIds, mandantIds } = body as {
      role: string;
      teamIds?: string[];
      mandantIds?: string[];
    };

    if (!role) {
      return NextResponse.json({ error: 'Rolle ist erforderlich' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    if (existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'Benutzer ist nicht im Status PENDING' }, { status: 400 });
    }

    const prevState = { status: existing.status, role: existing.role };

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          role: role as 'WP_ADMIN' | 'WP_TEAM' | 'MANDANT_ADMIN' | 'MANDANT_USER',
        },
      });

      if (teamIds && teamIds.length > 0) {
        await tx.teamMember.createMany({
          data: teamIds.map((teamId) => ({ teamId, userId: id })),
          skipDuplicates: true,
        });
      }

      if (mandantIds && mandantIds.length > 0) {
        await tx.userMandant.createMany({
          data: mandantIds.map((mandantId) => ({
            mandantId,
            userId: id,
            role: role === 'MANDANT_ADMIN' ? 'MANDANT_ADMIN' : 'MANDANT_USER',
          })),
          skipDuplicates: true,
        });
      }
    });

    await recordAudit({
      actorId: authResult.id,
      actorEmail: authResult.email,
      action: 'USER_APPROVED',
      entityType: 'User',
      entityId: id,
      prevState,
      details: { role, teamIds, mandantIds },
    });

    return NextResponse.json({ message: 'Benutzer freigeschaltet' });
  } catch (error) {
    console.error('POST /api/admin/users/[id]/approve error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
