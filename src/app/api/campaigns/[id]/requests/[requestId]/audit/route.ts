import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id, requestId } = await params;

    // Verify the request belongs to this campaign
    const request = await prisma.confirmationRequest.findUnique({
      where: { id: requestId },
      select: { id: true, campaignId: true },
    });

    if (!request || request.campaignId !== id) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const events = await prisma.auditEvent.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      events.map((e) => ({
        ...e,
        meta:
          e.meta && typeof e.meta === 'object' && !Array.isArray(e.meta)
            ? e.meta
            : null,
        createdAt: e.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('GET /api/campaigns/[id]/requests/[requestId]/audit error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
