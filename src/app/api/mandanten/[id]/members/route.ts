import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canManageMandantUsers } from '@/lib/mandant-permissions';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  if (!await canManageMandantUsers(user, id)) return forbidden();

  const members = await prisma.userMandant.findMany({
    where: { mandantId: id },
    include: {
      user: { select: { id: true, name: true, email: true, status: true, kind: true, role: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });

  return NextResponse.json({ members });
}

