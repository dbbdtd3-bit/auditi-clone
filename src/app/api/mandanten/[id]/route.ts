import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { visibleMandantWhere } from '@/lib/mandant-access';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;
    const allowed = await prisma.mandant.count({ where: { id, ...visibleMandantWhere(user) } });
    if (!allowed) return forbidden();

    const body = await req.json();
    const { name, legalName, taxId, address } = body as {
      name?: string;
      legalName?: string;
      taxId?: string;
      address?: { street?: string; city?: string; zip?: string; country?: string };
    };

    const mandant = await prisma.mandant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(taxId !== undefined && { taxId }),
        ...(address !== undefined && { address }),
      },
    });

    return NextResponse.json(mandant);
  } catch (error) {
    console.error('PUT /api/mandanten/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;
    const allowed = await prisma.mandant.count({ where: { id, ...visibleMandantWhere(user) } });
    if (!allowed) return forbidden();

    try {
      await prisma.$transaction(async (tx) => {
        const activeCount = await tx.engagement.count({
          where: { mandantId: id, status: 'ACTIVE' },
        });
        if (activeCount > 0) {
          throw Object.assign(new Error('ACTIVE_ENGAGEMENTS'), { code: 'ACTIVE_ENGAGEMENTS' });
        }
        await tx.mandant.delete({ where: { id } });
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'ACTIVE_ENGAGEMENTS') {
        return NextResponse.json(
          { error: 'Mandant hat noch aktive Engagements und kann nicht gelöscht werden.' },
          { status: 400 }
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/mandanten/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
