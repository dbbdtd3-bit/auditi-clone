'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, X, Loader2, CheckCircle2, Send, Bell, MailCheck, MailX, PlusCircle, XCircle } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditEvent {
  id: string;
  event: string;
  actor: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

interface Props {
  campaignId: string;
  requestId: string;
  partnerName: string;
  onClose: () => void;
}

// ── Event config ─────────────────────────────────────────────────────────────

type EventVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';

interface EventConfig {
  label: string;
  variant: EventVariant;
  icon: React.ComponentType<{ className?: string }>;
}

const eventConfig: Record<string, EventConfig> = {
  CREATED:          { label: 'Erstellt',               variant: 'secondary',    icon: PlusCircle },
  QUEUED:           { label: 'In Warteschlange',        variant: 'warning',      icon: ClipboardList },
  SENT:             { label: 'Versendet',               variant: 'default',      icon: Send },
  REMINDER_SENT:    { label: 'Erinnerung versendet',    variant: 'warning',      icon: Bell },
  RESPONDED:        { label: 'Beantwortet',             variant: 'success',      icon: CheckCircle2 },
  CLOSED:           { label: 'Abgeschlossen',           variant: 'secondary',    icon: XCircle },
  EMAIL_DELIVERED:  { label: 'E-Mail zugestellt',       variant: 'success',      icon: MailCheck },
  EMAIL_FAILED:     { label: 'E-Mail fehlgeschlagen',   variant: 'destructive',  icon: MailX },
};

function getEventConfig(event: string): EventConfig {
  return eventConfig[event] ?? {
    label: event,
    variant: 'outline',
    icon: ClipboardList,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMeta(meta: Record<string, unknown> | null): string | null {
  if (!meta || Object.keys(meta).length === 0) return null;
  const skip = new Set(['campaignId', 'requestId']);
  const parts = Object.entries(meta)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => {
      const display =
        typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
      return `${k}: ${display}`;
    });
  return parts.length > 0 ? parts.join(' · ') : null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function RequestAuditLog({ campaignId, requestId, partnerName, onClose }: Props) {
  const [events, setEvents] = React.useState<AuditEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/campaigns/${campaignId}/requests/${requestId}/audit`)
      .then((res) => {
        if (!res.ok) throw new Error('Fehler beim Laden');
        return res.json() as Promise<AuditEvent[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setEvents(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Audit-Log konnte nicht geladen werden.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [campaignId, requestId]);

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-semibold text-slate-700">
              Audit-Log: {partnerName}
            </CardTitle>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Wird geladen...</span>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            Keine Ereignisse vorhanden.
          </p>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-slate-200" aria-hidden />

            <ol className="space-y-3">
              {events.map((ev) => {
                const cfg = getEventConfig(ev.event);
                const Icon = cfg.icon;
                const meta = formatMeta(ev.meta);

                return (
                  <li key={ev.id} className="flex gap-3">
                    {/* Dot */}
                    <div className="relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1.5 pb-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        {ev.actor && (
                          <span className="text-xs text-slate-500 truncate">
                            {ev.actor}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <time className="text-xs text-slate-400">
                          {formatDateTime(ev.createdAt)}
                        </time>
                        {meta && (
                          <span className="text-xs text-slate-400 italic">{meta}</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
