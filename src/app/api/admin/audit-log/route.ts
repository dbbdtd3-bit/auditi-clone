import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { UNDOABLE_ACTIONS } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if ('status' in authResult) return authResult;

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const action = searchParams.get('action');
    const actorId = searchParams.get('actorId');

    const entries = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(actorId ? { actorId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > limit;
    const items = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      items: items.map((e) => ({
        ...e,
        undoable: UNDOABLE_ACTIONS.has(e.action) && !e.undone,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error('GET /api/admin/audit-log error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
