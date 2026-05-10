'use client';

import { useRef, useState } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssistantComposerProps {
  onSend: (text: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function AssistantComposer({
  onSend,
  onAbort,
  isStreaming,
  disabled,
}: AssistantComposerProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <div className="flex items-end gap-2 border-t border-slate-200 bg-white px-3 py-3">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Nachricht eingeben… (Enter zum Senden)"
        rows={1}
        disabled={disabled}
        className={cn(
          'flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
          'disabled:opacity-50 max-h-40 overflow-y-auto',
        )}
      />
      {isStreaming ? (
        <button
          onClick={onAbort}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          title="Abbrechen"
        >
          <Square className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
            text.trim() && !disabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed',
          )}
          title="Senden"
        >
          <Send className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
