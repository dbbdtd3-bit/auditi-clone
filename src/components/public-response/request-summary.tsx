import type { PublicRequestData } from '@/lib/public-response';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

function formatBalance(value: string, currency: string): string {
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
  const balanceFormatted = formatBalance(request.expectedBalance, request.currency);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-5 flex flex-col gap-3 border-b border-dataly-line pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-dataly-teal">Saldobestätigung</p>
            <h2 className="mt-1 text-[22px] font-semibold leading-[30px] text-dataly-ink">
              {request.partnerName}
            </h2>
            <p className="text-sm leading-[22px] text-dataly-slate">{request.partnerEmail}</p>
          </div>
          <Badge variant="info">Link gültig bis {formatDate(request.tokenExpiresAt)}</Badge>
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
            <dt className="text-xs font-semibold text-dataly-slate">Saldo laut Buchführung</dt>
            <dd className="mt-1 text-[28px] font-semibold leading-9 text-dataly-ink">
              {balanceFormatted}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export { formatBalance, formatDate };
