import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPublicPortalResult, requireRespondablePublicToken } from '@/lib/public-response';
import { RequestStatus } from '@prisma/client';
import { enqueueSbaResponseNotification } from '@/lib/queue';
import { amountsDiffer, parseGermanDecimal } from '@/lib/sba';

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
    const isOpenConfirmation = request.campaign.confirmationMethod === 'OPEN';
    const parsedConfirmedBalance =
      confirmedBalance !== undefined && confirmedBalance !== null && confirmedBalance !== ''
        ? parseGermanDecimal(confirmedBalance)
        : null;

    if (isOpenConfirmation && (parsedConfirmedBalance === null || !Number.isFinite(parsedConfirmedBalance))) {
      return NextResponse.json(
        { error: 'Bitte geben Sie den Saldo laut Ihrer BuchfÃ¼hrung an.' },
        { status: 400 }
      );
    }

    const finalHasDifference = isOpenConfirmation
      ? amountsDiffer(request.expectedBalance, parsedConfirmedBalance)
      : Boolean(hasDifference);

    if (!isOpenConfirmation && finalHasDifference && (!differenceNote || typeof differenceNote !== 'string' || !differenceNote.trim())) {
      return NextResponse.json(
        { error: 'Bitte erlÃ¤utern Sie die Abweichung.' },
        { status: 400 }
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
            parsedConfirmedBalance !== null && Number.isFinite(parsedConfirmedBalance)
              ? parsedConfirmedBalance
              : null,
          hasDifference: finalHasDifference,
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
            hasDifference: finalHasDifference,
            confirmationMethod: request.campaign.confirmationMethod,
          },
        },
      }),
      prisma.confirmationRequestReview.upsert({
        where: { requestId: request.id },
        update: {
          reliabilityStatus: 'NOT_REVIEWED',
          differenceResolutionStatus: finalHasDifference ? 'OPEN' : 'NOT_REQUIRED',
          alternativeProcedureStatus: 'NOT_REQUIRED',
          conclusionStatus: 'OPEN',
        },
        create: {
          requestId: request.id,
          reliabilityStatus: 'NOT_REVIEWED',
          differenceResolutionStatus: finalHasDifference ? 'OPEN' : 'NOT_REQUIRED',
          alternativeProcedureStatus: 'NOT_REQUIRED',
          conclusionStatus: 'OPEN',
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
