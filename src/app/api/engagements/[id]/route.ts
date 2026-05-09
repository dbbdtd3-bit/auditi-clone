import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const engagement = await prisma.engagement.findUnique({
      where: { id },
      include: {
        mandant: true,
        pbcWorkspace: true,
        _count: { select: { campaigns: true } },
      },
    });

    if (!engagement) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(engagement);
  } catch (error) {
    console.error('GET /api/engagements/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { title, fiscalYear, type, status } = body as {
      title?: string;
      fiscalYear?: number;
      type?: string;
      status?: string;
    };

    const engagement = await prisma.engagement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(fiscalYear !== undefined && { fiscalYear: Number(fiscalYear) }),
        ...(type !== undefined && { type: type as 'JAHRESABSCHLUSS' | 'SONDERPRUEFUNG' | 'DUE_DILIGENCE' }),
        ...(status !== undefined && { status: status as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' }),
      },
    });

    return NextResponse.json(engagement);
  } catch (error) {
    console.error('PUT /api/engagements/[id] error:', error);
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

    const campaignCount = await prisma.confirmationCampaign.count({
      where: { engagementId: id },
    });

    if (campaignCount > 0) {
      // Soft-delete: archive
      const engagement = await prisma.engagement.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
      return NextResponse.json(engagement);
    }

    await prisma.engagement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/engagements/[id] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
