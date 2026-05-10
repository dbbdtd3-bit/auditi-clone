'use client';

import { cn } from '@/lib/utils';
import { Bot, User, Wrench } from 'lucide-react';
import type { ChatMsg } from './use-assistant-chat';

const TOOL_LABELS: Record<string, string> = {
  lookup_mandant: 'Mandanten suchen',
  lookup_engagement: 'Engagements suchen',
  lookup_user: 'Benutzer suchen',
  list_pbc_lists: 'PBC-Listen abrufen',
  summarize_engagement: 'Engagement zusammenfassen',
};

export function AssistantMessage({ msg }: { msg: ChatMsg }) {
  if (msg.role === 'tool') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 px-1 py-0.5">
        <Wrench className="h-3 w-3 shrink-0" />
        <span>{msg.toolName ? (TOOL_LABELS[msg.toolName] ?? msg.toolName) : msg.content}</span>
      </div>
    );
  }

  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-blue-600' : 'bg-slate-700',
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-white" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-white" />
        )}
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-slate-100 text-slate-900 rounded-tl-sm',
        )}
      >
        {msg.content || (
          <span className="inline-flex gap-1">
            <span className="animate-bounce">·</span>
            <span className="animate-bounce [animation-delay:0.15s]">·</span>
            <span className="animate-bounce [animation-delay:0.3s]">·</span>
          </span>
        )}
      </div>
    </div>
  );
}
