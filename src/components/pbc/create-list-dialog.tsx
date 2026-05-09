'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Plus, FileText, LayoutTemplate, ChevronRight } from 'lucide-react';

interface TemplateItem {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  _count: { items: number };
}

interface TemplateWithItems extends Template {
  items: TemplateItem[];
}

const CATEGORY_LABEL: Record<string, string> = {
  JAHRESABSCHLUSS: 'Jahresabschluss',
  DUE_DILIGENCE: 'Due Diligence',
  SONDERPRUEFUNG: 'Sonderprüfung',
  ALLGEMEIN: 'Allgemein',
};

type Mode = 'blank' | 'template';

interface Props {
  workspaceId: string;
}

export function CreateListDialog({ workspaceId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>('blank');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState('');

  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = React.useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [previewTemplate, setPreviewTemplate] = React.useState<TemplateWithItems | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  function resetState() {
    setMode('blank');
    setTitle('');
    setError(null);
    setSelectedTemplateId('');
    setPreviewTemplate(null);
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetState();
    setOpen(val);
  }

  React.useEffect(() => {
    if (open && mode === 'template' && templates.length === 0) {
      setTemplatesLoading(true);
      fetch('/api/pbc/templates')
        .then((r) => r.json())
        .then((data) => setTemplates(Array.isArray(data) ? data : []))
        .catch(() => setTemplates([]))
        .finally(() => setTemplatesLoading(false));
    }
  }, [open, mode, templates.length]);

  React.useEffect(() => {
    if (!selectedTemplateId) {
      setPreviewTemplate(null);
      return;
    }
    setPreviewLoading(true);
    fetch(`/api/pbc/templates/${selectedTemplateId}`)
      .then((r) => r.json())
      .then((data) => {
        setPreviewTemplate(data);
        if (!title) setTitle(data.name);
      })
      .catch(() => setPreviewTemplate(null))
      .finally(() => setPreviewLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Titel ist erforderlich.');
      return;
    }
    if (mode === 'template' && !selectedTemplateId) {
      setError('Bitte wählen Sie eine Vorlage aus.');
      return;
    }

    setLoading(true);
    try {
      const body: { title: string; templateId?: string } = { title: title.trim() };
      if (mode === 'template') body.templateId = selectedTemplateId;

      const res = await fetch(`/api/pbc/workspaces/${workspaceId}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unbekannter Fehler');
        return;
      }

      setOpen(false);
      resetState();
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="bg-blue-700 hover:bg-blue-800" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Neue Liste
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Anforderungsliste erstellen</DialogTitle>
            <DialogDescription>
              Leere Liste anlegen oder aus einer Vorlage starten.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setMode('blank'); setSelectedTemplateId(''); setPreviewTemplate(null); }}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                  mode === 'blank'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                Leere Liste
              </button>
              <button
                type="button"
                onClick={() => setMode('template')}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                  mode === 'template'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <LayoutTemplate className="h-4 w-4 shrink-0" />
                Aus Vorlage
              </button>
            </div>

            {/* Template picker */}
            {mode === 'template' && (
              <div className="space-y-1.5">
                <Label htmlFor="template-select">Vorlage *</Label>
                {templatesLoading ? (
                  <p className="text-sm text-slate-500 py-1">Vorlagen werden geladen…</p>
                ) : (
                  <Select
                    id="template-select"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">— Vorlage auswählen —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({CATEGORY_LABEL[t.category] ?? t.category}, {t._count.items} Positionen)
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}

            {/* Template preview */}
            {mode === 'template' && selectedTemplateId && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                {previewLoading ? (
                  <p className="text-xs text-slate-500">Vorschau wird geladen…</p>
                ) : previewTemplate ? (
                  <>
                    {previewTemplate.description && (
                      <p className="text-xs text-slate-500">{previewTemplate.description}</p>
                    )}
                    <ul className="space-y-1">
                      {previewTemplate.items.slice(0, 8).map((item) => (
                        <li key={item.id} className="flex items-start gap-1.5 text-xs text-slate-700">
                          <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                          {item.title}
                        </li>
                      ))}
                      {previewTemplate.items.length > 8 && (
                        <li className="text-xs text-slate-400 pl-4.5">
                          + {previewTemplate.items.length - 8} weitere Positionen
                        </li>
                      )}
                    </ul>
                  </>
                ) : null}
              </div>
            )}

            {/* List title */}
            <div className="space-y-1.5">
              <Label htmlFor="list-title">Listenname *</Label>
              <Input
                id="list-title"
                placeholder="z.B. Anlagevermögen, Finanzen & Liquidität"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                autoFocus={mode === 'blank'}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                className="bg-blue-700 hover:bg-blue-800"
                disabled={loading}
              >
                {loading ? 'Wird erstellt…' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
