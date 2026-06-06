import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { SbaCampaignsOverview } from '@/components/sba/campaigns-overview';
import { visibleCampaignWhere } from '@/lib/mandant-access';

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];

async function getCampaigns(user: { id: string; role?: string }) {
  try {
    return await prisma.confirmationCampaign.findMany({
      where: visibleCampaignWhere(user),
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

export default async function SbaPage() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  const role = sessionUser?.role ?? '';
  if (!WP_ROLES.includes(role)) redirect('/dashboard');

  const campaigns = await getCampaigns({ id: sessionUser?.id ?? '', role });
  const campaignItems = campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    status: campaign.status,
    balanceDate: campaign.balanceDate.toISOString(),
    createdAt: campaign.createdAt.toISOString(),
    engagementTitle: campaign.engagement.title,
    mandantName: campaign.engagement.mandant.name,
    requests: campaign.requests,
  }));

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Saldenbestätigungen' }]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">Saldenbestätigungen</h1>
          <p className="mt-0.5 text-[13px] text-dataly-muted">
            Alle Bestätigungskampagnen im Überblick
          </p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <SbaCampaignsOverview campaigns={campaignItems} />
      </div>
    </div>
  );
}
