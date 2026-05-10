import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/require-auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: teamId } = await params;
  const { userId } = await req.json() as { userId: string };

  if (!userId) return NextResponse.json({ error: 'userId erforderlich' }, { status: 400 });

  const member = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId },
    update: {},
  });

  return NextResponse.json({ member }, { status: 201 });
}
