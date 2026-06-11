import type { PublicRequestData } from '@/lib/public-response';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

function parseBalance(value: string): number {
  const compact = value.trim().replace(/\s/g, '');
  const commaIndex = compact.lastIndexOf(',');
  const dotIndex = compact.lastIndexOf('.');

  if (commaIndex > dotIndex) {
    return Number.parseFloat(compact.replace(/\./g, '').replace(',', '.'));
  }

  if (dotIndex > -1) {
    const fraction = compact.slice(dotIndex + 1);
    const looksLikeGermanThousands = commaIndex === -1 && fraction.length === 3;
    return Number.parseFloat(
      looksLikeGermanThousands ? compact.replace(/\./g, '') : compact.replace(/,/g, '')
    );
  }

  return Number.parseFloat(compact);
}

function formatBalance(value: string, currency: string): string {
  const num = parseBalance(value);
  if (Number.isNaN(num)) return `${value} ${currency}`;

  try {
    return num.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'currency',
      currency,
    });
  } catch {
    return `${num.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  }
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
    <Card className="overflow-hidden">
      <div className="border-b border-dataly-line bg-dataly-surface-subtle px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-col">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-dataly-blue">Saldobestätigung</p>
            <h2 className="mt-1 truncate text-[22px] font-semibold leading-[30px] text-dataly-ink">
              {request.partnerName}
            </h2>
            <p className="truncate text-sm leading-[22px] text-dataly-slate">{request.partnerEmail}</p>
          </div>
          <Badge variant="info" className="w-fit">
            Link gültig bis {formatDate(request.tokenExpiresAt)}
          </Badge>
        </div>
      </div>
      <CardContent className="space-y-5 p-5">
        <dl className="grid gap-4 text-sm">
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
        </dl>

        <div className="rounded-md border border-dataly-line bg-dataly-surface-subtle p-4">
          <p className="text-xs font-semibold text-dataly-slate">Saldo laut Buchführung</p>
          <p className="mt-1 text-[28px] font-semibold leading-9 text-dataly-ink">
            {balanceFormatted}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export { formatBalance, formatDate };
