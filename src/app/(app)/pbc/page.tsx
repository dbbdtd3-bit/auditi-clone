import { prisma } from '@/lib/db';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Building2, Briefcase } from 'lucide-react';
import Link from 'next/link';

async function getWorkspaces() {
  try {
    return await prisma.pbcWorkspace.findMany({
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
  const workspaces = await getWorkspaces();

  return (
    <div>
      <Header
        title="Dokumentenaustausch (PBC)"
        description="Prepared-by-Client Workspaces und Anforderungslisten"
      />

      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-500">
          {workspaces.length} {workspaces.length === 1 ? 'Workspace' : 'Workspaces'} gesamt
        </p>

        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <FolderOpen className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Noch keine PBC-Workspaces
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                PBC-Workspaces werden automatisch beim Anlegen eines Engagements erstellt.
                Erstellen Sie zuerst ein Engagement.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {workspaces.map((ws) => (
              <Link key={ws.id} href={`/pbc/${ws.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                      <FolderOpen className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {ws.engagement.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {ws.engagement.mandant.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {ws.engagement.fiscalYear}
                          </span>
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
