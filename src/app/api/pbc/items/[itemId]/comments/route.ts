import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId } = await params;

    const comments = await prisma.pbcComment.findMany({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('GET /api/pbc/items/[itemId]/comments error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId } = await params;
    const body = await req.json();
    const { text, author, role } = body as {
      text: string;
      author: string;
      role: string;
    };

    if (!text) {
      return NextResponse.json({ error: 'Text ist erforderlich' }, { status: 400 });
    }

    const comment = await prisma.pbcComment.create({
      data: {
        itemId,
        text,
        author: author || 'Unbekannt',
        role: role || 'WP_TEAM',
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/items/[itemId]/comments error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
