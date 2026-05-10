import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const body = await req.json();
    const { name, description, category } = body as {
      name: string;
      description?: string;
      category?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    const template = await prisma.pbcTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || 'ALLGEMEIN',
        isBuiltIn: false,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/templates error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
