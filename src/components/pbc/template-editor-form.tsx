'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string().optional(),
  category: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Titel erforderlich'),
    description: z.string().optional(),
  })),
});

type FormData = z.infer<typeof schema>;

interface TemplateItem { id?: string; title: string; description?: string | null }

interface Props {
  template?: {
    id: string;
    name: string;
    description?: string | null;
    category?: string;
    items: TemplateItem[];
  };
  onSave: (template: { id: string; name: string; description?: string | null; category?: string; items: TemplateItem[] }) => void;
  onCancel: () => void;
}

export function TemplateEditorForm({ template, onSave, onCancel }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: template?.name ?? '',
      description: template?.description ?? '',
      category: template?.category ?? 'ALLGEMEIN',
      items: template?.items.map((i) => ({ id: i.id, title: i.title, description: i.description ?? '' })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);

    try {
      let savedTemplate: { id: string; name: string; description?: string | null; category?: string };

      if (template) {
        const res = await fetch(`/api/pbc/templates/${template.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, description: data.description, category: data.category }),
        });
        if (!res.ok) throw new Error('Vorlage konnte nicht aktualisiert werden');
        savedTemplate = await res.json();

        // Sync items: delete removed, create new
        const existingIds = template.items.map((i) => i.id).filter(Boolean);
        const keptIds = data.items.map((i) => i.id).filter(Boolean);
        const toDelete = existingIds.filter((id) => !keptIds.includes(id));

        await Promise.all(toDelete.map((id) =>
          fetch(`/api/pbc/templates/${template.id}/items/${id}`, { method: 'DELETE' })
        ));

        for (const item of data.items) {
          if (item.id) {
            await fetch(`/api/pbc/templates/${template.id}/items/${item.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: item.title, description: item.description }),
            });
          } else {
            await fetch(`/api/pbc/templates/${template.id}/items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: item.title, description: item.description }),
            });
          }
        }
      } else {
        const res = await fetch('/api/pbc/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, description: data.description, category: data.category }),
        });
        if (!res.ok) throw new Error('Vorlage konnte nicht erstellt werden');
        savedTemplate = await res.json();

        for (const item of data.items) {
          await fetch(`/api/pbc/templates/${savedTemplate.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: item.title, description: item.description }),
          });
        }
      }

      onSave({ ...savedTemplate, items: data.items });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register('name')} placeholder="z.B. Jahresabschluss Standardcheckliste" />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" {...register('description')} rows={2} placeholder="Optionale Beschreibung" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="category">Kategorie</Label>
        <Input id="category" {...register('category')} placeholder="z.B. ALLGEMEIN" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Anforderungen ({fields.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ title: '', description: '' })}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Hinzufügen
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-xs text-slate-400 py-2">Noch keine Anforderungen. Fügen Sie welche hinzu.</p>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 items-start bg-slate-50 rounded-lg p-3">
              <div className="flex-1 space-y-1.5">
                <Input
                  {...register(`items.${idx}.title`)}
                  placeholder={`Anforderung ${idx + 1}`}
                  className="h-8 text-sm"
                />
                {errors.items?.[idx]?.title && (
                  <p className="text-xs text-red-600">{errors.items[idx]!.title!.message}</p>
                )}
                <Input
                  {...register(`items.${idx}.description`)}
                  placeholder="Beschreibung (optional)"
                  className="h-8 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 shrink-0"
                onClick={() => remove(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>Abbrechen</Button>
        <Button type="submit" className="bg-blue-700 hover:bg-blue-800" disabled={loading}>
          {loading ? 'Speichern...' : template ? 'Speichern' : 'Erstellen'}
        </Button>
      </div>
    </form>
  );
}
