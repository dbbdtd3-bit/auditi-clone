import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { UNDOABLE_ACTIONS } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if ('status' in authResult) return authResult;

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
    const requestedPageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
    const pageSize = requestedPageSize === 50 ? 50 : 20;
    const action = searchParams.get('action');
    const actorId = searchParams.get('actorId');
    const where = {
      ...(action ? { action } : {}),
      ...(actorId ? { actorId } : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    return NextResponse.json({
      items: entries.map((e) => ({
        ...e,
        undoable: UNDOABLE_ACTIONS.has(e.action) && !e.undone,
      })),
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('GET /api/admin/audit-log error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
