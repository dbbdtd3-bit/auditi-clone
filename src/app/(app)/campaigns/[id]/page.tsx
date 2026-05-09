import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Calendar, Users } from 'lucide-react';
import Link from 'next/link';
import { CampaignActions } from '@/components/sba/campaign-actions';
import { AddRequestDialog } from '@/components/sba/add-request-dialog';
import { ImportCsvDialog } from '@/components/sba/import-csv-dialog';
import { RequestsTable } from '@/components/sba/requests-table';

// ── Types ────────────────────────────────────────────────────────────────────

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

          <RequestsTable campaignId={id} requests={campaign.requests} />
        </div>
      </div>
    </div>
  );
}
