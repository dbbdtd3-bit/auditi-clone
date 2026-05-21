import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Building2, Calendar } from 'lucide-react';
import Link from 'next/link';
import { CreateEngagementDialog } from '@/components/engagements/create-engagement-dialog';

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

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];

export default async function EngagementsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? '';
  if (!WP_ROLES.includes(role)) redirect('/dashboard');

  const engagements = await getEngagements();

  const active = engagements.filter((e) => e.status === 'ACTIVE');
  const others = engagements.filter((e) => e.status !== 'ACTIVE');

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Engagements' }]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">Engagements</h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            {engagements.length} {engagements.length === 1 ? 'Engagement' : 'Engagements'} gesamt
            {active.length > 0 && `, davon ${active.length} aktiv`}
          </p>
        </div>
        <CreateEngagementDialog />
      </div>

      <div className="p-6 space-y-4">
        {engagements.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-dataly-surface-subtle mb-4">
                <Briefcase className="h-7 w-7 text-dataly-muted" />
              </div>
              <h3 className="text-base font-semibold text-dataly-ink mb-1">
                Noch keine Engagements angelegt
              </h3>
              <p className="text-sm text-dataly-slate max-w-sm mb-4">
                Erstellen Sie zunächst einen Mandanten und legen Sie dann ein Engagement für den Prüfungsauftrag an.
              </p>
              <CreateEngagementDialog />
            </CardContent>
          </Card>
        )}

        {active.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
              Aktive Engagements
            </h2>
            {active.map((e) => (
              <EngagementCard key={e.id} engagement={e} />
            ))}
          </div>
        )}

        {others.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
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
    <Link href={`/engagements/${engagement.id}`}>
      <Card className="hover:border-dataly-line-strong transition-colors cursor-pointer">
        <CardContent className="flex items-center gap-4 py-3.5 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dataly-success-soft">
            <Briefcase className="h-4 w-4 text-dataly-success" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-dataly-ink truncate block">{engagement.title}</span>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-dataly-muted" />
                <span className="text-xs text-dataly-slate">{engagement.mandant.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-dataly-muted" />
                <span className="text-xs text-dataly-slate">{engagement.fiscalYear}</span>
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
    </Link>
  );
}
