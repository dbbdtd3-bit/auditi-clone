import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const mandanten = await prisma.mandant.findMany({
      include: {
        _count: {
          select: { engagements: true, users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(mandanten);
  } catch (error) {
    console.error('GET /api/mandanten error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, legalName, taxId, address } = body as {
      name: string;
      legalName?: string;
      taxId?: string;
      address: { street?: string; city: string; zip?: string; country?: string };
    };

    if (!name || !address?.city) {
      return NextResponse.json({ error: 'Name und Stadt sind erforderlich' }, { status: 400 });
    }

    const mandant = await prisma.mandant.create({
      data: {
        name,
        legalName: legalName || null,
        taxId: taxId || null,
        address: {
          street: address.street || '',
          city: address.city,
          zip: address.zip || '',
          country: address.country || 'DE',
        },
      },
    });

    return NextResponse.json(mandant, { status: 201 });
  } catch (error) {
    console.error('POST /api/mandanten error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
