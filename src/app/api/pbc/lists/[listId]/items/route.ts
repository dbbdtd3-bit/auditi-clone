import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { listId } = await params;
    const body = await req.json();
    const { title, description, dueDate } = body as {
      title: string;
      description?: string;
      dueDate?: string;
    };

    if (!title) {
      return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 });
    }

    const maxSortOrder = await prisma.pbcRequestItem.aggregate({
      where: { listId },
      _max: { sortOrder: true },
    });

    const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    const item = await prisma.pbcRequestItem.create({
      data: {
        listId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/lists/[listId]/items error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
