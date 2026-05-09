import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin } from 'lucide-react';
import Link from 'next/link';
import { CreateMandantDialog } from '@/components/mandanten/create-mandant-dialog';

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];

async function getMandanten() {
  try {
    return await prisma.mandant.findMany({
      include: {
        _count: {
          select: { engagements: true, users: true },
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
  const role = (session?.user as { role?: string })?.role ?? '';
  if (!WP_ROLES.includes(role)) redirect('/dashboard');

  const mandanten = await getMandanten();

  return (
    <div>
      <Header
        title="Mandanten"
        description="Alle betreuten Mandate und Gesellschaften"
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {mandanten.length} {mandanten.length === 1 ? 'Mandant' : 'Mandanten'} gesamt
          </p>
          <CreateMandantDialog />
        </div>

        {/* Empty State */}
        {mandanten.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <Building2 className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Noch keine Mandanten
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Legen Sie Ihren ersten Mandanten an, um Engagements und Prüfungsaufträge zu verwalten.
              </p>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {mandanten.length > 0 && (
          <div className="grid gap-3">
            {mandanten.map((m) => {
              const address = m.address as {
                city?: string;
                street?: string;
                zip?: string;
              } | null;

              return (
                <Link key={m.id} href={`/mandanten/${m.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate">{m.name}</h3>
                          {m.legalName && m.legalName !== m.name && (
                            <span className="text-xs text-slate-400 truncate">{m.legalName}</span>
                          )}
                        </div>
                        {address?.city && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-500">
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
                          {m._count.users} {m._count.users === 1 ? 'Nutzer' : 'Nutzer'}
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
