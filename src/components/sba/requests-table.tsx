'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';
import { RequestAuditLog } from './request-audit-log';

// ── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'DRAFT' | 'QUEUED' | 'SENT' | 'RESPONDED' | 'CLOSED' | 'BOUNCED';

interface RequestRow {
  id: string;
  partnerName: string;
  partnerEmail: string;
  accountNumber: string | null;
  expectedBalance: unknown;
  currency: string;
  status: string;
  sentAt: Date | string | null;
  respondedAt: Date | string | null;
  response: unknown | null;
}

interface Props {
  campaignId: string;
  requests: RequestRow[];
}

// ── Status config ─────────────────────────────────────────────────────────────

const requestStatusConfig: Record<
  RequestStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' }
> = {
  DRAFT:     { label: 'Entwurf',            variant: 'secondary' },
  QUEUED:    { label: 'In Warteschlange',   variant: 'warning' },
  SENT:      { label: 'Versendet',          variant: 'default' },
  RESPONDED: { label: 'Beantwortet',        variant: 'success' },
  CLOSED:    { label: 'Geschlossen',        variant: 'secondary' },
  BOUNCED:   { label: 'Unzustellbar',       variant: 'destructive' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: unknown, currency: string): string {
  const num =
    typeof amount === 'object' && amount !== null && 'toNumber' in amount
      ? (amount as { toNumber: () => number }).toNumber()
      : Number(amount);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(num);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RequestsTable({ campaignId, requests }: Props) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selectedRequest = selectedId
    ? requests.find((r) => r.id === selectedId) ?? null
    : null;

  function handleRowClick(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  if (requests.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <Mail className="h-8 w-8 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-1">
            Noch keine Partner hinzugefügt
          </p>
          <p className="text-xs text-slate-400">
            Fügen Sie Partner einzeln hinzu oder importieren Sie eine CSV-Datei.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                  Partner
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                  E-Mail
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">
                  Konto
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                  Saldo
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Versendet
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Geantwortet
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => {
                const reqStatus = requestStatusConfig[req.status as RequestStatus] ?? {
                  label: req.status,
                  variant: 'outline' as const,
                };
                const isSelected = req.id === selectedId;

                return (
                  <tr
                    key={req.id}
                    onClick={() => handleRowClick(req.id)}
                    className={`transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-blue-50 hover:bg-blue-50'
                        : 'hover:bg-slate-50'
                    }`}
                    title="Klicken für Audit-Log"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {req.partnerName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                      {req.partnerEmail}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {req.accountNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-800 tabular-nums">
                      {formatCurrency(req.expectedBalance, req.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={reqStatus.variant}>{reqStatus.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {formatDate(req.sentAt)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {req.status === 'RESPONDED' && req.response ? (
                        <span className="text-green-700 font-medium">
                          {formatDate(req.respondedAt)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit log panel */}
      {selectedRequest && (
        <RequestAuditLog
          campaignId={campaignId}
          requestId={selectedRequest.id}
          partnerName={selectedRequest.partnerName}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Hint */}
      {!selectedRequest && (
        <p className="text-xs text-slate-400 text-center pt-1">
          Zeile anklicken, um den Audit-Log anzuzeigen
        </p>
      )}
    </div>
  );
}
