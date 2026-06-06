import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin } from 'lucide-react';
import Link from 'next/link';
import { CreateMandantDialog } from '@/components/mandanten/create-mandant-dialog';
import { visibleMandantWhere } from '@/lib/mandant-access';

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];

async function getMandanten(user: { id: string; role?: string }) {
  try {
    return await prisma.mandant.findMany({
      where: visibleMandantWhere(user),
      include: {
        _count: {
          select: { engagements: true, userLinks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return [];
  }
}

export default async function MandantenPage() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  const role = sessionUser?.role ?? '';
  if (!WP_ROLES.includes(role)) redirect('/dashboard');

  const mandanten = await getMandanten({ id: sessionUser?.id ?? '', role });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Mandanten' }]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">Mandanten</h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            Alle betreuten Mandate und Gesellschaften
          </p>
        </div>
        <CreateMandantDialog />
      </div>

      <div className="p-6 space-y-4">
        {mandanten.length > 0 && (
          <p className="text-sm text-dataly-slate">
            {mandanten.length} {mandanten.length === 1 ? 'Mandant' : 'Mandanten'} gesamt
          </p>
        )}

        {mandanten.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-dataly-surface-subtle mb-4">
                <Building2 className="h-7 w-7 text-dataly-muted" />
              </div>
              <h3 className="text-base font-semibold text-dataly-ink mb-1">
                Noch keine Mandanten angelegt
              </h3>
              <p className="text-sm text-dataly-slate max-w-sm mb-4">
                Legen Sie Ihren ersten Mandanten an, um Engagements und Prüfungsaufträge zu verwalten.
              </p>
              <CreateMandantDialog />
            </CardContent>
          </Card>
        )}

        {mandanten.length > 0 && (
          <div className="grid gap-2">
            {mandanten.map((m) => {
              const address = m.address as {
                city?: string;
                street?: string;
                zip?: string;
              } | null;

              return (
                <Link key={m.id} href={`/mandanten/${m.id}`}>
                  <Card className="hover:border-dataly-line-strong transition-colors cursor-pointer">
                    <CardContent className="flex items-center gap-4 py-3.5 px-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dataly-info-soft">
                        <Building2 className="h-4 w-4 text-dataly-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-dataly-ink truncate">{m.name}</span>
                          {m.legalName && m.legalName !== m.name && (
                            <span className="text-xs text-dataly-muted truncate">{m.legalName}</span>
                          )}
                        </div>
                        {address?.city && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-dataly-muted" />
                            <span className="text-xs text-dataly-slate">
                              {address.zip ? `${address.zip} ` : ''}{address.city}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">
                          {m._count.engagements} {m._count.engagements === 1 ? 'Engagement' : 'Engagements'}
                        </Badge>
                        <Badge variant="outline">
                          {m._count.userLinks} {m._count.userLinks === 1 ? 'Nutzer' : 'Nutzer'}
                        </Badge>
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
  );
}
