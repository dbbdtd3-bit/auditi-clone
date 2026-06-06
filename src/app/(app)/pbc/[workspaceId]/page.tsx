import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  Users,
  FileText,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { CreateListDialog } from '@/components/pbc/create-list-dialog';
import { AddMemberDialog } from '@/components/pbc/add-member-dialog';
import { canAccessWorkspace } from '@/lib/pbc-access';

interface PbcItemStatus {
  status: string;
}

const statusBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' }> = {
  OPEN: { label: 'Offen', variant: 'secondary' },
  UPLOADED: { label: 'Hochgeladen', variant: 'default' },
  ACCEPTED: { label: 'Akzeptiert', variant: 'success' },
  NEEDS_REVISION: { label: 'Überarbeitung', variant: 'warning' },
};

const pbcRoleLabel: Record<string, string> = {
  WP_LEAD: 'WP-Lead',
  WP_TEAM: 'WP-Team',
  MANDANT_ADMIN: 'Mandant Admin',
  MANDANT_UPLOADER: 'Mandant',
};

async function getWorkspace(workspaceId: string) {
  try {
    return await prisma.pbcWorkspace.findUnique({
      where: { id: workspaceId },
      include: {
        engagement: { include: { mandant: true } },
        requestLists: {
          include: {
            items: { select: { id: true, status: true } },
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        members: { include: { user: true } },
      },
    });
  } catch {
    return null;
  }
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) notFound();
  const isWp = user.role === 'WP_ADMIN' || user.role === 'WP_TEAM';
  if (!await canAccessWorkspace(user.id, isWp, workspaceId)) notFound();

  const workspace = await getWorkspace(workspaceId);

  if (!workspace) notFound();

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'PBC', href: '/pbc' },
        { label: workspace.engagement.title },
      ]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">{workspace.engagement.title}</h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            {workspace.engagement.mandant.name} · {workspace.engagement.fiscalYear} ·{' '}
            <Link href={`/engagements/${workspace.engagement.id}`} className="text-dataly-blue hover:underline">
              Zum Engagement
            </Link>
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Request Lists */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
              Anforderungslisten ({workspace.requestLists.length})
            </h2>
            {isWp && <CreateListDialog workspaceId={workspaceId} />}
          </div>

          {workspace.requestLists.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-8 w-8 text-dataly-muted mb-3" />
                <p className="text-sm text-dataly-slate">Noch keine Listen vorhanden.</p>
                <p className="text-xs text-dataly-muted mt-1">
                  Erstellen Sie eine Anforderungsliste mit dem Button oben rechts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {workspace.requestLists.map((list) => {
                const items = list.items as PbcItemStatus[];
                const openCount = items.filter((i) => i.status === 'OPEN').length;
                const uploadedCount = items.filter((i) => i.status === 'UPLOADED').length;
                const acceptedCount = items.filter((i) => i.status === 'ACCEPTED').length;
                const revisionCount = items.filter((i) => i.status === 'NEEDS_REVISION').length;

                return (
                  <Link key={list.id} href={`/pbc/${workspaceId}/lists/${list.id}`}>
                    <Card className="hover:border-dataly-line-strong transition-colors cursor-pointer">
                      <CardContent className="flex items-center gap-4 py-3.5 px-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dataly-surface-subtle">
                          <FileText className="h-4 w-4 text-dataly-slate" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-dataly-ink truncate block">{list.title}</span>
                          <p className="text-xs text-dataly-muted mt-0.5">
                            {list._count.items} {list._count.items === 1 ? 'Anforderung' : 'Anforderungen'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {openCount > 0 && <Badge variant="secondary">{openCount} Offen</Badge>}
                          {uploadedCount > 0 && <Badge variant="default">{uploadedCount} Hochgeladen</Badge>}
                          {acceptedCount > 0 && <Badge variant="success">{acceptedCount} Akzeptiert</Badge>}
                          {revisionCount > 0 && <Badge variant="warning">{revisionCount} Überarbeitung</Badge>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-dataly-muted shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
              Mitglieder ({workspace.members.length})
            </h2>
            {isWp && <AddMemberDialog workspaceId={workspaceId} />}
          </div>

          {workspace.members.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-dataly-muted mb-3" />
                <p className="text-sm text-dataly-slate">Noch keine Mitglieder eingeladen.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {workspace.members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dataly-navy text-white text-xs font-semibold">
                      {member.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dataly-ink truncate">{member.user.name}</p>
                      <p className="text-xs text-dataly-muted truncate">{member.user.email}</p>
                    </div>
                    <Badge variant="secondary">
                      {pbcRoleLabel[member.role] || member.role}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
