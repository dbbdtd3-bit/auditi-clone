import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, Users } from 'lucide-react';
import { CampaignActions } from '@/components/sba/campaign-actions';
import { AddRequestDialog } from '@/components/sba/add-request-dialog';
import { ImportCsvDialog } from '@/components/sba/import-csv-dialog';
import { RequestsTable } from '@/components/sba/requests-table';
import { CampaignNotificationSettings } from '@/components/sba/campaign-notification-settings';
import { canViewMandant } from '@/lib/mandant-permissions';

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
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) notFound();
  if (!await canViewMandant({ id: user.id, role: user.role }, campaign.engagement.mandantId)) {
    notFound();
  }

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
      <Breadcrumbs items={[
        { label: 'SBA', href: '/sba' },
        { label: campaign.engagement.title, href: `/engagements/${campaign.engagementId}` },
        { label: campaign.title },
      ]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">{campaign.title}</h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            {campaign.engagement.mandant.name} · {campaign.engagement.title}
          </p>
        </div>
        <Badge variant={campStatus.variant}>{campStatus.label}</Badge>
      </div>

      <div className="p-6 space-y-6">
        {/* Campaign meta */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-6 text-sm text-dataly-slate">
              <div className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-dataly-muted" />
                <span className="font-medium text-dataly-ink">{totalRequests}</span>
                <span>Partner</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-dataly-muted" />
                <span className="font-medium text-dataly-ink">{sentRequests}</span>
                <span>versendet</span>
                <span className="text-dataly-muted">·</span>
                <span className="font-medium text-dataly-ink">{respondedRequests}</span>
                <span>beantwortet</span>
              </div>
              {campaign.balanceDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-dataly-muted" />
                  <span>Stichtag: {formatDate(campaign.balanceDate)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <CampaignActions
          campaignId={id}
          status={campaign.status}
          draftCount={draftCount}
          sentCount={sentOnlyCount}
        />
        <div className="flex justify-end">
          <CampaignNotificationSettings campaignId={id} />
        </div>

        {/* Request List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
              Bestätigungsanfragen ({totalRequests})
            </h2>
            <div className="flex gap-2">
              <AddRequestDialog campaignId={id} />
              <ImportCsvDialog campaignId={id} />
            </div>
          </div>

          <RequestsTable
            campaignId={id}
            campaignStatus={campaign.status}
            requests={campaign.requests}
          />
        </div>
      </div>
    </div>
  );
}
