import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
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
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const activeEngagements = await prisma.engagement.count({
      where: { mandantId: id, status: 'ACTIVE' },
    });

    if (activeEngagements > 0) {
      return NextResponse.json(
        { error: 'Mandant hat noch aktive Engagements und kann nicht gelöscht werden.' },
        { status: 400 }
      );
    }

    await prisma.mandant.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/mandanten/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
