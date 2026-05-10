import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/require-auth';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: teamId, userId } = await params;

  await prisma.teamMember.deleteMany({ where: { teamId, userId } });

  return NextResponse.json({ ok: true });
}
