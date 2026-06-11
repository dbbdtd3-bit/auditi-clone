import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPublicPortalResult, requireRespondablePublicToken } from '@/lib/public-response';
import { RequestStatus } from '@prisma/client';
import { enqueueSbaResponseNotification } from '@/lib/queue';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  try {
    const result = await getPublicPortalResult(token);

    if (result.state === 'form' || result.state === 'already_responded') {
      return NextResponse.json(result.data);
    }

    const status = result.state === 'not_found' ? 404 : result.state === 'error' ? 500 : 403;
    return NextResponse.json(
      { error: result.message, expired: result.state === 'expired', state: result.state },
      { status }
    );
  } catch (error) {
    console.error('GET /api/r/[token] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  try {
    const body = await req.json();
    const { respondedBy, confirmedBalance, hasDifference, differenceNote, attachmentKey, privacyAccepted } = body;

    // Validierung
    if (!respondedBy || typeof respondedBy !== 'string' || respondedBy.trim() === '') {
      return NextResponse.json(
        { error: 'Name des Antwortenden ist erforderlich' },
        { status: 400 }
      );
    }

    if (privacyAccepted !== true) {
      return NextResponse.json(
        { error: 'Bitte stimmen Sie der Verwendung Ihrer Angaben zur Prüfungsdokumentation zu.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const access = await requireRespondablePublicToken(token, now);
    if (!access.ok) return NextResponse.json(access.body, { status: access.status });

    const { request } = access;

    // IP-Adresse
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : realIp ?? null;

    // Transaktion: Response erstellen + Request updaten + AuditEvent
    const [response] = await prisma.$transaction([
      prisma.confirmationResponse.create({
        data: {
          requestId: request.id,
          confirmedBalance:
            confirmedBalance !== undefined && confirmedBalance !== null
              ? confirmedBalance
              : null,
          hasDifference: Boolean(hasDifference),
          differenceNote: differenceNote ?? null,
          attachmentKey: attachmentKey ?? null,
          respondedBy: respondedBy.trim(),
          respondedAt: now,
          ipAddress,
        },
      }),
      prisma.confirmationRequest.update({
        where: { id: request.id },
        data: {
          status: RequestStatus.RESPONDED,
          respondedAt: now,
        },
      }),
      prisma.auditEvent.create({
        data: {
          requestId: request.id,
          event: 'RESPONDED',
          actor: respondedBy.trim(),
          meta: {
            respondedBy: respondedBy.trim(),
            hasDifference: Boolean(hasDifference),
          },
        },
      }),
    ]);

    await enqueueSbaResponseNotification(request.id);

    return NextResponse.json({ success: true, responseId: response.id });
  } catch (error) {
    console.error('POST /api/r/[token] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
