import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const engagements = await prisma.engagement.findMany({
      include: { mandant: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(engagements);
  } catch (error) {
    console.error('GET /api/engagements error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { mandantId, title, fiscalYear, type } = body as {
      mandantId: string;
      title: string;
      fiscalYear: number;
      type: string;
    };

    if (!mandantId || !title || !fiscalYear || !type) {
      return NextResponse.json({ error: 'Alle Pflichtfelder sind erforderlich' }, { status: 400 });
    }

    const engagement = await prisma.$transaction(async (tx) => {
      const eng = await tx.engagement.create({
        data: {
          mandantId,
          title,
          fiscalYear: Number(fiscalYear),
          type: type as 'JAHRESABSCHLUSS' | 'SONDERPRUEFUNG' | 'DUE_DILIGENCE',
          status: 'ACTIVE',
        },
      });

      await tx.pbcWorkspace.create({
        data: { engagementId: eng.id },
      });

      return eng;
    });

    return NextResponse.json(engagement, { status: 201 });
  } catch (error) {
    console.error('POST /api/engagements error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
