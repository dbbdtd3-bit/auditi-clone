import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if ('status' in authResult) return authResult;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const kind = searchParams.get('kind');

    const users = await prisma.user.findMany({
      where: {
        ...(status ? { status: status as 'PENDING' | 'ACTIVE' | 'DISABLED' } : {}),
        ...(kind ? { kind: kind as 'WP' | 'CLIENT' } : {}),
      },
      include: {
        teams: { include: { team: true } },
        mandanten: { include: { mandant: { select: { id: true, name: true } } } },
        mandant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
