import type { PublicRequestData } from '@/lib/public-response';
import { confirmationMethodLabels, counterpartyTypeLabels } from '@/lib/sba';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

function formatBalance(value: string | null, currency: string): string {
  if (value === null) return 'Wird vom Empfänger angegeben';
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return `${value} ${currency}`;

  return num.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
    currency,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function PublicRequestSummary({ request }: { request: PublicRequestData }) {
  const isOpen = request.confirmationMethod === 'OPEN';
  const balanceFormatted = formatBalance(request.expectedBalance, request.currency);
  const methodLabel =
    confirmationMethodLabels[request.confirmationMethod as keyof typeof confirmationMethodLabels] ??
    request.confirmationMethod;
  const counterpartyLabel =
    counterpartyTypeLabels[request.counterpartyType as keyof typeof counterpartyTypeLabels] ??
    request.counterpartyType;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-dataly-line bg-dataly-surface-subtle px-5 py-4">
        <p className="text-xs font-semibold uppercase text-dataly-blue">Saldenbestätigung</p>
        <h2 className="mt-1 text-base font-semibold leading-6 text-dataly-ink">
          {isOpen ? 'Offene Saldenabfrage' : 'Angefragter Saldo'}
        </h2>
      </div>
      <CardContent className="p-5">
        <div className="mb-5 flex flex-col gap-3 border-b border-dataly-line pb-4">
          <div>
            <p className="text-xs font-semibold text-dataly-slate">Ansprechpartner</p>
            <h3 className="mt-1 text-[22px] font-semibold leading-[30px] text-dataly-ink">
              {request.partnerName}
            </h3>
            <p className="text-sm leading-[22px] text-dataly-slate">{request.partnerEmail}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Link gültig bis {formatDate(request.tokenExpiresAt)}</Badge>
            <Badge variant="secondary">{methodLabel}</Badge>
            <Badge variant="outline">{counterpartyLabel}</Badge>
          </div>
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-dataly-slate">Mandant</dt>
            <dd className="mt-1 font-semibold text-dataly-ink">{request.clientName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-dataly-slate">Stichtag</dt>
            <dd className="mt-1 font-semibold text-dataly-ink">{formatDate(request.balanceDate)}</dd>
          </div>
          {request.accountNumber ? (
            <div>
              <dt className="text-xs font-semibold text-dataly-slate">Kontonummer</dt>
              <dd className="mt-1 font-mono text-sm text-dataly-ink">{request.accountNumber}</dd>
            </div>
          ) : null}
          <div className={request.accountNumber ? '' : 'sm:col-span-2'}>
            <dt className="text-xs font-semibold text-dataly-slate">
              {isOpen ? 'Abzufragender Saldo' : 'Saldo laut Buchführung'}
            </dt>
            <dd
              className={`${isOpen ? 'text-base leading-6' : 'text-[28px] leading-9'} mt-1 font-semibold text-dataly-ink`}
            >
              {balanceFormatted}
            </dd>
            {isOpen ? (
              <p className="mt-1 text-xs leading-5 text-dataly-muted">
                Der interne Buchsaldo wird bei dieser offenen Bestätigung nicht angezeigt.
              </p>
            ) : null}
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export { formatBalance, formatDate };
