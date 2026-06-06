'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  Calendar,
  FolderOpen,
  Search,
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

export type PbcWorkspaceListItem = {
  id: string;
  createdAt: string;
  engagementTitle: string;
  fiscalYear: string;
  mandantName: string;
  requestListCount: number;
  memberCount: number;
};

const defaultSort: SortMode = 'created-desc';

const collator = new Intl.Collator('de-DE', {
  numeric: true,
  sensitivity: 'base',
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function sortWorkspaces(workspaces: PbcWorkspaceListItem[], sortMode: SortMode) {
  return [...workspaces].sort((a, b) => {
    const newestFirst = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    const oldestFirst = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    const titleAsc = collator.compare(a.engagementTitle, b.engagementTitle);
    const titleDesc = collator.compare(b.engagementTitle, a.engagementTitle);

    if (sortMode === 'created-asc') return oldestFirst || titleAsc;
    if (sortMode === 'title-asc') return titleAsc || newestFirst;
    if (sortMode === 'title-desc') return titleDesc || newestFirst;
    return newestFirst || titleAsc;
  });
}

export function PbcWorkspacesOverview({ workspaces }: { workspaces: PbcWorkspaceListItem[] }) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(defaultSort);

  const visibleWorkspaces = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('de-DE');
    const filtered = normalizedQuery
      ? workspaces.filter((workspace) =>
          [workspace.engagementTitle, workspace.mandantName, workspace.fiscalYear].some((value) =>
            value.toLocaleLowerCase('de-DE').includes(normalizedQuery)
          )
        )
      : workspaces;

    return sortWorkspaces(filtered, sortMode);
  }, [workspaces, query, sortMode]);

  const hasWorkspaces = workspaces.length > 0;
  const hasActiveControls = query.trim().length > 0 || sortMode !== defaultSort;

  function resetControls() {
    setQuery('');
    setSortMode(defaultSort);
  }

  if (!hasWorkspaces) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-dataly-surface-subtle">
            <FolderOpen className="h-7 w-7 text-dataly-muted" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-dataly-ink">
            Noch keine PBC-Workspaces
          </h3>
          <p className="max-w-sm text-sm text-dataly-slate">
            PBC-Workspaces werden automatisch beim Anlegen eines Engagements erstellt.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-dataly-line bg-dataly-surface px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-xl">
            <label htmlFor="pbc-workspace-search" className="sr-only">
              Engagement, Mandant oder Jahr suchen
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dataly-muted" />
            <Input
              id="pbc-workspace-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Engagement, Mandant oder Jahr suchen"
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
                aria-label="PBC-Workspaces sortieren"
                className="h-10 w-full border-dataly-line bg-dataly-surface text-dataly-ink focus:ring-dataly-blue sm:w-[240px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-dataly-line bg-dataly-surface text-dataly-ink">
                <SelectItem value="created-desc">Erstellt: neueste zuerst</SelectItem>
                <SelectItem value="created-asc">Erstellt: älteste zuerst</SelectItem>
                <SelectItem value="title-asc">Engagement: A bis Z</SelectItem>
                <SelectItem value="title-desc">Engagement: Z bis A</SelectItem>
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
          {visibleWorkspaces.length} von {workspaces.length} Workspaces
        </p>
      </div>

      {visibleWorkspaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dataly-surface-subtle">
              <Search className="h-6 w-6 text-dataly-muted" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-dataly-ink">
              Kein passender Workspace gefunden
            </h3>
            <p className="max-w-md text-sm text-dataly-slate">
              Die Suche prüft Engagement, Mandant und Jahr. Passen Sie den Suchbegriff an oder
              setzen Sie die Ansicht zurück.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={resetControls}>
              <X className="h-4 w-4" />
              Zurücksetzen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {visibleWorkspaces.map((workspace) => (
            <WorkspaceRow key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}
    </>
  );
}

function WorkspaceRow({ workspace }: { workspace: PbcWorkspaceListItem }) {
  return (
    <Link href={`/pbc/${workspace.id}`}>
      <Card className="cursor-pointer transition-colors hover:border-dataly-line-strong">
        <CardContent className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dataly-teal/10">
              <FolderOpen className="h-4 w-4 text-dataly-teal" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-dataly-ink">
                {workspace.engagementTitle}
              </span>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex min-w-0 items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0 text-dataly-muted" />
                  <span className="truncate text-xs text-dataly-slate">
                    {workspace.mandantName}
                  </span>
                </div>
                <span className="text-xs text-dataly-line">·</span>
                <div className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3 shrink-0 text-dataly-muted" />
                  <span className="text-xs text-dataly-slate">{workspace.fiscalYear}</span>
                </div>
                <span className="text-xs text-dataly-line">·</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0 text-dataly-muted" />
                  <span className="text-xs text-dataly-muted">
                    Erstellt {formatDate(workspace.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary">
              {workspace.requestListCount}{' '}
              {workspace.requestListCount === 1 ? 'Liste' : 'Listen'}
            </Badge>
            <Badge variant="outline">
              {workspace.memberCount} {workspace.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
