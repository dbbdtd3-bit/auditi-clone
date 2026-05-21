import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EngagementOverview } from '@/components/dashboard/engagement-overview';
import { CampaignKpis } from '@/components/dashboard/campaign-kpis';
import { ResponseRateChart } from '@/components/dashboard/response-rate-chart';
import {
  Building2,
  Briefcase,
  Mail,
  FolderOpen,
  BarChart3,
} from 'lucide-react';

async function getDashboardData() {
  try {
    const [
      mandantenCount,
      engagementStats,
      requestStats,
      pbcStats,
      recentEngagements,
      campaignKpisRaw,
    ] = await Promise.all([
      prisma.mandant.count(),

      prisma.engagement.groupBy({ by: ['status'], _count: { id: true } }),

      prisma.confirmationRequest.groupBy({ by: ['status'], _count: { id: true } }),

      prisma.pbcRequestItem.groupBy({ by: ['status'], _count: { id: true } }),

      prisma.engagement.findMany({
        where: { status: 'ACTIVE' },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          mandant: { select: { name: true } },
          _count: { select: { campaigns: true } },
        },
      }),

      prisma.confirmationCampaign.findMany({
        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          engagement: {
            select: {
              title: true,
              mandant: { select: { name: true } },
            },
          },
          requests: {
            select: {
              status: true,
              response: { select: { hasDifference: true } },
            },
          },
        },
      }),
    ]);

    const toMap = (rows: { status: string; _count: { id: number } }[]) =>
      Object.fromEntries(rows.map((r) => [r.status, r._count.id]));

    const engMap = toMap(engagementStats);
    const reqMap = toMap(requestStats);
    const pbcMap = toMap(pbcStats);

    const campaignKpis = campaignKpisRaw.map((c) => {
      const total = c.requests.length;
      const sent = c.requests.filter((r) =>
        ['SENT', 'RESPONDED', 'CLOSED'].includes(r.status),
      ).length;
      const responded = c.requests.filter((r) =>
        ['RESPONDED', 'CLOSED'].includes(r.status),
      ).length;
      const hasDifferences = c.requests.filter((r) => r.response?.hasDifference).length;
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        engagementTitle: c.engagement.title,
        mandantName: c.engagement.mandant.name,
        total,
        sent,
        responded,
        hasDifferences,
        responseRate: sent > 0 ? Math.round((responded / sent) * 100) : 0,
      };
    });

    return {
      mandantenCount,
      activeEngagements: engMap['ACTIVE'] ?? 0,
      offeneSBA: reqMap['SENT'] ?? 0,
      offenePBC: pbcMap['OPEN'] ?? 0,
      recentEngagements,
      campaignKpis,
    };
  } catch {
    return {
      mandantenCount: 0,
      activeEngagements: 0,
      offeneSBA: 0,
      offenePBC: 0,
      recentEngagements: [],
      campaignKpis: [],
    };
  }
}

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  iconBgClass: string;
}

function StatCard({ title, value, description, icon: Icon, iconClass, iconBgClass }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-dataly-slate">{title}</CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBgClass}`}>
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-dataly-ink">{value}</div>
        <p className="text-xs text-dataly-muted mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  const userName = (session?.user as { name?: string })?.name || 'Benutzer';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dashboard' }]} />

      {/* Page header */}
      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">
            {greeting}, {userName}
          </h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            Übersicht der aktuellen Prüfungsaktivitäten
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Aktive Mandanten"
            value={data.mandantenCount}
            description="Mandanten in der Datenbank"
            icon={Building2}
            iconClass="text-dataly-blue"
            iconBgClass="bg-dataly-info-soft"
          />
          <StatCard
            title="Aktive Engagements"
            value={data.activeEngagements}
            description="Laufende Prüfungsaufträge"
            icon={Briefcase}
            iconClass="text-dataly-success"
            iconBgClass="bg-dataly-success-soft"
          />
          <StatCard
            title="Offene Saldenbestätigungen"
            value={data.offeneSBA}
            description="Versandt, Antwort ausstehend"
            icon={Mail}
            iconClass="text-dataly-warning"
            iconBgClass="bg-dataly-warning-soft"
          />
          <StatCard
            title="Ausstehende PBC-Items"
            value={data.offenePBC}
            description="Dokumente noch nicht hochgeladen"
            icon={FolderOpen}
            iconClass="text-dataly-teal"
            iconBgClass="bg-dataly-teal/10"
          />
        </div>

        {/* Main Content: Engagement Overview + Campaign KPIs */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-dataly-muted" />
                <CardTitle className="text-sm font-semibold text-dataly-slate">
                  Aktive Engagements
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <EngagementOverview engagements={data.recentEngagements} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-dataly-muted" />
                <CardTitle className="text-sm font-semibold text-dataly-slate">
                  Kampagnen-KPIs
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CampaignKpis data={data.campaignKpis} />
            </CardContent>
          </Card>
        </div>

        {/* Response Rate Chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-dataly-muted" />
              <CardTitle className="text-sm font-semibold text-dataly-slate">
                Rücklaufquote nach Kampagne
              </CardTitle>
            </div>
            <p className="text-xs text-dataly-muted mt-0.5">
              Anteil der eingegangenen Antworten an den versandten Anfragen
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponseRateChart data={data.campaignKpis} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
