'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, LayoutTemplate, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TemplateEditorForm } from './template-editor-form';

interface TemplateItem { id?: string; title: string; description?: string | null }
interface Template {
  id: string;
  name: string;
  description?: string | null;
  category?: string;
  isBuiltIn: boolean;
  items: TemplateItem[];
  _count?: { items: number };
}

interface Props {
  listId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}

export function TemplateManagerSheet({ listId, open, onOpenChange, onApplied }: Props) {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState<Template | 'new' | null>(null);
  const [applying, setApplying] = React.useState<string | null>(null);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/pbc/templates');
      if (res.ok) {
        const data = await res.json();
        // Load full template with items for each
        const full = await Promise.all(
          data.map(async (t: Template & { _count: { items: number } }) => {
            const r = await fetch(`/api/pbc/templates/${t.id}`);
            return r.ok ? r.json() : { ...t, items: [] };
          })
        );
        setTemplates(full);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open) loadTemplates();
  }, [open]);

  async function handleApply(templateId: string) {
    setApplying(templateId);
    try {
      const res = await fetch(`/api/pbc/lists/${listId}/items/from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      if (res.ok) {
        onApplied();
        onOpenChange(false);
      } else {
        alert('Vorlage konnte nicht eingefügt werden');
      }
    } finally {
      setApplying(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Vorlage wirklich löschen?')) return;
    const res = await fetch(`/api/pbc/templates/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  function handleSaved(saved: { id: string; name: string; description?: string | null; category?: string; items: TemplateItem[] }) {
    setTemplates((prev) => {
      const existing = prev.find((t) => t.id === saved.id);
      if (existing) {
        return prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t));
      }
      return [...prev, { ...saved, isBuiltIn: false }];
    });
    setEditing(null);
  }

  const categories = [...new Set(templates.map((t) => t.category || 'ALLGEMEIN'))].sort();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4" />
              {editing ? (editing === 'new' ? 'Neue Vorlage' : 'Vorlage bearbeiten') : 'Vorlagen'}
            </SheetTitle>
            {!editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Neue Vorlage
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {editing ? (
            <div className="p-6 overflow-y-auto h-full">
              <TemplateEditorForm
                template={editing === 'new' ? undefined : editing}
                onSave={handleSaved}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {loading && (
                  <p className="text-sm text-slate-400 text-center py-8">Laden...</p>
                )}
                {!loading && templates.length === 0 && (
                  <div className="text-center py-12">
                    <LayoutTemplate className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Noch keine Vorlagen vorhanden.</p>
                    <p className="text-xs text-slate-400 mt-1">Erstellen Sie Ihre erste Vorlage.</p>
                  </div>
                )}

                {categories.map((cat) => {
                  const catTemplates = templates.filter((t) => (t.category || 'ALLGEMEIN') === cat);
                  if (catTemplates.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-2">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-1">{cat}</p>
                      {catTemplates.map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className="border border-slate-200 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900 truncate">{tmpl.name}</span>
                                {tmpl.isBuiltIn && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Eingebaut</Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{tmpl.items.length} Anforderung(en)</p>
                              {tmpl.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tmpl.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-700 hover:bg-blue-800 h-8 text-xs"
                              onClick={() => handleApply(tmpl.id)}
                              disabled={applying === tmpl.id}
                            >
                              <ChevronRight className="h-3.5 w-3.5 mr-1" />
                              {applying === tmpl.id ? 'Einfügen...' : 'In Liste einfügen'}
                            </Button>
                            {!tmpl.isBuiltIn && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setEditing(tmpl)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 hover:text-red-600 hover:border-red-200"
                                  onClick={() => handleDelete(tmpl.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
