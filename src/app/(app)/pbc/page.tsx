import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Building2, Briefcase } from 'lucide-react';
import Link from 'next/link';

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

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dokumentenaustausch' }]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">Dokumentenaustausch (PBC)</h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            {workspaces.length} {workspaces.length === 1 ? 'Workspace' : 'Workspaces'} gesamt
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-dataly-surface-subtle mb-4">
                <FolderOpen className="h-7 w-7 text-dataly-muted" />
              </div>
              <h3 className="text-base font-semibold text-dataly-ink mb-1">
                Noch keine PBC-Workspaces
              </h3>
              <p className="text-sm text-dataly-slate max-w-sm">
                PBC-Workspaces werden automatisch beim Anlegen eines Engagements erstellt.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {workspaces.map((ws) => (
              <Link key={ws.id} href={`/pbc/${ws.id}`}>
                <Card className="hover:border-dataly-line-strong transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-4 py-3.5 px-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dataly-teal/10">
                      <FolderOpen className="h-4 w-4 text-dataly-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-dataly-ink truncate block">
                        {ws.engagement.title}
                      </span>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-dataly-muted" />
                          <span className="text-xs text-dataly-slate">{ws.engagement.mandant.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-dataly-muted" />
                          <span className="text-xs text-dataly-slate">{ws.engagement.fiscalYear}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">
                        {ws._count.requestLists}{' '}
                        {ws._count.requestLists === 1 ? 'Liste' : 'Listen'}
                      </Badge>
                      <Badge variant="outline">
                        {ws._count.members}{' '}
                        {ws._count.members === 1 ? 'Mitglied' : 'Mitglieder'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
