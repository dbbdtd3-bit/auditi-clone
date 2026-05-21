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
  DRAFT: { label: 'Entwurf', className: 'bg-dataly-surface-subtle text-dataly-slate' },
  ACTIVE: { label: 'Aktiv', className: 'bg-dataly-info-soft text-dataly-info' },
  COMPLETED: { label: 'Abgeschlossen', className: 'bg-dataly-success-soft text-dataly-success' },
  ARCHIVED: { label: 'Archiviert', className: 'bg-dataly-surface-subtle text-dataly-muted' },
};

function RateBar({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? 'bg-dataly-success' : rate >= 50 ? 'bg-dataly-warning' : 'bg-dataly-danger';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-dataly-surface-subtle overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs font-medium text-dataly-slate">{rate}%</span>
    </div>
  );
}

export function CampaignKpis({ data }: CampaignKpisProps) {
  if (!data.length) {
    return (
      <p className="py-6 text-center text-sm text-dataly-muted">
        Keine aktiven oder abgeschlossenen Kampagnen
      </p>
    );
  }

  return (
    <div className="divide-y divide-dataly-line">
      {data.map((c) => {
        const cfg = statusConfig[c.status] ?? statusConfig.DRAFT;
        return (
          <div key={c.id} className="py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-dataly-ink">{c.title}</p>
                <p className="truncate text-xs text-dataly-slate">
                  {c.mandantName} · {c.engagementTitle}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                {cfg.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-dataly-slate">
                <Send className="h-3.5 w-3.5 shrink-0 text-dataly-muted" />
                <span>{c.sent} / {c.total}</span>
              </div>
              <div className="flex items-center gap-1.5 text-dataly-slate">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-dataly-success" />
                <span>{c.responded} geantwortet</span>
              </div>
              {c.hasDifferences > 0 ? (
                <div className="flex items-center gap-1.5 text-dataly-warning">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{c.hasDifferences} Differenz{c.hasDifferences > 1 ? 'en' : ''}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-dataly-muted">
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
