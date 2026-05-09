'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Send, Bell, Download } from 'lucide-react';

interface Props {
  campaignId: string;
  status: string;
  draftCount: number;
  sentCount: number;
}

export function CampaignActions({ campaignId, status, draftCount, sentCount }: Props) {
  const router = useRouter();
  const [sendLoading, setSendLoading] = React.useState(false);
  const [remindLoading, setRemindLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const canSend = (status === 'DRAFT' || status === 'ACTIVE') && draftCount > 0;
  const canRemind = status === 'ACTIVE' && sentCount > 0;

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  async function handleSend() {
    clearFeedback();
    setSendLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Versenden');
        return;
      }
      const queued: number = data.queued ?? draftCount;
      setMessage(
        `${queued} E-Mail${queued !== 1 ? 's' : ''} in die Warteschlange gestellt.`
      );
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setSendLoading(false);
    }
  }

  async function handleRemind() {
    clearFeedback();
    setRemindLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/remind`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Senden der Erinnerungen');
        return;
      }
      const reminded: number = data.queued ?? 0;
      setMessage(
        reminded > 0
          ? `${reminded} Erinnerung${reminded !== 1 ? 'en' : ''} in die Warteschlange gestellt.`
          : 'Keine überfälligen Anfragen gefunden.'
      );
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setRemindLoading(false);
    }
  }

  function handleExport() {
    window.open(`/api/campaigns/${campaignId}/export`, '_blank');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canSend && (
          <Button
            className="bg-blue-700 hover:bg-blue-800"
            onClick={handleSend}
            disabled={sendLoading || remindLoading}
          >
            <Send className="h-4 w-4" />
            {sendLoading ? 'Wird versendet...' : `Versenden (${draftCount})`}
          </Button>
        )}

        {canRemind && (
          <Button
            variant="outline"
            onClick={handleRemind}
            disabled={sendLoading || remindLoading}
          >
            <Bell className="h-4 w-4" />
            {remindLoading ? 'Wird gesendet...' : 'Erinnern'}
          </Button>
        )}

        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4" />
          CSV Export
        </Button>
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
          {error}
        </p>
      )}
    </div>
  );
}
