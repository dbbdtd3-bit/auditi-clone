import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PbcWorkspacesOverview } from '@/components/pbc/workspaces-overview';

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];

async function getWorkspaces(userId: string | undefined, isWp: boolean) {
  try {
    return await prisma.pbcWorkspace.findMany({
      where: isWp
        ? undefined
        : { members: { some: { userId: userId ?? '' } } },
      include: {
        engagement: {
          include: { mandant: true },
        },
        _count: { select: { requestLists: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return [];
  }
}

export default async function PbcPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const isWp = WP_ROLES.includes(user?.role ?? '');
  const workspaces = await getWorkspaces(user?.id, isWp);
  const workspaceItems = workspaces.map((workspace) => ({
    id: workspace.id,
    createdAt: workspace.createdAt.toISOString(),
    engagementTitle: workspace.engagement.title,
    fiscalYear: String(workspace.engagement.fiscalYear),
    mandantName: workspace.engagement.mandant.name,
    requestListCount: workspace._count.requestLists,
    memberCount: workspace._count.members,
  }));

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dokumentenaustausch' }]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">Dokumentenaustausch (PBC)</h1>
          <p className="mt-0.5 text-[13px] text-dataly-muted">
            {workspaces.length} {workspaces.length === 1 ? 'Workspace' : 'Workspaces'} gesamt
          </p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <PbcWorkspacesOverview workspaces={workspaceItems} />
      </div>
    </div>
  );
}
