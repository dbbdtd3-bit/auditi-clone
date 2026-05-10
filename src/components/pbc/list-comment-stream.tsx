'use client';

import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface ListComment {
  id: string;
  author: string;
  role: string;
  text: string;
  createdAt: Date | string;
}

interface ListCommentStreamProps {
  listId: string;
  initialComments: ListComment[];
}

function formatDate(dateStr: Date | string): string {
  return new Date(dateStr).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ListCommentStream({ listId, initialComments }: ListCommentStreamProps) {
  const [comments, setComments] = React.useState<ListComment[]>(initialComments);
  const [newText, setNewText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/pbc/lists/${listId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kommentar konnte nicht gespeichert werden');
        return;
      }

      setComments((prev) => [...prev, data]);
      setNewText('');
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {comments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Noch keine Bemerkungen.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {comment.author.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-800">{comment.author}</span>
                  <span className="text-[10px] text-slate-400 ml-auto">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Bemerkung zur Liste schreiben..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          disabled={submitting}
          rows={3}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            className="bg-blue-700 hover:bg-blue-800"
            disabled={submitting || !newText.trim()}
          >
            <Send className="h-3 w-3" />
            {submitting ? 'Senden...' : 'Senden'}
          </Button>
        </div>
      </form>
    </div>
  );
}
