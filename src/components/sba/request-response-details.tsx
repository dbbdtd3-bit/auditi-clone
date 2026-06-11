'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Download, FileText, Loader2, UserCheck } from 'lucide-react';

type ResponseDetails = {
  id: string;
  respondedBy: string;
  respondedAt: string;
  hasDifference: boolean;
  confirmedBalance: string | null;
  differenceNote: string | null;
  ipAddress: string | null;
  attachment: {
    key: string;
    filename: string;
    downloadUrl: string | null;
  } | null;
  comments: Array<{
    id: string;
    author: string;
    role: string;
    text: string;
    createdAt: string;
  }>;
};

type RequestSummary = {
  id: string;
  partnerName: string;
  expectedBalance: unknown;
  currency: string;
  status: string;
};

function toNumber(amount: unknown): number {
  if (typeof amount === 'object' && amount !== null && 'toNumber' in amount) {
    return (amount as { toNumber: () => number }).toNumber();
  }

  return Number(amount);
}

function parseAmount(amount: string | null): number | null {
  if (amount === null) return null;
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(amount: unknown, currency: string): string {
  const num = toNumber(amount);
  if (Number.isNaN(num)) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-dataly-line bg-dataly-surface-subtle px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase leading-4 text-dataly-muted">{label}</dt>
      <dd className={`mt-1 text-sm leading-[22px] text-dataly-ink ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

export function RequestResponseDetails({
  campaignId,
  request,
}: {
  campaignId: string;
  request: RequestSummary;
}) {
  const [details, setDetails] = React.useState<ResponseDetails | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (request.status !== 'RESPONDED') {
      setDetails(null);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    fetch(`/api/campaigns/${campaignId}/requests/${request.id}/response`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Antwort konnte nicht geladen werden.');
        return data as ResponseDetails;
      })
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Antwort konnte nicht geladen werden.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, request.id, request.status]);

  const confirmedBalance = details ? parseAmount(details.confirmedBalance) : null;
  const expectedBalance = toNumber(request.expectedBalance);
  const difference =
    confirmedBalance !== null && Number.isFinite(expectedBalance)
      ? confirmedBalance - expectedBalance
      : null;

  return (
    <Card className="border-dataly-line-strong">
      <CardHeader className="border-b border-dataly-line bg-dataly-surface-subtle pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0 text-dataly-blue" />
            <CardTitle className="truncate text-sm">Antwortdetails: {request.partnerName}</CardTitle>
          </div>
          {details ? (
            <Badge variant={details.hasDifference ? 'warning' : 'success'}>
              {details.hasDifference ? 'Differenz gemeldet' : 'Saldo bestätigt'}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {request.status !== 'RESPONDED' ? (
          <div className="rounded-md border border-dataly-line bg-dataly-surface-subtle p-4 text-sm leading-[22px] text-dataly-slate">
            Für diese Anfrage ist noch keine Antwort eingegangen.
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-dataly-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Antwort wird geladen...
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-dataly-danger/30 bg-dataly-danger-soft px-3 py-2 text-sm text-dataly-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {details ? (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Antwort von" value={details.respondedBy} />
              <DetailItem label="Eingegangen am" value={formatDateTime(details.respondedAt)} mono />
              <DetailItem
                label="Angefragter Saldo"
                value={formatCurrency(request.expectedBalance, request.currency)}
                mono
              />
              <DetailItem
                label="Bestätigter Saldo"
                value={
                  confirmedBalance === null
                    ? details.hasDifference
                      ? 'Nicht angegeben'
                      : formatCurrency(request.expectedBalance, request.currency)
                    : formatCurrency(confirmedBalance, request.currency)
                }
                mono
              />
            </dl>

            {details.hasDifference ? (
              <div className="rounded-md border border-dataly-warning/30 bg-dataly-warning-soft p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-dataly-warning" />
                  <h3 className="text-sm font-semibold text-dataly-ink">Gemeldete Abweichung</h3>
                </div>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Differenz zum angefragten Saldo"
                    value={difference === null ? 'Nicht berechenbar' : formatCurrency(difference, request.currency)}
                    mono
                  />
                  <DetailItem label="IP-Adresse" value={details.ipAddress ?? 'Nicht erfasst'} mono />
                </dl>
                <div className="mt-3 rounded-md border border-dataly-line bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase leading-4 text-dataly-muted">
                    Erläuterung
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-[22px] text-dataly-ink">
                    {details.differenceNote || 'Keine Erläuterung angegeben.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border border-dataly-success/25 bg-dataly-success-soft px-3 py-2 text-sm text-dataly-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Der Partner hat den angefragten Saldo ohne Abweichung bestätigt.</p>
              </div>
            )}

            <div className="rounded-md border border-dataly-line p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-dataly-muted" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-dataly-ink">Beleg</h3>
                    <p className="truncate text-xs leading-5 text-dataly-slate">
                      {details.attachment?.filename ?? 'Es wurde kein Beleg hochgeladen.'}
                    </p>
                  </div>
                </div>
                {details.attachment?.downloadUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={details.attachment.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                      Öffnen
                    </a>
                  </Button>
                ) : null}
              </div>
              {details.attachment && !details.attachment.downloadUrl ? (
                <p className="mt-2 text-xs leading-5 text-dataly-warning">
                  Der Beleg ist gespeichert, aber der Download-Link konnte gerade nicht erzeugt werden.
                </p>
              ) : null}
            </div>

            {details.comments.length > 0 ? (
              <div className="rounded-md border border-dataly-line p-3">
                <h3 className="text-sm font-semibold text-dataly-ink">Weitere Kommentare</h3>
                <ol className="mt-3 space-y-2">
                  {details.comments.map((comment) => (
                    <li key={comment.id} className="rounded-md bg-dataly-surface-subtle px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-dataly-muted">
                        <span className="font-semibold text-dataly-slate">{comment.author}</span>
                        <span>{comment.role}</span>
                        <time>{formatDateTime(comment.createdAt)}</time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-[22px] text-dataly-ink">
                        {comment.text}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
