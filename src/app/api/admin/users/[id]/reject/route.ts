import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { recordAudit } from '@/lib/audit';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdmin();
    if ('status' in authResult) return authResult;

    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });

    await prisma.user.update({
      where: { id },
      data: { status: 'DISABLED' },
    });

    await recordAudit({
      actorId: authResult.id,
      actorEmail: authResult.email,
      action: 'USER_REJECTED',
      entityType: 'User',
      entityId: id,
      details: { name: existing.name, email: existing.email },
    });

    return NextResponse.json({ message: 'Benutzer abgelehnt' });
  } catch (error) {
    console.error('POST /api/admin/users/[id]/reject error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
