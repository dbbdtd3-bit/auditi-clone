'use client';

import { useState, useCallback, useRef } from 'react';

export type ChatRole = 'user' | 'assistant' | 'tool';

export type ChatMsg = {
  id: string;
  role: ChatRole;
  content: string;
  toolName?: string;
};

export function useAssistantChat(initialThreadId?: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setError(null);

      const userMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      setIsStreaming(true);
      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, threadId }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Fehler ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            if (!part.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(part.slice(6));

              if (evt.event === 'thread') {
                setThreadId(evt.threadId);
              } else if (evt.event === 'token') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + evt.text }
                      : m,
                  ),
                );
              } else if (evt.event === 'tool_call') {
                const toolId = crypto.randomUUID();
                setMessages((prev) => [
                  ...prev,
                  {
                    id: toolId,
                    role: 'tool',
                    content: `Tool wird ausgeführt: ${evt.name}`,
                    toolName: evt.name,
                  },
                ]);
              } else if (evt.event === 'error') {
                setError(evt.message);
              }
            } catch {
              // partial JSON — skip
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: 'Fehler beim Laden der Antwort.' }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, threadId],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abort();
    setMessages([]);
    setThreadId(undefined);
    setError(null);
  }, [abort]);

  return { messages, threadId, isStreaming, error, sendMessage, abort, reset };
}
