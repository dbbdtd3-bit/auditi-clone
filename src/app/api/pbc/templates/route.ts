import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const templates = await prisma.pbcTemplate.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('GET /api/pbc/templates error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
