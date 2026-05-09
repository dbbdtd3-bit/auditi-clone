import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Calendar, Users } from 'lucide-react';
import Link from 'next/link';
import { CampaignActions } from '@/components/sba/campaign-actions';
import { AddRequestDialog } from '@/components/sba/add-request-dialog';
import { ImportCsvDialog } from '@/components/sba/import-csv-dialog';

// ── Types ────────────────────────────────────────────────────────────────────

type RequestStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'SENT'
  | 'RESPONDED'
  | 'CLOSED'
  | 'BOUNCED';

type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

// ── Status configs ───────────────────────────────────────────────────────────

const campaignStatusConfig: Record<
  CampaignStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
  }
> = {
  DRAFT: { label: 'Entwurf', variant: 'secondary' },
  ACTIVE: { label: 'Aktiv', variant: 'default' },
  COMPLETED: { label: 'Abgeschlossen', variant: 'success' },
  ARCHIVED: { label: 'Archiviert', variant: 'outline' },
};

const requestStatusConfig: Record<
  RequestStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
  }
> = {
  DRAFT: { label: 'Entwurf', variant: 'secondary' },
  QUEUED: { label: 'In Warteschlange', variant: 'warning' },
  SENT: { label: 'Versendet', variant: 'default' },
  RESPONDED: { label: 'Beantwortet', variant: 'success' },
  CLOSED: { label: 'Geschlossen', variant: 'secondary' },
  BOUNCED: { label: 'Unzustellbar', variant: 'destructive' },
};

// ── Data fetching ────────────────────────────────────────────────────────────

async function getCampaign(id: string) {
  try {
    return await prisma.confirmationCampaign.findUnique({
      where: { id },
      include: {
        engagement: { include: { mandant: true } },
        requests: {
          include: { response: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: unknown, currency: string): string {
  const num = typeof amount === 'object' && amount !== null && 'toNumber' in amount
    ? (amount as { toNumber: () => number }).toNumber()
    : Number(amount);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(num);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);

  if (!campaign) notFound();

  const campStatus = campaignStatusConfig[campaign.status as CampaignStatus] ?? {
    label: campaign.status,
    variant: 'outline' as const,
  };

  const totalRequests = campaign.requests.length;
  const sentRequests = campaign.requests.filter(
    (r) => r.status === 'SENT' || r.status === 'RESPONDED' || r.status === 'QUEUED'
  ).length;
  const respondedRequests = campaign.requests.filter(
    (r) => r.status === 'RESPONDED'
  ).length;
  const draftCount = campaign.requests.filter((r) => r.status === 'DRAFT').length;
  const sentOnlyCount = campaign.requests.filter((r) => r.status === 'SENT').length;

  return (
    <div>
      <Header
        title={campaign.title}
        description={`${campaign.engagement.mandant.name} · ${campaign.engagement.title}`}
      />

      <div className="p-6 space-y-6">
        {/* Back */}
        <div className="flex items-center">
          <Link
            href={`/engagements/${campaign.engagementId}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Engagement
          </Link>
        </div>

        {/* Campaign Info Card + Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Card className="flex-1">
            <CardContent className="py-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {campaign.title}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {campaign.engagement.mandant.name} &middot;{' '}
                      {campaign.engagement.title}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>Stichtag: {formatDate(campaign.balanceDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>
                        {totalRequests} Partner · {sentRequests} versendet ·{' '}
                        {respondedRequests} beantwortet
                      </span>
                    </div>
                  </div>

                  <div>
                    <Badge variant={campStatus.variant}>{campStatus.label}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <CampaignActions
          campaignId={id}
          status={campaign.status}
          draftCount={draftCount}
          sentCount={sentOnlyCount}
        />

        {/* Request List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Bestätigungsanfragen ({totalRequests})
            </h2>
            <div className="flex gap-2">
              <AddRequestDialog campaignId={id} />
              <ImportCsvDialog campaignId={id} />
            </div>
          </div>

          {totalRequests === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Mail className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600 mb-1">
                  Noch keine Partner hinzugefügt
                </p>
                <p className="text-xs text-slate-400">
                  Fügen Sie Partner einzeln hinzu oder importieren Sie eine CSV-Datei.
                </p>
              </CardContent>
            </Card>
          ) : (
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
                    {campaign.requests.map((req) => {
                      const reqStatus =
                        requestStatusConfig[req.status as RequestStatus] ?? {
                          label: req.status,
                          variant: 'outline' as const,
                        };

                      return (
                        <tr
                          key={req.id}
                          className="hover:bg-slate-50 transition-colors"
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
                            <Badge variant={reqStatus.variant}>
                              {reqStatus.label}
                            </Badge>
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
          )}
        </div>
      </div>
    </div>
  );
}
