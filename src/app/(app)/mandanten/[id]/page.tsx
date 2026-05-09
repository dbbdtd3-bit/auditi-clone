import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Briefcase, MapPin, Hash, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { EditMandantDialog } from '@/components/mandanten/edit-mandant-dialog';

interface MandantAddress {
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
}

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

async function getMandant(id: string) {
  try {
    return await prisma.mandant.findUnique({
      where: { id },
      include: {
        engagements: {
          include: { mandant: true },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        },
        users: true,
      },
    });
  } catch {
    return null;
  }
}

export default async function MandantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mandant = await getMandant(id);

  if (!mandant) notFound();

  const address = mandant.address as MandantAddress | null;

  return (
    <div>
      <Header title={mandant.name} description="Mandanten-Details" />

      <div className="p-6 space-y-6">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/mandanten"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Mandanten
          </Link>
          <EditMandantDialog
            mandant={{
              id: mandant.id,
              name: mandant.name,
              legalName: mandant.legalName,
              taxId: mandant.taxId,
              address: address,
            }}
          />
        </div>

        {/* Mandant Detail Card */}
        <Card>
          <CardContent className="py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{mandant.name}</h2>
                  {mandant.legalName && mandant.legalName !== mandant.name && (
                    <p className="text-sm text-slate-500">{mandant.legalName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {address?.city && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="text-sm text-slate-700">
                        {address.street && <p>{address.street}</p>}
                        <p>
                          {address.zip ? `${address.zip} ` : ''}
                          {address.city}
                          {address.country ? `, ${address.country}` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {mandant.taxId && (
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700">{mandant.taxId}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {mandant.engagements.length} {mandant.engagements.length === 1 ? 'Engagement' : 'Engagements'}
                  </Badge>
                  <Badge variant="outline">
                    {mandant.users.length} {mandant.users.length === 1 ? 'Nutzer' : 'Nutzer'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagements */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Engagements
          </h2>

          {mandant.engagements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Briefcase className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Noch keine Engagements vorhanden.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Erstellen Sie ein Engagement über die Engagements-Seite.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {mandant.engagements.map((e) => {
                const status = statusConfig[e.status] || { label: e.status, variant: 'outline' as const };
                return (
                  <Link key={e.id} href={`/engagements/${e.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                          <Briefcase className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{e.title}</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-500">{e.fiscalYear}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary">
                            {engagementTypeLabel[e.type] || e.type}
                          </Badge>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
