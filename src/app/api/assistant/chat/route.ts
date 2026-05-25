import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/require-auth';
import { prisma } from '@/lib/db';
import { streamChatCompletion } from '@/lib/assistant/azure';
import type { ChatMessage, AzureToolCall } from '@/lib/assistant/azure';
import { ASSISTANT_TOOLS, executeTool } from '@/lib/assistant/tools';

const SYSTEM_PROMPT = `Du bist ein KI-Assistent für die Dataly-Prüfungsplattform. Du hilfst Wirtschaftsprüfern und deren Mandanten bei der Arbeit mit PBC-Listen (Prepared By Client), Saldenbestätigungen (SBA) und Engagements.

Du sprichst Deutsch. Du bist präzise, professionell und hilfreich. Wenn du Daten aus der Plattform brauchst, nutze die verfügbaren Tools. Antworte immer auf Basis aktueller Daten aus der Plattform — erfinde keine Zahlen oder Namen.`;

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) {
    return new Response('Ungültiger Request-Body', { status: 400 });
  }

  const { message, threadId } = body as { message: string; threadId?: string };
  if (!message?.trim()) {
    return new Response('Nachricht fehlt', { status: 400 });
  }

  // Thread ermitteln / anlegen
  let resolvedThreadId = threadId;
  if (!resolvedThreadId) {
    const thread = await prisma.assistantThread.create({
      data: { userId: user.id, title: message.slice(0, 60) },
    });
    resolvedThreadId = thread.id;
  } else {
    const thread = await prisma.assistantThread.findUnique({
      where: { id: resolvedThreadId },
      select: { userId: true },
    });
    if (!thread || thread.userId !== user.id) {
      return new Response('Thread nicht gefunden', { status: 404 });
    }
  }

  // Bestehende Messages laden (letzte 20 für Kontext)
  const history = await prisma.assistantMessage.findMany({
    where: { threadId: resolvedThreadId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const historyMessages: ChatMessage[] = history.flatMap((m) => {
    if (m.role === 'tool') return [];

    const msg: ChatMessage = {
      role: m.role as ChatMessage['role'],
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    };

    if (m.toolCalls && msg.content) {
      msg.tool_calls = m.toolCalls as unknown as AzureToolCall[];
    }

    if (m.toolCalls && !msg.content) return [];

    return [msg];
  });

  // Neue User-Nachricht in DB speichern
  await prisma.assistantMessage.create({
    data: {
      threadId: resolvedThreadId,
      role: 'user',
      content: message,
    },
  });

  await prisma.assistantThread.update({
    where: { id: resolvedThreadId },
    data: { updatedAt: new Date() },
  });

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...historyMessages,
    { role: 'user', content: message },
  ];

  const encoder = new TextEncoder();

  function encodeSSE(event: string, data: unknown): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify({ event, ...( typeof data === 'object' && data !== null ? data : { value: data } ) })}\n\n`);
  }

  const stream = new ReadableStream({
    async start(ctrl) {
      let assistantContent = '';
      let toolCalls: AzureToolCall[] | undefined;
      let assistantResponseId: string | undefined;
      let assistantResponseItems: Record<string, unknown>[] | undefined;

      try {
        // Thread-ID an Client senden
        ctrl.enqueue(encodeSSE('thread', { threadId: resolvedThreadId }));

        // Erste Completion (ggf. mit Tool-Calls)
        const assistantStream = await streamChatCompletion(messages, ASSISTANT_TOOLS);
        const reader = assistantStream.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value.type === 'token') {
            assistantContent += value.text;
            ctrl.enqueue(encodeSSE('token', { text: value.text }));
          } else if (value.type === 'tool_calls') {
            toolCalls = value.tool_calls;
            assistantResponseId = value.response_id;
            assistantResponseItems = value.response_items;
          } else if (value.type === 'error') {
            ctrl.enqueue(encodeSSE('error', { message: value.message }));
            ctrl.enqueue(encodeSSE('done', { threadId: resolvedThreadId }));
            ctrl.close();
            return;
          }
        }

        // Tool-Loop
        if (toolCalls && toolCalls.length > 0) {
          // Assistant-Message mit tool_calls speichern
          await prisma.assistantMessage.create({
            data: {
              threadId: resolvedThreadId,
              role: 'assistant',
              content: assistantContent || '',
              toolCalls: toolCalls as unknown as Parameters<typeof prisma.assistantMessage.create>[0]['data']['toolCalls'],
            },
          });

          const toolMessages: ChatMessage[] = [
            {
              role: 'assistant',
              content: assistantContent || null,
              previous_response_id: assistantResponseId,
              response_items: assistantResponseItems,
              tool_calls: toolCalls,
            },
          ];

          for (const tc of toolCalls) {
            ctrl.enqueue(encodeSSE('tool_call', { name: tc.function.name }));

            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
              args = {};
            }

            const result = await executeTool(tc.function.name, args, user);
            const resultStr = JSON.stringify(result.success ? result.data : { error: result.error });

            await prisma.assistantMessage.create({
              data: {
                threadId: resolvedThreadId,
                role: 'tool',
                content: resultStr,
              },
            });

            toolMessages.push({
              role: 'tool',
              content: resultStr,
              tool_call_id: tc.call_id ?? tc.id,
              name: tc.function.name,
            });
          }

          // Finale Antwort nach Tool-Execution
          const finalStream = await streamChatCompletion(toolMessages);
          const finalReader = finalStream.getReader();
          let finalContent = '';

          while (true) {
            const { done, value } = await finalReader.read();
            if (done) break;

            if (value.type === 'token') {
              finalContent += value.text;
              ctrl.enqueue(encodeSSE('token', { text: value.text }));
            } else if (value.type === 'error') {
              ctrl.enqueue(encodeSSE('error', { message: value.message }));
              ctrl.enqueue(encodeSSE('done', { threadId: resolvedThreadId }));
              ctrl.close();
              return;
            }
          }

          await prisma.assistantMessage.create({
            data: {
              threadId: resolvedThreadId,
              role: 'assistant',
              content: finalContent,
            },
          });
        } else {
          // Reine Text-Antwort ohne Tools
          if (assistantContent) {
            await prisma.assistantMessage.create({
              data: {
                threadId: resolvedThreadId,
                role: 'assistant',
                content: assistantContent,
              },
            });
          }
        }

        await prisma.assistantThread.update({
          where: { id: resolvedThreadId },
          data: { updatedAt: new Date() },
        });

        ctrl.enqueue(encodeSSE('done', { threadId: resolvedThreadId }));
        ctrl.close();
      } catch (err) {
        console.error('Assistant chat error:', err);
        ctrl.enqueue(encodeSSE('error', { message: 'Interner Fehler beim Verarbeiten der Anfrage.' }));
        ctrl.enqueue(encodeSSE('done', { threadId: resolvedThreadId }));
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
