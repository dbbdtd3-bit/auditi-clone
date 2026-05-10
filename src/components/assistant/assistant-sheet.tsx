'use client';

import { useEffect, useRef } from 'react';
import { X, RotateCcw, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssistantMessage } from './assistant-message';
import { AssistantComposer } from './assistant-composer';
import type { ChatMsg } from './use-assistant-chat';

interface AssistantSheetProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMsg[];
  isStreaming: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onAbort: () => void;
  onReset: () => void;
}

export function AssistantSheet({
  open,
  onClose,
  messages,
  isStreaming,
  error,
  onSend,
  onAbort,
  onReset,
}: AssistantSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[380px] max-w-full flex-col bg-white shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Dataly Assistent</p>
            <p className="text-xs text-slate-400">KI-Hilfe für Ihre Prüfungsplattform</p>
          </div>
          <button
            onClick={onReset}
            title="Gespräch zurücksetzen"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            title="Schließen"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Wie kann ich Ihnen helfen?</p>
                <p className="text-xs text-slate-400 mt-1">
                  Fragen Sie nach Mandanten, Engagements oder PBC-Listen.
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-1.5 w-full">
                {[
                  'Zeig mir alle Engagements von Max Mustermann GmbH',
                  'Wie viele PBC-Items sind noch offen?',
                  'Suche Benutzer Maria',
                ].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => onSend(hint)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors text-left"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => <AssistantMessage key={msg.id} msg={msg} />)
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <AssistantComposer
          onSend={onSend}
          onAbort={onAbort}
          isStreaming={isStreaming}
        />
      </div>
    </>
  );
}
