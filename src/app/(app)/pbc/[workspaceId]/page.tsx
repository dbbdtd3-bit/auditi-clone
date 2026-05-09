import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  ArrowLeft,
  Users,
  FileText,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { CreateListDialog } from '@/components/pbc/create-list-dialog';
import { AddMemberDialog } from '@/components/pbc/add-member-dialog';

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
  const workspace = await getWorkspace(workspaceId);

  if (!workspace) notFound();

  return (
    <div>
      <Header
        title="PBC-Workspace"
        description={`${workspace.engagement.title} · ${workspace.engagement.mandant.name}`}
      />

      <div className="p-6 space-y-6">
        {/* Back */}
        <Link
          href="/pbc"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu PBC
        </Link>

        {/* Workspace Header Card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <FolderOpen className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{workspace.engagement.title}</h2>
                <p className="text-sm text-slate-500">
                  {workspace.engagement.mandant.name} · {workspace.engagement.fiscalYear}
                </p>
              </div>
              <div className="ml-auto">
                <Link
                  href={`/engagements/${workspace.engagement.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Zum Engagement
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Lists */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Anforderungslisten ({workspace.requestLists.length})
            </h2>
            <CreateListDialog workspaceId={workspaceId} />
          </div>

          {workspace.requestLists.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Noch keine Listen vorhanden.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Erstellen Sie eine Anforderungsliste mit dem Button oben rechts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {workspace.requestLists.map((list) => {
                const items = list.items as PbcItemStatus[];
                const openCount = items.filter((i) => i.status === 'OPEN').length;
                const uploadedCount = items.filter((i) => i.status === 'UPLOADED').length;
                const acceptedCount = items.filter((i) => i.status === 'ACCEPTED').length;
                const revisionCount = items.filter((i) => i.status === 'NEEDS_REVISION').length;

                return (
                  <Link
                    key={list.id}
                    href={`/pbc/${workspaceId}/lists/${list.id}`}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <FileText className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{list.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {list._count.items} {list._count.items === 1 ? 'Anforderung' : 'Anforderungen'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {openCount > 0 && (
                            <Badge variant="secondary">{openCount} Offen</Badge>
                          )}
                          {uploadedCount > 0 && (
                            <Badge variant="default">{uploadedCount} Hochgeladen</Badge>
                          )}
                          {acceptedCount > 0 && (
                            <Badge variant="success">{acceptedCount} Akzeptiert</Badge>
                          )}
                          {revisionCount > 0 && (
                            <Badge variant="warning">{revisionCount} Überarbeitung</Badge>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Mitglieder ({workspace.members.length})
            </h2>
            <AddMemberDialog workspaceId={workspaceId} />
          </div>

          {workspace.members.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Noch keine Mitglieder eingeladen.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {workspace.members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {member.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{member.user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{member.user.email}</p>
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
