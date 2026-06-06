import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Building2,
  Calendar,
  FolderOpen,
  ExternalLink,
  Mail,
} from 'lucide-react';
import Link from 'next/link';
import { CreateCampaignDialog } from '@/components/sba/create-campaign-dialog';
import { canViewMandant } from '@/lib/mandant-permissions';

type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

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

const engagementTypeLabel: Record<string, string> = {
  JAHRESABSCHLUSS: 'Jahresabschluss',
  SONDERPRUEFUNG: 'Sonderprüfung',
  DUE_DILIGENCE: 'Due Diligence',
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' }> = {
  ACTIVE: { label: 'Aktiv', variant: 'success' },
  COMPLETED: { label: 'Abgeschlossen', variant: 'secondary' },
  ARCHIVED: { label: 'Archiviert', variant: 'outline' },
};

async function getEngagement(id: string) {
  try {
    return await prisma.engagement.findUnique({
      where: { id },
      include: {
        mandant: true,
        pbcWorkspace: {
          include: {
            _count: { select: { requestLists: true, members: true } },
          },
        },
        _count: { select: { campaigns: true } },
      },
    });
  } catch {
    return null;
  }
}

async function getCampaigns(engagementId: string) {
  try {
    return await prisma.confirmationCampaign.findMany({
      where: { engagementId },
      include: { _count: { select: { requests: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return [];
  }
}

export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [engagement, campaigns] = await Promise.all([
    getEngagement(id),
    getCampaigns(id),
  ]);

  if (!engagement) notFound();
  const session = await auth();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id) notFound();
  if (!await canViewMandant({ id: sessionUser.id, role: sessionUser.role }, engagement.mandantId)) {
    notFound();
  }
  const isWp = sessionUser.role === 'WP_ADMIN' || sessionUser.role === 'WP_TEAM';

  const status = statusConfig[engagement.status] || { label: engagement.status, variant: 'outline' as const };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Engagements', href: '/engagements' }, { label: engagement.title }]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">{engagement.title}</h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            {engagement.mandant.name} · GJ {engagement.fiscalYear}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="p-6 space-y-6">
        {/* Engagement meta */}
        <Card>
          <CardContent className="py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-dataly-success-soft">
                <Briefcase className="h-6 w-6 text-dataly-success" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-dataly-muted shrink-0" />
                    <Link
                      href={`/mandanten/${engagement.mandantId}`}
                      className="text-sm text-dataly-blue hover:underline"
                    >
                      {engagement.mandant.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-dataly-muted shrink-0" />
                    <span className="text-sm text-dataly-ink">
                      Geschäftsjahr {engagement.fiscalYear}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {engagementTypeLabel[engagement.type] || engagement.type}
                  </Badge>
                  {engagement._count.campaigns > 0 && (
                    <Badge variant="outline">
                      {engagement._count.campaigns}{' '}
                      {engagement._count.campaigns === 1 ? 'SBA-Kampagne' : 'SBA-Kampagnen'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PBC Workspace */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted mb-3">
            Dokumentenaustausch (PBC)
          </h2>

          {engagement.pbcWorkspace ? (
            <Card>
              <CardContent className="flex items-center gap-4 py-3.5 px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dataly-teal/10">
                  <FolderOpen className="h-4 w-4 text-dataly-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-dataly-ink">PBC-Workspace</span>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-dataly-slate">
                      {engagement.pbcWorkspace._count.requestLists}{' '}
                      {engagement.pbcWorkspace._count.requestLists === 1 ? 'Liste' : 'Listen'}
                    </span>
                    <span className="text-xs text-dataly-slate">
                      {engagement.pbcWorkspace._count.members}{' '}
                      {engagement.pbcWorkspace._count.members === 1 ? 'Mitglied' : 'Mitglieder'}
                    </span>
                  </div>
                </div>
                <Button asChild className="bg-dataly-navy hover:bg-dataly-blue shrink-0">
                  <Link href={`/pbc/${engagement.pbcWorkspace.id}`}>
                    <ExternalLink className="h-4 w-4" />
                    Zum PBC-Workspace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <FolderOpen className="h-8 w-8 text-dataly-muted mb-3" />
                <p className="text-sm text-dataly-slate">Kein PBC-Workspace vorhanden.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* SBA */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
              Saldenbestätigungen (SBA)
            </h2>
            {isWp && <CreateCampaignDialog engagementId={engagement.id} />}
          </div>

          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Mail className="h-8 w-8 text-dataly-muted mb-3" />
                <p className="text-sm font-medium text-dataly-ink mb-1">
                  Noch keine SBA-Kampagnen vorhanden
                </p>
                <p className="text-xs text-dataly-slate">
                  Erstellen Sie eine Kampagne, um Saldenbestätigungen zu versenden.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => {
                const campStatus =
                  campaignStatusConfig[campaign.status as CampaignStatus] ?? {
                    label: campaign.status,
                    variant: 'outline' as const,
                  };
                return (
                  <Card key={campaign.id}>
                    <CardContent className="flex items-center gap-4 py-3.5 px-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dataly-info-soft">
                        <Mail className="h-4 w-4 text-dataly-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-dataly-ink truncate block">
                          {campaign.title}
                        </span>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-dataly-slate">
                            Stichtag:{' '}
                            {new Date(campaign.balanceDate).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-xs text-dataly-slate">
                            {campaign._count.requests}{' '}
                            {campaign._count.requests === 1 ? 'Partner' : 'Partner'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={campStatus.variant}>{campStatus.label}</Badge>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/campaigns/${campaign.id}`}>
                            <ExternalLink className="h-4 w-4" />
                            Öffnen
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
