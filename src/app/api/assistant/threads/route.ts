import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/require-auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const threads = await prisma.assistantThread.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(threads);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const title = (body as { title?: string }).title ?? null;

  const thread = await prisma.assistantThread.create({
    data: { userId: user.id, title },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(thread, { status: 201 });
}
