import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, Send } from 'lucide-react';

interface CampaignKpi {
  id: string;
  title: string;
  status: string;
  engagementTitle: string;
  mandantName: string;
  total: number;
  sent: number;
  responded: number;
  hasDifferences: number;
  responseRate: number;
}

interface CampaignKpisProps {
  data: CampaignKpi[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Entwurf', className: 'bg-slate-100 text-slate-600' },
  ACTIVE: { label: 'Aktiv', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Abgeschlossen', className: 'bg-emerald-100 text-emerald-700' },
  ARCHIVED: { label: 'Archiviert', className: 'bg-slate-100 text-slate-500' },
};

function RateBar({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs font-medium text-slate-700">{rate}%</span>
    </div>
  );
}

export function CampaignKpis({ data }: CampaignKpisProps) {
  if (!data.length) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        Keine aktiven oder abgeschlossenen Kampagnen
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {data.map((c) => {
        const cfg = statusConfig[c.status] ?? statusConfig.DRAFT;
        return (
          <div key={c.id} className="py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                <p className="truncate text-xs text-slate-500">
                  {c.mandantName} · {c.engagementTitle}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                {cfg.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Send className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{c.sent} / {c.total}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span>{c.responded} geantwortet</span>
              </div>
              {c.hasDifferences > 0 ? (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{c.hasDifferences} Differenz{c.hasDifferences > 1 ? 'en' : ''}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{c.total - c.responded} ausstehend</span>
                </div>
              )}
            </div>

            <RateBar rate={c.responseRate} />
          </div>
        );
      })}
    </div>
  );
}
