import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
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
      <Header
        title="Saldenbestätigungen"
        description="Alle Bestätigungskampagnen im Überblick"
      />

      <div className="p-6 space-y-6">
        {/* Stats row */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Send className="h-5 w-5 text-blue-600" />}
              bg="bg-blue-50"
              label="Aktive Kampagnen"
              value={active.length}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              bg="bg-emerald-50"
              label="Abgeschlossen"
              value={finished.length}
            />
            <StatCard
              icon={<Clock className="h-5 w-5 text-amber-600" />}
              bg="bg-amber-50"
              label="Entwürfe"
              value={draft.length}
            />
          </div>
        )}

        {/* Empty state */}
        {campaigns.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <Mail className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Noch keine Kampagnen
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Öffnen Sie ein Engagement und legen Sie dort eine Saldenbestätigungs-Kampagne an.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active campaigns */}
        {active.length > 0 && (
          <Section title="Aktive Kampagnen" campaigns={active} />
        )}

        {/* Draft campaigns */}
        {draft.length > 0 && (
          <Section title="Entwürfe" campaigns={draft} />
        )}

        {/* Finished campaigns */}
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
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, campaigns }: { title: string; campaigns: Campaign[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{campaign.title}</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-500">{campaign.engagement.mandant.name}</span>
              </div>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-slate-500 truncate">{campaign.engagement.title}</span>
              <span className="text-slate-300 text-xs">·</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-500">
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
              <p className="text-sm font-semibold text-slate-900">{campaign.requests.length}</p>
              <p className="text-[10px] text-slate-400">Anfragen</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{sent}</p>
              <p className="text-[10px] text-slate-400">Versendet</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{rate} %</p>
              <p className="text-[10px] text-slate-400">Rücklauf</p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
