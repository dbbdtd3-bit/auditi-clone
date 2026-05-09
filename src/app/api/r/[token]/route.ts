import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RequestStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  try {
    const request = await prisma.confirmationRequest.findUnique({
      where: { publicToken: token },
      include: {
        campaign: {
          include: {
            engagement: {
              include: {
                mandant: true,
              },
            },
          },
        },
        response: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const now = new Date();

    // Token abgelaufen
    if (request.tokenExpiresAt < now) {
      return NextResponse.json({ error: 'Token abgelaufen', expired: true }, { status: 403 });
    }

    // Noch nicht versendet
    if (request.status === RequestStatus.DRAFT || request.status === RequestStatus.QUEUED) {
      return NextResponse.json(
        { error: 'Dieser Vorgang ist noch nicht aktiv' },
        { status: 403 }
      );
    }

    // Geschlossen
    if (request.status === RequestStatus.CLOSED) {
      return NextResponse.json(
        { error: 'Dieser Vorgang ist abgeschlossen' },
        { status: 403 }
      );
    }

    const alreadyResponded =
      request.status === RequestStatus.RESPONDED || request.response !== null;

    const data = {
      id: request.id,
      partnerName: request.partnerName,
      partnerEmail: request.partnerEmail,
      accountNumber: request.accountNumber,
      expectedBalance: request.expectedBalance.toString(),
      currency: request.currency,
      balanceDate: request.campaign.balanceDate.toISOString(),
      kanzleiName: request.campaign.engagement.mandant.name,
      tokenExpiresAt: request.tokenExpiresAt.toISOString(),
      status: request.status,
      alreadyResponded,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/r/[token] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  try {
    const body = await req.json();
    const { respondedBy, confirmedBalance, hasDifference, differenceNote, attachmentKey } = body;

    // Validierung
    if (!respondedBy || typeof respondedBy !== 'string' || respondedBy.trim() === '') {
      return NextResponse.json(
        { error: 'Name des Antwortenden ist erforderlich' },
        { status: 400 }
      );
    }

    const request = await prisma.confirmationRequest.findUnique({
      where: { publicToken: token },
      include: { response: true },
    });

    if (!request) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    // Bereits beantwortet
    if (request.response !== null || request.status === RequestStatus.RESPONDED) {
      return NextResponse.json(
        { error: 'Diese Anfrage wurde bereits beantwortet' },
        { status: 409 }
      );
    }

    // Token abgelaufen
    const now = new Date();
    if (request.tokenExpiresAt < now) {
      return NextResponse.json({ error: 'Token abgelaufen', expired: true }, { status: 403 });
    }

    // Status muss SENT oder QUEUED sein
    if (request.status !== RequestStatus.SENT && request.status !== RequestStatus.QUEUED) {
      return NextResponse.json(
        { error: 'Diese Anfrage ist nicht aktiv' },
        { status: 403 }
      );
    }

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

    return NextResponse.json({ success: true, responseId: response.id });
  } catch (error) {
    console.error('POST /api/r/[token] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
