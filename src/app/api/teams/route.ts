import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/require-auth';
import { recordAudit } from '@/lib/audit';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const teams = await prisma.team.findMany({
    where: isAdmin(user)
      ? {}
      : { members: { some: { userId: user.id } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      mandanten: {
        include: {
          mandant: { select: { id: true, name: true, legalName: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ teams });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, description, accentColor } = body as {
    name: string;
    description?: string;
    accentColor?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 });
  }

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      description: description?.trim(),
      accentColor: (accentColor as never) ?? 'BLUE',
    },
    include: { members: true },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'TEAM_CREATED',
    entityType: 'Team',
    entityId: team.id,
    details: { name: team.name },
  });

  return NextResponse.json({ team }, { status: 201 });
}
