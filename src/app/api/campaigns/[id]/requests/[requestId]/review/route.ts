import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { canViewMandant } from '@/lib/mandant-permissions';
import { getAuthUser, forbidden, isWpUser, unauthorized } from '@/lib/require-auth';

type RouteParams = {
  params: Promise<{ id: string; requestId: string }>;
};

const ADDRESS_STATUSES = ['UNVERIFIED', 'VERIFIED', 'NEEDS_REVIEW'];
const ADDRESS_METHODS = ['CORRESPONDENCE', 'INTERNET_RESEARCH', 'MASTER_DATA', 'OTHER'];
const RELIABILITY_STATUSES = ['NOT_REVIEWED', 'RELIABLE', 'DOUBTFUL', 'UNRELIABLE'];
const DIFFERENCE_STATUSES = ['NOT_REQUIRED', 'OPEN', 'RESOLVED', 'MISSTATEMENT', 'NOT_MISSTATEMENT'];
const ALTERNATIVE_STATUSES = ['NOT_REQUIRED', 'OPEN', 'COMPLETED', 'NOT_POSSIBLE'];
const CONCLUSION_STATUSES = ['OPEN', 'READY', 'CLOSED'];

function enumValue(body: Record<string, unknown>, key: string, allowed: string[]) {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !allowed.includes(value)) {
    return { error: `${key} ist ungÃ¼ltig.` };
  }
  return { value };
}

function textValue(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === 'string' ? value.trim() || null : null;
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
        campaign: {
          include: { engagement: { select: { mandantId: true } } },
        },
        response: true,
        review: true,
      },
    });

    if (!request) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    if (!await canViewMandant(user, request.campaign.engagement.mandantId)) return forbidden();

    if (request.campaign.status === 'COMPLETED' || request.campaign.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Abgeschlossene oder archivierte Kampagnen kÃ¶nnen nicht bearbeitet werden.' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const now = new Date();
    const actor = user.email ?? user.id;
    const data: Record<string, unknown> = {};

    const addressStatus = enumValue(body, 'addressVerificationStatus', ADDRESS_STATUSES);
    if (addressStatus && 'error' in addressStatus) return NextResponse.json({ error: addressStatus.error }, { status: 400 });
    if (addressStatus && 'value' in addressStatus) {
      data.addressVerificationStatus = addressStatus.value;
      data.addressVerifiedAt = addressStatus.value === 'VERIFIED' ? now : null;
      data.addressVerifiedBy = addressStatus.value === 'VERIFIED' ? actor : null;
    }

    const addressMethod = enumValue(body, 'addressVerificationMethod', ADDRESS_METHODS);
    if (addressMethod && 'error' in addressMethod) return NextResponse.json({ error: addressMethod.error }, { status: 400 });
    if (addressMethod && 'value' in addressMethod) data.addressVerificationMethod = addressMethod.value;
    if (body.addressVerificationMethod === null || body.addressVerificationMethod === '') {
      data.addressVerificationMethod = null;
    }

    const reliabilityStatus = enumValue(body, 'reliabilityStatus', RELIABILITY_STATUSES);
    if (reliabilityStatus && 'error' in reliabilityStatus) return NextResponse.json({ error: reliabilityStatus.error }, { status: 400 });
    if (reliabilityStatus && 'value' in reliabilityStatus) {
      data.reliabilityStatus = reliabilityStatus.value;
      data.reliabilityReviewedAt = reliabilityStatus.value === 'NOT_REVIEWED' ? null : now;
      data.reliabilityReviewedBy = reliabilityStatus.value === 'NOT_REVIEWED' ? null : actor;
    }

    const differenceStatus = enumValue(body, 'differenceResolutionStatus', DIFFERENCE_STATUSES);
    if (differenceStatus && 'error' in differenceStatus) return NextResponse.json({ error: differenceStatus.error }, { status: 400 });
    if (differenceStatus && 'value' in differenceStatus) {
      data.differenceResolutionStatus = differenceStatus.value;
      data.differenceResolvedAt = ['RESOLVED', 'MISSTATEMENT', 'NOT_MISSTATEMENT'].includes(differenceStatus.value) ? now : null;
      data.differenceResolvedBy = ['RESOLVED', 'MISSTATEMENT', 'NOT_MISSTATEMENT'].includes(differenceStatus.value) ? actor : null;
    }

    const alternativeStatus = enumValue(body, 'alternativeProcedureStatus', ALTERNATIVE_STATUSES);
    if (alternativeStatus && 'error' in alternativeStatus) return NextResponse.json({ error: alternativeStatus.error }, { status: 400 });
    if (alternativeStatus && 'value' in alternativeStatus) {
      data.alternativeProcedureStatus = alternativeStatus.value;
      data.alternativeProcedureAt = ['COMPLETED', 'NOT_POSSIBLE'].includes(alternativeStatus.value) ? now : null;
      data.alternativeProcedureBy = ['COMPLETED', 'NOT_POSSIBLE'].includes(alternativeStatus.value) ? actor : null;
    }

    const conclusionStatus = enumValue(body, 'conclusionStatus', CONCLUSION_STATUSES);
    if (conclusionStatus && 'error' in conclusionStatus) return NextResponse.json({ error: conclusionStatus.error }, { status: 400 });
    if (conclusionStatus && 'value' in conclusionStatus) {
      data.conclusionStatus = conclusionStatus.value;
      data.concludedAt = conclusionStatus.value === 'OPEN' ? null : now;
      data.concludedBy = conclusionStatus.value === 'OPEN' ? null : actor;
    }

    for (const key of [
      'addressVerificationNote',
      'reliabilityNote',
      'differenceResolutionNote',
      'alternativeProcedureNote',
      'conclusionNote',
    ]) {
      if (Object.prototype.hasOwnProperty.call(body, key)) data[key] = textValue(body, key);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Keine Review-Felder Ã¼bermittelt.' }, { status: 400 });
    }

    const review = await prisma.confirmationRequestReview.upsert({
      where: { requestId },
      create: {
        requestId,
        ...data,
      },
      update: data,
    });

    await prisma.auditEvent.create({
      data: {
        requestId,
        event: 'REVIEW_UPDATED',
        actor,
        meta: data as never,
      },
    });

    void recordAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'SBA_REQUEST_REVIEW_UPDATED',
      entityType: 'ConfirmationRequest',
      entityId: requestId,
      details: {
        campaignId: id,
        partnerName: request.partnerName,
      },
      prevState: request.review ?? undefined,
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('PATCH /api/campaigns/[id]/requests/[requestId]/review error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
