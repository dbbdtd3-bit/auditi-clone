import { RequestStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export type PublicPortalState =
  | 'form'
  | 'expired'
  | 'already_responded'
  | 'closed'
  | 'inactive'
  | 'not_found'
  | 'error';

export interface PublicRequestData {
  id: string;
  partnerName: string;
  partnerEmail: string;
  accountNumber: string | null;
  expectedBalance: string;
  currency: string;
  balanceDate: string;
  clientName: string;
  kanzleiName: string;
  tokenExpiresAt: string;
  status: string;
  alreadyResponded: boolean;
}

export type PublicPortalResult =
  | { state: 'form'; data: PublicRequestData }
  | { state: 'expired'; message: string }
  | { state: 'already_responded'; data: PublicRequestData }
  | { state: 'closed'; message: string }
  | { state: 'inactive'; message: string }
  | { state: 'not_found'; message: string }
  | { state: 'error'; message: string };

export type PublicTokenAccess =
  | {
      ok: true;
      request: NonNullable<Awaited<ReturnType<typeof getPublicTokenRequest>>>;
    }
  | {
      ok: false;
      status: number;
      body: {
        error: string;
        expired?: boolean;
        state: Exclude<PublicPortalState, 'form'>;
      };
    };

const inactiveStatuses = new Set<RequestStatus>([RequestStatus.DRAFT]);
const respondableStatuses = new Set<RequestStatus>([RequestStatus.SENT, RequestStatus.QUEUED]);

function toPublicRequestData(
  request: NonNullable<Awaited<ReturnType<typeof getPublicTokenRequest>>>
): PublicRequestData {
  const clientName = request.campaign.engagement.mandant.name;

  return {
    id: request.id,
    partnerName: request.partnerName,
    partnerEmail: request.partnerEmail,
    accountNumber: request.accountNumber,
    expectedBalance: request.expectedBalance.toString(),
    currency: request.currency,
    balanceDate: request.campaign.balanceDate.toISOString(),
    clientName,
    kanzleiName: clientName,
    tokenExpiresAt: request.tokenExpiresAt.toISOString(),
    status: request.status,
    alreadyResponded: request.status === RequestStatus.RESPONDED || request.response !== null,
  };
}

export async function getPublicTokenRequest(token: string) {
  return prisma.confirmationRequest.findUnique({
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
}

export async function getPublicPortalResult(
  token: string,
  now = new Date()
): Promise<PublicPortalResult> {
  const request = await getPublicTokenRequest(token);

  if (!request) {
    return { state: 'not_found', message: 'Der Antwortlink wurde nicht gefunden.' };
  }

  if (request.tokenExpiresAt < now) {
    return { state: 'expired', message: 'Der Antwortlink ist abgelaufen.' };
  }

  if (request.status === RequestStatus.CLOSED) {
    return { state: 'closed', message: 'Dieser Vorgang wurde bereits abgeschlossen.' };
  }

  const data = toPublicRequestData(request);

  if (data.alreadyResponded) {
    return { state: 'already_responded', data };
  }

  if (inactiveStatuses.has(request.status)) {
    return { state: 'inactive', message: 'Dieser Vorgang ist noch nicht aktiv.' };
  }

  return { state: 'form', data };
}

export async function requireRespondablePublicToken(
  token: string,
  now = new Date()
): Promise<PublicTokenAccess> {
  const request = await getPublicTokenRequest(token);

  if (!request) {
    return {
      ok: false,
      status: 404,
      body: { error: 'Nicht gefunden', state: 'not_found' },
    };
  }

  if (request.response !== null || request.status === RequestStatus.RESPONDED) {
    return {
      ok: false,
      status: 409,
      body: { error: 'Diese Anfrage wurde bereits beantwortet', state: 'already_responded' },
    };
  }

  if (request.tokenExpiresAt < now) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Token abgelaufen', expired: true, state: 'expired' },
    };
  }

  if (request.status === RequestStatus.CLOSED) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Dieser Vorgang ist abgeschlossen', state: 'closed' },
    };
  }

  if (!respondableStatuses.has(request.status)) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Diese Anfrage ist nicht aktiv', state: 'inactive' },
    };
  }

  return { ok: true, request };
}
