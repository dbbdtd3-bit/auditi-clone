import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Briefcase,
  Mail,
  FolderOpen,
  TrendingUp,
} from 'lucide-react';

async function getStats() {
  try {
    const [mandanten, engagements, offeneSBA, offenePBC] = await Promise.all([
      prisma.mandant.count(),
      prisma.engagement.count({ where: { status: 'ACTIVE' } }),
      prisma.confirmationRequest.count({ where: { status: 'SENT' } }),
      prisma.pbcRequestItem.count({ where: { status: 'OPEN' } }),
    ]);
    return { mandanten, engagements, offeneSBA, offenePBC };
  } catch {
    return { mandanten: 0, engagements: 0, offeneSBA: 0, offenePBC: 0 };
  }
}

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

function StatCard({ title, value, description, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getStats();

  const userName = (session?.user as { name?: string })?.name || 'Benutzer';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <div>
      <Header title="Dashboard" />

      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {greeting}, {userName}
            </h2>
            <p className="text-sm text-slate-500">
              Hier ist eine Übersicht Ihrer aktuellen Prüfungsaktivitäten.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Aktive Mandanten"
            value={stats.mandanten}
            description="Mandanten in der Datenbank"
            icon={Building2}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          <StatCard
            title="Aktive Engagements"
            value={stats.engagements}
            description="Laufende Prüfungsaufträge"
            icon={Briefcase}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-100"
          />
          <StatCard
            title="Offene Saldenbestätigungen"
            value={stats.offeneSBA}
            description="Versandt, Antwort ausstehend"
            icon={Mail}
            iconColor="text-amber-600"
            iconBg="bg-amber-100"
          />
          <StatCard
            title="Ausstehende PBC-Items"
            value={stats.offenePBC}
            description="Dokumente noch nicht hochgeladen"
            icon={FolderOpen}
            iconColor="text-violet-600"
            iconBg="bg-violet-100"
          />
        </div>

        {/* Coming soon modules */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-dashed border-slate-300 bg-slate-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-slate-400" />
                <CardTitle className="text-sm font-medium text-slate-500">
                  Saldenbestätigungen (SBA)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Digitale Bestätigungsanfragen an Geschäftspartner versenden, verfolgen und auswerten.
              </p>
              <span className="mt-3 inline-block text-xs font-medium text-slate-400 bg-slate-200 px-2.5 py-1 rounded-full">
                In Entwicklung
              </span>
            </CardContent>
          </Card>

          <Card className="border-dashed border-slate-300 bg-slate-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-slate-400" />
                <CardTitle className="text-sm font-medium text-slate-500">
                  Dokumentenaustausch (PBC)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Prepared-by-Client Listen erstellen, Dokumente anfordern und den Upload-Status überwachen.
              </p>
              <span className="mt-3 inline-block text-xs font-medium text-slate-400 bg-slate-200 px-2.5 py-1 rounded-full">
                In Entwicklung
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
