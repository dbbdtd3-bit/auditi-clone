import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Building2,
  Calendar,
  FolderOpen,
  ArrowLeft,
  ExternalLink,
  Mail,
} from 'lucide-react';
import Link from 'next/link';
import { CreateCampaignDialog } from '@/components/sba/create-campaign-dialog';

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

  const status = statusConfig[engagement.status] || { label: engagement.status, variant: 'outline' as const };

  return (
    <div>
      <Header title={engagement.title} description="Engagement-Details" />

      <div className="p-6 space-y-6">
        {/* Back */}
        <div className="flex items-center">
          <Link
            href="/engagements"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Engagements
          </Link>
        </div>

        {/* Engagement Card */}
        <Card>
          <CardContent className="py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <Briefcase className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{engagement.title}</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <Link
                      href={`/mandanten/${engagement.mandantId}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {engagement.mandant.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700">
                      Geschäftsjahr {engagement.fiscalYear}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {engagementTypeLabel[engagement.type] || engagement.type}
                  </Badge>
                  <Badge variant={status.variant}>{status.label}</Badge>
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
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Dokumentenaustausch (PBC)
          </h2>

          {engagement.pbcWorkspace ? (
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                  <FolderOpen className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">PBC-Workspace</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {engagement.pbcWorkspace._count.requestLists}{' '}
                      {engagement.pbcWorkspace._count.requestLists === 1 ? 'Liste' : 'Listen'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {engagement.pbcWorkspace._count.members}{' '}
                      {engagement.pbcWorkspace._count.members === 1 ? 'Mitglied' : 'Mitglieder'}
                    </span>
                  </div>
                </div>
                <Button asChild className="bg-blue-700 hover:bg-blue-800 shrink-0">
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
                <FolderOpen className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Kein PBC-Workspace vorhanden.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* SBA - Saldenbestätigungen */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Saldenbestätigungen (SBA)
            </h2>
            <CreateCampaignDialog engagementId={engagement.id} />
          </div>

          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Mail className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600 mb-1">
                  Noch keine SBA-Kampagnen vorhanden
                </p>
                <p className="text-xs text-slate-400">
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
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {campaign.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-500">
                            Stichtag:{' '}
                            {new Date(campaign.balanceDate).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-xs text-slate-500">
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
