import { prisma } from '@/lib/db';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus, Building2, Calendar } from 'lucide-react';

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

async function getEngagements() {
  try {
    return await prisma.engagement.findMany({
      include: {
        mandant: true,
        _count: {
          select: { campaigns: true },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  } catch {
    return [];
  }
}

export default async function EngagementsPage() {
  const engagements = await getEngagements();

  const active = engagements.filter((e) => e.status === 'ACTIVE');
  const others = engagements.filter((e) => e.status !== 'ACTIVE');

  return (
    <div>
      <Header
        title="Engagements"
        description="Prüfungsaufträge und Mandate verwalten"
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {engagements.length} {engagements.length === 1 ? 'Engagement' : 'Engagements'} gesamt
            {active.length > 0 && `, davon ${active.length} aktiv`}
          </p>
          <Button className="bg-blue-700 hover:bg-blue-800" disabled>
            <Plus className="h-4 w-4" />
            Engagement anlegen
          </Button>
        </div>

        {/* Empty State */}
        {engagements.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <Briefcase className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Noch keine Engagements
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Erstellen Sie zunächst einen Mandanten und legen Sie dann ein Engagement für den Prüfungsauftrag an.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active */}
        {active.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Aktive Engagements
            </h2>
            {active.map((e) => (
              <EngagementCard key={e.id} engagement={e} />
            ))}
          </div>
        )}

        {/* Others */}
        {others.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Weitere
            </h2>
            {others.map((e) => (
              <EngagementCard key={e.id} engagement={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EngagementCard({
  engagement,
}: {
  engagement: {
    id: string;
    title: string;
    fiscalYear: number;
    type: string;
    status: string;
    mandant: { name: string };
    _count: { campaigns: number };
  };
}) {
  const status = statusConfig[engagement.status] || { label: engagement.status, variant: 'outline' as const };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
          <Briefcase className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{engagement.title}</h3>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-500">{engagement.mandant.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-500">{engagement.fiscalYear}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary">
            {engagementTypeLabel[engagement.type] || engagement.type}
          </Badge>
          <Badge variant={status.variant}>
            {status.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
