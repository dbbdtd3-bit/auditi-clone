import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Building2, Calendar, CheckCircle2, Clock, Send } from 'lucide-react';
import Link from 'next/link';

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];

const campaignStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' }> = {
  DRAFT:     { label: 'Entwurf',       variant: 'secondary' },
  ACTIVE:    { label: 'Aktiv',         variant: 'success' },
  COMPLETED: { label: 'Abgeschlossen', variant: 'outline' },
  ARCHIVED:  { label: 'Archiviert',    variant: 'outline' },
};

async function getCampaigns() {
  try {
    return await prisma.confirmationCampaign.findMany({
      include: {
        engagement: { include: { mandant: true } },
        requests: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return [];
  }
}

type Campaign = Awaited<ReturnType<typeof getCampaigns>>[number];

function responseRate(requests: { status: string }[]): number {
  if (requests.length === 0) return 0;
  return Math.round(
    (requests.filter((r) => r.status === 'RESPONDED').length / requests.length) * 100
  );
}

function sentCount(requests: { status: string }[]): number {
  return requests.filter((r) => ['SENT', 'RESPONDED', 'CLOSED'].includes(r.status)).length;
}

export default async function SbaPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? '';
  if (!WP_ROLES.includes(role)) redirect('/dashboard');

  const campaigns = await getCampaigns();

  const active    = campaigns.filter((c) => c.status === 'ACTIVE');
  const draft     = campaigns.filter((c) => c.status === 'DRAFT');
  const finished  = campaigns.filter((c) => c.status === 'COMPLETED' || c.status === 'ARCHIVED');

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Saldenbestätigungen' }]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">Saldenbestätigungen</h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            Alle Bestätigungskampagnen im Überblick
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {campaigns.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Send className="h-5 w-5 text-dataly-blue" />}
              bg="bg-dataly-info-soft"
              label="Aktive Kampagnen"
              value={active.length}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-dataly-success" />}
              bg="bg-dataly-success-soft"
              label="Abgeschlossen"
              value={finished.length}
            />
            <StatCard
              icon={<Clock className="h-5 w-5 text-dataly-warning" />}
              bg="bg-dataly-warning-soft"
              label="Entwürfe"
              value={draft.length}
            />
          </div>
        )}

        {campaigns.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-dataly-surface-subtle mb-4">
                <Mail className="h-7 w-7 text-dataly-muted" />
              </div>
              <h3 className="text-base font-semibold text-dataly-ink mb-1">
                Noch keine Kampagnen angelegt
              </h3>
              <p className="text-sm text-dataly-slate max-w-sm">
                Öffnen Sie ein Engagement und legen Sie dort eine Saldenbestätigungs-Kampagne an.
              </p>
            </CardContent>
          </Card>
        )}

        {active.length > 0 && (
          <Section title="Aktive Kampagnen" campaigns={active} />
        )}
        {draft.length > 0 && (
          <Section title="Entwürfe" campaigns={draft} />
        )}
        {finished.length > 0 && (
          <Section title="Abgeschlossen / Archiviert" campaigns={finished} />
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  bg,
  label,
  value,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-dataly-ink">{value}</p>
          <p className="text-xs text-dataly-slate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, campaigns }: { title: string; campaigns: Campaign[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
        {title}
      </h2>
      {campaigns.map((c) => (
        <CampaignRow key={c.id} campaign={c} />
      ))}
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const status = campaignStatusConfig[campaign.status] ?? { label: campaign.status, variant: 'outline' as const };
  const rate = responseRate(campaign.requests);
  const sent = sentCount(campaign.requests);

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="hover:border-dataly-line-strong transition-colors cursor-pointer">
        <CardContent className="flex items-center gap-4 py-3.5 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dataly-info-soft">
            <Mail className="h-4 w-4 text-dataly-blue" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-dataly-ink truncate block">{campaign.title}</span>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-dataly-muted" />
                <span className="text-xs text-dataly-slate">{campaign.engagement.mandant.name}</span>
              </div>
              <span className="text-dataly-line text-xs">·</span>
              <span className="text-xs text-dataly-slate truncate">{campaign.engagement.title}</span>
              <span className="text-dataly-line text-xs">·</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-dataly-muted" />
                <span className="text-xs text-dataly-slate">
                  {new Date(campaign.balanceDate).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-right">
            <div>
              <p className="text-sm font-semibold tabular-nums text-dataly-ink">{campaign.requests.length}</p>
              <p className="text-[10px] text-dataly-muted">Anfragen</p>
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-dataly-ink">{sent}</p>
              <p className="text-[10px] text-dataly-muted">Versendet</p>
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-dataly-ink">{rate} %</p>
              <p className="text-[10px] text-dataly-muted">Rücklauf</p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
