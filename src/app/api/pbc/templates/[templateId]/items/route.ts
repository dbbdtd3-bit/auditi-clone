import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { templateId } = await params;

    const items = await prisma.pbcTemplateItem.findMany({
      where: { templateId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/pbc/templates/[templateId]/items error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { templateId } = await params;

    const template = await prisma.pbcTemplate.findUnique({
      where: { id: templateId },
      select: { isBuiltIn: true },
    });
    if (!template) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    if (template.isBuiltIn) return NextResponse.json({ error: 'Eingebaute Vorlagen sind schreibgeschützt' }, { status: 403 });

    const body = await req.json();
    const { title, description } = body as { title: string; description?: string };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 });
    }

    const max = await prisma.pbcTemplateItem.aggregate({
      where: { templateId },
      _max: { sortOrder: true },
    });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;

    const item = await prisma.pbcTemplateItem.create({
      data: { templateId, title: title.trim(), description: description?.trim() || null, sortOrder },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/templates/[templateId]/items error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
