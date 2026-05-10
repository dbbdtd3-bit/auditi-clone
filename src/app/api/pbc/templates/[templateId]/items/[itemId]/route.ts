import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string; itemId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { templateId, itemId } = await params;

    const template = await prisma.pbcTemplate.findUnique({
      where: { id: templateId },
      select: { isBuiltIn: true },
    });
    if (!template) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    if (template.isBuiltIn) return NextResponse.json({ error: 'Eingebaute Vorlagen sind schreibgeschützt' }, { status: 403 });

    const body = await req.json();
    const { title, description, sortOrder } = body as {
      title?: string;
      description?: string;
      sortOrder?: number;
    };

    const item = await prisma.pbcTemplateItem.update({
      where: { id: itemId, templateId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('PUT /api/pbc/templates/[templateId]/items/[itemId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string; itemId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { templateId, itemId } = await params;

    const template = await prisma.pbcTemplate.findUnique({
      where: { id: templateId },
      select: { isBuiltIn: true },
    });
    if (!template) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    if (template.isBuiltIn) return NextResponse.json({ error: 'Eingebaute Vorlagen sind schreibgeschützt' }, { status: 403 });

    await prisma.pbcTemplateItem.delete({ where: { id: itemId, templateId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/pbc/templates/[templateId]/items/[itemId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
