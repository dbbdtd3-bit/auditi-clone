import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/require-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const thread = await prisma.assistantThread.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!thread || thread.userId !== user.id) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  }

  const messages = await prisma.assistantMessage.findMany({
    where: { threadId: id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      content: true,
      toolCalls: true,
      createdAt: true,
    },
  });

  return NextResponse.json(messages);
}
