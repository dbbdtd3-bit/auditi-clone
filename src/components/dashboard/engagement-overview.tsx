import Link from 'next/link';
import { Building2, Calendar, ChevronRight } from 'lucide-react';

interface RecentEngagement {
  id: string;
  title: string;
  fiscalYear: number;
  type: string;
  status: string;
  mandant: { name: string };
  _count: { campaigns: number };
}

interface EngagementOverviewProps {
  engagements: RecentEngagement[];
}

const typeLabel: Record<string, string> = {
  JAHRESABSCHLUSS: 'Jahresabschluss',
  SONDERPRUEFUNG: 'Sonderprüfung',
  DUE_DILIGENCE: 'Due Diligence',
};

const statusDot: Record<string, string> = {
  ACTIVE: 'bg-emerald-500',
  COMPLETED: 'bg-slate-400',
  ARCHIVED: 'bg-slate-300',
};

export function EngagementOverview({ engagements }: EngagementOverviewProps) {
  if (!engagements.length) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        Keine aktiven Engagements
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {engagements.map((e) => (
        <Link
          key={e.id}
          href={`/engagements/${e.id}`}
          className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-1 px-1 rounded-lg transition-colors group"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[e.status] ?? 'bg-slate-400'}`}
              />
              <p className="truncate text-sm font-medium text-slate-800">{e.title}</p>
            </div>
            <p className="truncate text-xs text-slate-500">
              {e.mandant.name} · {typeLabel[e.type] ?? e.type}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {e.fiscalYear}
            </span>
            <span className="hidden sm:block">
              {e._count.campaigns} Kampagne{e._count.campaigns !== 1 ? 'n' : ''}
            </span>
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </Link>
      ))}
    </div>
  );
}
