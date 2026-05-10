'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ActivityStream } from './activity-stream';

interface Comment {
  id: string;
  author: string;
  role: string;
  text: string;
  createdAt: Date | string;
}

interface Activity {
  id: string;
  event: string;
  actor?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: Date | string;
  itemId?: string | null;
}

interface Props {
  itemId: string;
  comments: Comment[];
  activities: Activity[];
}

const roleLabelMap: Record<string, string> = {
  WP_ADMIN: 'WP-Admin',
  WP_TEAM: 'WP-Team',
  WP_LEAD: 'WP-Lead',
  MANDANT_ADMIN: 'Mandant Admin',
  MANDANT_UPLOADER: 'Mandant',
  MANDANT_USER: 'Mandant',
};

export function ModalTabs({ itemId, comments: initialComments, activities }: Props) {
  const [comments, setComments] = React.useState<Comment[]>(initialComments);
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pbc/items/${itemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data]);
        setText('');
      }
    } finally {
      setLoading(false);
    }
  }

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Tabs defaultValue="comments">
      <TabsList>
        <TabsTrigger value="comments" className="text-xs">Kommentare ({comments.length})</TabsTrigger>
        <TabsTrigger value="activities" className="text-xs">Aktivitäten</TabsTrigger>
      </TabsList>

      <TabsContent value="comments" className="mt-3 space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Noch keine Kommentare.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="h-7 w-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                  {c.author.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-800">{c.author}</span>
                    <span className="text-[10px] text-slate-400">{roleLabelMap[c.role] || c.role}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kommentar schreiben..."
            disabled={loading}
            className="flex-1 h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="h-9 px-3 rounded-md bg-blue-700 text-white text-sm hover:bg-blue-800 disabled:opacity-50"
          >
            Senden
          </button>
        </form>
      </TabsContent>

      <TabsContent value="activities" className="mt-3">
        <div className="max-h-56 overflow-y-auto pr-1">
          <ActivityStream activities={activities.filter((a) => a.itemId === itemId || !a.itemId)} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
