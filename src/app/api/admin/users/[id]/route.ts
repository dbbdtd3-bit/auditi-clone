import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { recordAudit } from '@/lib/audit';

const WP_ROLES = new Set(['WP_ADMIN', 'WP_TEAM']);
const CLIENT_ROLES = new Set(['MANDANT_ADMIN', 'MANDANT_USER']);

function toMandantRole(role: string | undefined): 'MANDANT_ADMIN' | 'MANDANT_USER' {
  return role === 'MANDANT_ADMIN' ? 'MANDANT_ADMIN' : 'MANDANT_USER';
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdmin();
    if ('status' in authResult) return authResult;

    const { id } = await params;
    const body = await req.json();
    const { role, status, teamIds, mandantIds, mandanten } = body as {
      role?: string;
      status?: string;
      teamIds?: string[];
      mandantIds?: string[];
      mandanten?: Array<{ mandantId: string; role: 'MANDANT_ADMIN' | 'MANDANT_USER' }>;
    };

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        teams: true,
        mandanten: true,
      },
    });
    if (!existing) return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });

    if (role) {
      if (existing.kind === 'WP' && !WP_ROLES.has(role)) {
        return NextResponse.json({ error: 'Ungueltige Kanzlei-Rolle' }, { status: 400 });
      }
      if (existing.kind === 'CLIENT' && !CLIENT_ROLES.has(role)) {
        return NextResponse.json({ error: 'Ungueltige Mandanten-Rolle' }, { status: 400 });
      }
    }

    if (existing.kind === 'WP' && (mandanten !== undefined || mandantIds !== undefined)) {
      return NextResponse.json({ error: 'Kanzlei-Benutzer koennen keinen Mandanten zugeordnet werden' }, { status: 400 });
    }

    if (existing.kind === 'CLIENT' && teamIds !== undefined) {
      return NextResponse.json({ error: 'Mandanten-Benutzer koennen keinen Teams zugeordnet werden' }, { status: 400 });
    }

    const prevState = {
      role: existing.role,
      status: existing.status,
      teamIds: existing.teams.map((t) => t.teamId),
      mandanten: existing.mandanten.map((m) => ({ mandantId: m.mandantId, role: m.role })),
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

      if (mandanten !== undefined || mandantIds !== undefined) {
        const nextMandantRole = toMandantRole(role ?? existing.role);
        const nextMandantIds = Array.from(
          new Set(
            (mandanten ?? mandantIds?.map((mandantId) => ({ mandantId })) ?? [])
              .map((link) => link.mandantId)
              .filter((mandantId): mandantId is string => typeof mandantId === 'string' && mandantId.length > 0)
          )
        );

        await tx.userMandant.deleteMany({ where: { userId: id } });
        if (nextMandantIds.length > 0) {
          await tx.userMandant.createMany({
            data: nextMandantIds.map((mandantId) => ({
              mandantId,
              userId: id,
              role: nextMandantRole,
            })),
            skipDuplicates: true,
          });
        }
      } else if (role && existing.kind === 'CLIENT') {
        await tx.userMandant.updateMany({
          where: { userId: id },
          data: { role: toMandantRole(role) },
        });
      }
    });

    await recordAudit({
      actorId: authResult.id,
      actorEmail: authResult.email,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      prevState,
      details: { role, status, teamIds, mandantIds, mandanten },
    });

    return NextResponse.json({ message: 'Benutzer aktualisiert' });
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
