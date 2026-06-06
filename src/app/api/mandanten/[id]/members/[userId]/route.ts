import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canManageMandantUsers, normalizeMandantRole } from '@/lib/mandant-permissions';
import { recordAudit } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id, userId } = await params;
  if (!await canManageMandantUsers(user, id)) return forbidden();

  const body = await req.json();
  const role = normalizeMandantRole(body.role);

  const member = await prisma.userMandant.update({
    where: { userId_mandantId: { userId, mandantId: id } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, status: true } } },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'MANDANT_MEMBER_UPDATED',
    entityType: 'Mandant',
    entityId: id,
    details: { userId, role },
  });

  return NextResponse.json({ member });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id, userId } = await params;
  if (!await canManageMandantUsers(user, id)) return forbidden();

  await prisma.userMandant.deleteMany({ where: { userId, mandantId: id } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'MANDANT_MEMBER_REMOVED',
    entityType: 'Mandant',
    entityId: id,
    details: { userId },
  });

  return NextResponse.json({ ok: true });
}

