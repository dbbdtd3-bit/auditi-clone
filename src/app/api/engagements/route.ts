import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

const VALID_TYPES = ['JAHRESABSCHLUSS', 'SONDERPRUEFUNG', 'DUE_DILIGENCE'];

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

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
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

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

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Ungültiger Auftragstyp' }, { status: 400 });
    }

    const engagement = await prisma.$transaction(async (tx) => {
      const eng = await tx.engagement.create({
        data: {
          mandantId,
          title,
          fiscalYear: Number(fiscalYear),
          type,
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
