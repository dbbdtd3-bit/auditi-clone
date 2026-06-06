'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortMode = 'created-desc' | 'created-asc' | 'title-asc' | 'title-desc';

type CampaignStatusConfig = {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning';
};

export type SbaCampaignListItem = {
  id: string;
  title: string;
  status: string;
  balanceDate: string;
  createdAt: string;
  engagementTitle: string;
  mandantName: string;
  requests: { status: string }[];
};

const defaultSort: SortMode = 'created-desc';

const campaignStatusConfig: Record<string, CampaignStatusConfig> = {
  DRAFT: { label: 'Entwurf', variant: 'secondary' },
  ACTIVE: { label: 'Aktiv', variant: 'success' },
  COMPLETED: { label: 'Abgeschlossen', variant: 'outline' },
  ARCHIVED: { label: 'Archiviert', variant: 'outline' },
};

const collator = new Intl.Collator('de-DE', {
  numeric: true,
  sensitivity: 'base',
});

function responseRate(requests: { status: string }[]): number {
  if (requests.length === 0) return 0;
  return Math.round(
    (requests.filter((request) => request.status === 'RESPONDED').length / requests.length) * 100
  );
}

function sentCount(requests: { status: string }[]): number {
  return requests.filter((request) => ['SENT', 'RESPONDED', 'CLOSED'].includes(request.status))
    .length;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function sortCampaigns(campaigns: SbaCampaignListItem[], sortMode: SortMode) {
  return [...campaigns].sort((a, b) => {
    const newestFirst = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    const oldestFirst = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    const titleAsc = collator.compare(a.title, b.title);
    const titleDesc = collator.compare(b.title, a.title);

    if (sortMode === 'created-asc') return oldestFirst || titleAsc;
    if (sortMode === 'title-asc') return titleAsc || newestFirst;
    if (sortMode === 'title-desc') return titleDesc || newestFirst;
    return newestFirst || titleAsc;
  });
}

export function SbaCampaignsOverview({ campaigns }: { campaigns: SbaCampaignListItem[] }) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(defaultSort);

  const stats = useMemo(() => {
    const active = campaigns.filter((campaign) => campaign.status === 'ACTIVE');
    const draft = campaigns.filter((campaign) => campaign.status === 'DRAFT');
    const finished = campaigns.filter(
      (campaign) => campaign.status === 'COMPLETED' || campaign.status === 'ARCHIVED'
    );

    return { active, draft, finished };
  }, [campaigns]);

  const visibleCampaigns = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('de-DE');
    const filtered = normalizedQuery
      ? campaigns.filter((campaign) =>
          [campaign.title, campaign.mandantName].some((value) =>
            value.toLocaleLowerCase('de-DE').includes(normalizedQuery)
          )
        )
      : campaigns;

    return sortCampaigns(filtered, sortMode);
  }, [campaigns, query, sortMode]);

  const active = visibleCampaigns.filter((campaign) => campaign.status === 'ACTIVE');
  const draft = visibleCampaigns.filter((campaign) => campaign.status === 'DRAFT');
  const finished = visibleCampaigns.filter(
    (campaign) => campaign.status === 'COMPLETED' || campaign.status === 'ARCHIVED'
  );
  const hasCampaigns = campaigns.length > 0;
  const hasActiveControls = query.trim().length > 0 || sortMode !== defaultSort;

  function resetControls() {
    setQuery('');
    setSortMode(defaultSort);
  }

  if (!hasCampaigns) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-dataly-surface-subtle">
            <Mail className="h-7 w-7 text-dataly-muted" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-dataly-ink">
            Noch keine Kampagnen angelegt
          </h3>
          <p className="max-w-sm text-sm text-dataly-slate">
            Öffnen Sie ein Engagement und legen Sie dort eine Saldenbestätigungs-Kampagne an.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          icon={<Send className="h-5 w-5 text-dataly-blue" />}
          bg="bg-dataly-info-soft"
          label="Aktive Kampagnen"
          value={stats.active.length}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-dataly-success" />}
          bg="bg-dataly-success-soft"
          label="Abgeschlossen"
          value={stats.finished.length}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-dataly-warning" />}
          bg="bg-dataly-warning-soft"
          label="Entwürfe"
          value={stats.draft.length}
        />
      </div>

      <div className="rounded-lg border border-dataly-line bg-dataly-surface px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-xl">
            <label htmlFor="sba-campaign-search" className="sr-only">
              Kampagnen oder Mandanten suchen
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dataly-muted" />
            <Input
              id="sba-campaign-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Kampagne oder Mandant suchen"
              className="h-10 pl-9"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-dataly-muted">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Sortierung</span>
            </div>
            <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
              <SelectTrigger
                aria-label="Kampagnen sortieren"
                className="h-10 w-full border-dataly-line bg-dataly-surface text-dataly-ink focus:ring-dataly-blue sm:w-[240px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-dataly-line bg-dataly-surface text-dataly-ink">
                <SelectItem value="created-desc">Erstellt: neueste zuerst</SelectItem>
                <SelectItem value="created-asc">Erstellt: älteste zuerst</SelectItem>
                <SelectItem value="title-asc">Kampagnenname: A bis Z</SelectItem>
                <SelectItem value="title-desc">Kampagnenname: Z bis A</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveControls && (
              <Button type="button" variant="outline" size="sm" onClick={resetControls}>
                <X className="h-4 w-4" />
                Zurücksetzen
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-dataly-muted" aria-live="polite">
          {visibleCampaigns.length} von {campaigns.length} Kampagnen
        </p>
      </div>

      {visibleCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dataly-surface-subtle">
              <Search className="h-6 w-6 text-dataly-muted" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-dataly-ink">
              Keine passende Kampagne gefunden
            </h3>
            <p className="max-w-md text-sm text-dataly-slate">
              Die Suche prüft Kampagnenname und Mandant. Passen Sie den Suchbegriff an oder
              setzen Sie die Ansicht zurück.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={resetControls}>
              <X className="h-4 w-4" />
              Zurücksetzen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && <Section title="Aktive Kampagnen" campaigns={active} />}
          {draft.length > 0 && <Section title="Entwürfe" campaigns={draft} />}
          {finished.length > 0 && (
            <Section title="Abgeschlossen / Archiviert" campaigns={finished} />
          )}
        </>
      )}
    </>
  );
}

function StatCard({
  icon,
  bg,
  label,
  value,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-dataly-ink">{value}</p>
          <p className="text-xs text-dataly-slate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, campaigns }: { title: string; campaigns: SbaCampaignListItem[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-dataly-muted">
          {title}
        </h2>
        <span className="rounded-full border border-dataly-line bg-dataly-surface px-2 py-0.5 text-[10px] font-semibold leading-none text-dataly-muted">
          {campaigns.length}
        </span>
      </div>
      {campaigns.map((campaign) => (
        <CampaignRow key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: SbaCampaignListItem }) {
  const status = campaignStatusConfig[campaign.status] ?? {
    label: campaign.status,
    variant: 'outline' as const,
  };
  const rate = responseRate(campaign.requests);
  const sent = sentCount(campaign.requests);

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="cursor-pointer transition-colors hover:border-dataly-line-strong">
        <CardContent className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dataly-info-soft">
              <Mail className="h-4 w-4 text-dataly-blue" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-dataly-ink">
                {campaign.title}
              </span>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex min-w-0 items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0 text-dataly-muted" />
                  <span className="truncate text-xs text-dataly-slate">{campaign.mandantName}</span>
                </div>
                <span className="text-xs text-dataly-line">·</span>
                <span className="truncate text-xs text-dataly-slate">
                  {campaign.engagementTitle}
                </span>
                <span className="text-xs text-dataly-line">·</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0 text-dataly-muted" />
                  <span className="text-xs text-dataly-slate">
                    Stichtag {formatDate(campaign.balanceDate)}
                  </span>
                </div>
                <span className="text-xs text-dataly-line">·</span>
                <span className="text-xs text-dataly-muted">
                  Erstellt {formatDate(campaign.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 text-right sm:justify-end lg:gap-4">
            <div>
              <p className="text-sm font-semibold tabular-nums text-dataly-ink">
                {campaign.requests.length}
              </p>
              <p className="text-[10px] text-dataly-muted">Anfragen</p>
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-dataly-ink">{sent}</p>
              <p className="text-[10px] text-dataly-muted">Versendet</p>
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-dataly-ink">{rate} %</p>
              <p className="text-[10px] text-dataly-muted">Rücklauf</p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
