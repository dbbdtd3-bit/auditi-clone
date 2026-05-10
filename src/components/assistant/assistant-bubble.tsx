'use client';

import { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModalDetector } from './use-modal-detector';
import { useAssistantChat } from './use-assistant-chat';
import { AssistantSheet } from './assistant-sheet';

interface AssistantBubbleProps {
  userId: string;
  userRole: string;
}

export function AssistantBubble({ userId, userRole }: AssistantBubbleProps) {
  void userId;
  void userRole;

  const [open, setOpen] = useState(false);
  const isModalOpen = useModalDetector();
  const chat = useAssistantChat();

  if (isModalOpen) return null;

  return (
    <>
      <AssistantSheet
        open={open}
        onClose={() => setOpen(false)}
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        error={chat.error}
        onSend={chat.sendMessage}
        onAbort={chat.abort}
        onReset={() => {
          chat.reset();
        }}
      />

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg',
          'transition-all duration-200 hover:scale-110 active:scale-95',
          open ? 'bg-slate-700 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700',
        )}
        title={open ? 'Assistent schließen' : 'KI-Assistent öffnen'}
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Bot className="h-6 w-6 text-white" />
        )}
      </button>
    </>
  );
}
