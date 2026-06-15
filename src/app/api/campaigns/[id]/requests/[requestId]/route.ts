import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { canViewMandant } from '@/lib/mandant-permissions';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { deleteObject } from '@/lib/obs';

type RouteParams = {
  params: Promise<{ id: string; requestId: string }>;
};

function parseRequestBody(body: Record<string, unknown>) {
  const partnerName = typeof body.partnerName === 'string' ? body.partnerName.trim() : '';
  const partnerEmail = typeof body.partnerEmail === 'string' ? body.partnerEmail.trim() : '';
  const accountNumber =
    typeof body.accountNumber === 'string' && body.accountNumber.trim()
      ? body.accountNumber.trim()
      : null;
  const currency = typeof body.currency === 'string' && body.currency.trim()
    ? body.currency.trim().toUpperCase()
    : 'EUR';
  const expectedBalance = Number(body.expectedBalance);

  if (!partnerName || !partnerEmail || !Number.isFinite(expectedBalance)) {
    return {
      error: 'Ungültige Anfrage: Partner, E-Mail und erwarteter Saldo sind Pflichtfelder.',
    };
  }

  if (!partnerEmail.includes('@')) {
    return { error: 'Ungültige Anfrage: Bitte geben Sie eine gültige E-Mail-Adresse ein.' };
  }

  if (!['EUR', 'USD', 'CHF'].includes(currency)) {
    return { error: 'Ungültige Anfrage: Die Währung wird nicht unterstützt.' };
  }

  return {
    data: {
      partnerName,
      partnerEmail,
      accountNumber,
      expectedBalance: new Prisma.Decimal(expectedBalance.toFixed(2)),
      currency,
    },
  };
}

function hasLockedAuditFields(status: string) {
  return status === 'RESPONDED' || status === 'CLOSED';
}

function decimalEquals(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.toFixed(2) === b.toFixed(2);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id, requestId } = await params;

    const request = await prisma.confirmationRequest.findFirst({
      where: { id: requestId, campaignId: id },
      include: {
        review: true,
        campaign: {
          include: { engagement: { select: { mandantId: true } } },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    if (!await canViewMandant(user, request.campaign.engagement.mandantId)) {
      return forbidden();
    }

    if (request.campaign.status === 'COMPLETED' || request.campaign.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Ungültige Anfrage: Abgeschlossene oder archivierte Kampagnen können nicht bearbeitet werden.' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseRequestBody(body);

    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lockedAuditFields = hasLockedAuditFields(request.status);
    if (lockedAuditFields) {
      const emailChangedForLockedRequest =
        request.partnerEmail.toLowerCase() !== parsed.data.partnerEmail.toLowerCase();
      const balanceChangedForLockedRequest =
        !decimalEquals(request.expectedBalance, parsed.data.expectedBalance);

      if (emailChangedForLockedRequest || balanceChangedForLockedRequest) {
        return NextResponse.json(
          { error: 'E-Mail-Adresse und erwarteter Saldo bleiben nach einer Antwort unveraendert.' },
          { status: 400 }
        );
      }

      parsed.data.partnerEmail = request.partnerEmail;
      parsed.data.expectedBalance = request.expectedBalance;
    }

    const emailChanged =
      !lockedAuditFields &&
      request.partnerEmail.toLowerCase() !== parsed.data.partnerEmail.toLowerCase();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.confirmationRequest.update({
        where: { id: requestId },
        data: parsed.data,
      });

      if (emailChanged || !request.review) {
        await tx.confirmationRequestReview.upsert({
          where: { requestId },
          update: {
            addressVerificationStatus: 'UNVERIFIED',
            addressVerificationMethod: null,
            addressVerificationNote: emailChanged
              ? 'E-Mail-Adresse wurde geändert; Verifikation erneut erforderlich.'
              : null,
            addressVerifiedAt: null,
            addressVerifiedBy: null,
          },
          create: {
            requestId,
            addressVerificationStatus: 'UNVERIFIED',
            addressVerificationNote: emailChanged
              ? 'E-Mail-Adresse wurde geändert; Verifikation erneut erforderlich.'
              : null,
          },
        });
      }

      return tx.confirmationRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: { response: true, review: true },
      });
    });

    await prisma.auditEvent.create({
      data: {
        requestId,
        event: 'UPDATED',
        actor: user.email ?? user.id,
        meta: {
          previous: {
            partnerName: request.partnerName,
            partnerEmail: request.partnerEmail,
            accountNumber: request.accountNumber,
            expectedBalance: request.expectedBalance.toString(),
            currency: request.currency,
          },
        },
      },
    });

    void recordAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'SBA_REQUEST_UPDATED',
      entityType: 'ConfirmationRequest',
      entityId: requestId,
      details: { campaignId: id, partnerName: updated.partnerName },
      prevState: {
        partnerName: request.partnerName,
        partnerEmail: request.partnerEmail,
        accountNumber: request.accountNumber,
        expectedBalance: request.expectedBalance.toString(),
        currency: request.currency,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/campaigns/[id]/requests/[requestId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id, requestId } = await params;

    const request = await prisma.confirmationRequest.findFirst({
      where: { id: requestId, campaignId: id },
      include: {
        response: true,
        campaign: {
          include: { engagement: { select: { mandantId: true } } },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    if (!await canViewMandant(user, request.campaign.engagement.mandantId)) {
      return forbidden();
    }

    if (request.campaign.status === 'COMPLETED' || request.campaign.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Ungültige Anfrage: Abgeschlossene oder archivierte Kampagnen können nicht bearbeitet werden.' },
        { status: 400 }
      );
    }

    const responseId = request.response?.id;
    const attachmentKey = request.response?.attachmentKey;
    const pdfKey = request.pdfKey;

    await prisma.$transaction(async (tx) => {
      if (responseId) {
        await tx.differenceComment.deleteMany({ where: { responseId } });
        await tx.confirmationResponse.delete({ where: { id: responseId } });
      }
      await tx.confirmationRequestReview.deleteMany({ where: { requestId } });
      await tx.auditEvent.deleteMany({ where: { requestId } });
      await tx.confirmationRequest.delete({ where: { id: requestId } });
    });

    for (const key of [attachmentKey, pdfKey]) {
      if (!key) continue;
      try {
        await deleteObject(key);
      } catch {
        // Best-effort object cleanup
      }
    }

    void recordAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'SBA_REQUEST_DELETED',
      entityType: 'ConfirmationRequest',
      entityId: requestId,
      details: {
        campaignId: id,
        partnerName: request.partnerName,
        partnerEmail: request.partnerEmail,
        status: request.status,
      },
      prevState: {
        partnerName: request.partnerName,
        partnerEmail: request.partnerEmail,
        accountNumber: request.accountNumber,
        expectedBalance: request.expectedBalance.toString(),
        currency: request.currency,
        status: request.status,
      },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/campaigns/[id]/requests/[requestId] error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
