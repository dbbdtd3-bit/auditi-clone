'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send } from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  role: string;
  text: string;
  createdAt: string;
}

interface Props {
  itemId: string;
  comments: Comment[];
  currentUserName: string;
  currentUserRole: string;
}

const roleLabelMap: Record<string, string> = {
  WP_ADMIN: 'WP-Admin',
  WP_TEAM: 'WP-Team',
  WP_LEAD: 'WP-Lead',
  MANDANT_ADMIN: 'Mandant Admin',
  MANDANT_UPLOADER: 'Mandant',
  MANDANT_USER: 'Mandant',
};

export function CommentSection({ itemId, comments: initialComments, currentUserName, currentUserRole }: Props) {
  const router = useRouter();
  const [comments, setComments] = React.useState<Comment[]>(initialComments);
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/pbc/items/${itemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          author: currentUserName,
          role: currentUserRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kommentar konnte nicht gespeichert werden');
        return;
      }

      // Optimistic update
      setComments((prev) => [...prev, data]);
      setText('');
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">
          Kommentare ({comments.length})
        </h3>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          Noch keine Kommentare.
        </p>
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
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {roleLabelMap[comment.role] || comment.role}
                  </Badge>
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
          placeholder="Kommentar schreiben..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          rows={3}
        />
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            className="bg-blue-700 hover:bg-blue-800"
            disabled={loading || !text.trim()}
          >
            <Send className="h-3 w-3" />
            {loading ? 'Senden...' : 'Kommentar senden'}
          </Button>
        </div>
      </form>
    </div>
  );
}
