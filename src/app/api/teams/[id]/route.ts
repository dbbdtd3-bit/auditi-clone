import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/require-auth';
import { recordAudit } from '@/lib/audit';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, description, accentColor } = body as {
    name?: string;
    description?: string;
    accentColor?: string;
  };

  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(accentColor !== undefined && { accentColor: accentColor as never }),
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      mandanten: { include: { mandant: { select: { id: true, name: true, legalName: true } } } },
    },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'TEAM_UPDATED',
    entityType: 'Team',
    entityId: id,
    details: { name: team.name, accentColor: team.accentColor },
    prevState: { name: existing.name, accentColor: existing.accentColor, description: existing.description },
  });

  return NextResponse.json({ team });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.team.findUnique({
    where: { id },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.team.delete({ where: { id } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'TEAM_DELETED',
    entityType: 'Team',
    entityId: id,
    prevState: {
      name: existing.name,
      description: existing.description,
      accentColor: existing.accentColor,
      members: existing.members.map((m) => ({ userId: m.userId, email: m.user.email, name: m.user.name })),
    },
  });

  return NextResponse.json({ ok: true });
}
