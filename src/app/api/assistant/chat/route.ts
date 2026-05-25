import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/require-auth';
import { prisma } from '@/lib/db';
import { streamChatCompletion } from '@/lib/assistant/azure';
import type { ChatMessage, AzureToolCall } from '@/lib/assistant/azure';
import { ASSISTANT_TOOLS, executeTool } from '@/lib/assistant/tools';
import type { ToolResult } from '@/lib/assistant/tools';

const SYSTEM_PROMPT = `Du bist ein KI-Assistent für die Dataly-Prüfungsplattform. Du hilfst Wirtschaftsprüfern und deren Mandanten bei der Arbeit mit PBC-Listen (Prepared By Client), Saldenbestätigungen (SBA) und Engagements.

Du sprichst Deutsch. Du bist präzise, professionell und hilfreich. Wenn du Daten aus der Plattform brauchst, nutze die verfügbaren Tools. Antworte immer auf Basis aktueller Daten aus der Plattform — erfinde keine Zahlen oder Namen.`;

const TOOL_TIMEOUT_MS = 15_000;
const FINAL_RESPONSE_TIMEOUT_MS = 30_000;

type ExecutedToolCall = {
  name: string;
  args: Record<string, unknown>;
  result: ToolResult;
};

type MandantResult = {
  id: string;
  name?: string | null;
  legalName?: string | null;
};

type EngagementResult = {
  title?: string | null;
  fiscalYear?: number | null;
  type?: string | null;
  status?: string | null;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function extractEngagementMandantQuery(message: string): string | null {
  const normalized = message.trim().replace(/\s+/g, ' ');
  if (!/\bengagements?\b/i.test(normalized)) return null;

  const match =
    normalized.match(/\bengagements?\b.*?\b(?:von|fuer|fur|für|zu|bei)\s+(.+?)[?.!]*$/i) ??
    normalized.match(/\b(?:von|fuer|fur|für|zu|bei)\s+(.+?)\s+\bengagements?\b/i);

  return match?.[1]?.trim() || null;
}

function formatEngagementResponse(
  query: string,
  mandanten: MandantResult[],
  engagements: EngagementResult[] | null,
): string {
  if (mandanten.length === 0) {
    return `Ich habe keinen Mandanten zu "${query}" gefunden.`;
  }

  if (mandanten.length > 1 && !engagements) {
    const rows = mandanten.map((m) => `- ${m.legalName || m.name || m.id}`).join('\n');
    return `Ich habe mehrere passende Mandanten gefunden. Bitte wähle einen davon aus:\n\n${rows}`;
  }

  const mandant = mandanten[0];
  const label = mandant.legalName || mandant.name || query;

  if (!engagements || engagements.length === 0) {
    return `Für ${label} habe ich keine Engagements gefunden.`;
  }

  const rows = engagements
    .map((e) => {
      const year = e.fiscalYear ? ` ${e.fiscalYear}` : '';
      const type = e.type ? `, Typ: ${e.type}` : '';
      const status = e.status ? `, Status: ${e.status}` : '';
      return `- ${e.title || 'Engagement'}${year}${type}${status}`;
    })
    .join('\n');

  return `Für ${label} habe ich diese Engagements gefunden:\n\n${rows}`;
}

function formatToolFallbackResponse(message: string, executedTools: ExecutedToolCall[]): string {
  const engagementQuery = extractEngagementMandantQuery(message);
  const mandantTool = executedTools.find((tool) => tool.name === 'lookup_mandant');
  const engagementTool = executedTools.find((tool) => tool.name === 'lookup_engagement');

  if (engagementQuery && mandantTool?.result.success) {
    return formatEngagementResponse(
      engagementQuery,
      asArray<MandantResult>(mandantTool.result.data),
      engagementTool?.result.success ? asArray<EngagementResult>(engagementTool.result.data) : null,
    );
  }

  const lastTool = executedTools.at(-1);
  if (!lastTool) {
    return 'Ich konnte die Anfrage nicht abschliessen, weil kein Tool-Ergebnis vorliegt.';
  }

  if (!lastTool.result.success) {
    return `Beim Abrufen der Daten gab es ein Problem: ${lastTool.result.error ?? 'Unbekannter Fehler'}`;
  }

  const rows = asArray<Record<string, unknown>>(lastTool.result.data);
  if (rows.length === 0) {
    return 'Ich habe keine passenden Datensätze gefunden.';
  }

  return `Ich habe diese Daten gefunden:\n\n${JSON.stringify(lastTool.result.data, null, 2)}`;
}

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

        const directEngagementQuery = extractEngagementMandantQuery(message);
        if (directEngagementQuery) {
          ctrl.enqueue(encodeSSE('tool_call', { name: 'lookup_mandant' }));
          const mandantResult = await withTimeout(
            executeTool('lookup_mandant', { query: directEngagementQuery }, user),
            TOOL_TIMEOUT_MS,
            'Die Mandantensuche hat zu lange gedauert.',
          );
          await prisma.assistantMessage.create({
            data: {
              threadId: resolvedThreadId,
              role: 'tool',
              content: JSON.stringify(mandantResult.success ? mandantResult.data : { error: mandantResult.error }),
            },
          });

          const mandanten = mandantResult.success ? asArray<MandantResult>(mandantResult.data) : [];
          let engagements: EngagementResult[] | null = null;

          if (mandanten.length === 1) {
            ctrl.enqueue(encodeSSE('tool_call', { name: 'lookup_engagement' }));
            const engagementResult = await withTimeout(
              executeTool('lookup_engagement', { mandantId: mandanten[0].id }, user),
              TOOL_TIMEOUT_MS,
              'Die Engagementsuche hat zu lange gedauert.',
            );
            await prisma.assistantMessage.create({
              data: {
                threadId: resolvedThreadId,
                role: 'tool',
                content: JSON.stringify(engagementResult.success ? engagementResult.data : { error: engagementResult.error }),
              },
            });
            engagements = engagementResult.success ? asArray<EngagementResult>(engagementResult.data) : [];
          }

          const directContent = mandantResult.success
            ? formatEngagementResponse(directEngagementQuery, mandanten, engagements)
            : `Beim Abrufen der Daten gab es ein Problem: ${mandantResult.error ?? 'Unbekannter Fehler'}`;

          ctrl.enqueue(encodeSSE('token', { text: directContent }));
          await prisma.assistantMessage.create({
            data: {
              threadId: resolvedThreadId,
              role: 'assistant',
              content: directContent,
            },
          });
          await prisma.assistantThread.update({
            where: { id: resolvedThreadId },
            data: { updatedAt: new Date() },
          });
          ctrl.enqueue(encodeSSE('done', { threadId: resolvedThreadId }));
          ctrl.close();
          return;
        }

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
          const executedTools: ExecutedToolCall[] = [];

          for (const tc of toolCalls) {
            ctrl.enqueue(encodeSSE('tool_call', { name: tc.function.name }));

            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
              args = {};
            }

            const result = await withTimeout(
              executeTool(tc.function.name, args, user),
              TOOL_TIMEOUT_MS,
              `Tool ${tc.function.name} hat zu lange gedauert.`,
            );
            executedTools.push({ name: tc.function.name, args, result });
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
          let finalContent = '';

          try {
            const finalStream = await withTimeout(
              streamChatCompletion(toolMessages),
              FINAL_RESPONSE_TIMEOUT_MS,
              'Azure OpenAI hat nicht rechtzeitig auf das Tool-Ergebnis geantwortet.',
            );
            const finalReader = finalStream.getReader();

            while (true) {
              const { done, value } = await withTimeout(
                finalReader.read(),
                FINAL_RESPONSE_TIMEOUT_MS,
                'Azure OpenAI hat den Antwortstream nicht abgeschlossen.',
              );
              if (done) break;

              if (value.type === 'token') {
                finalContent += value.text;
                ctrl.enqueue(encodeSSE('token', { text: value.text }));
              } else if (value.type === 'error') {
                throw new Error(value.message);
              }
            }
          } catch (err) {
            console.warn('Assistant final response fallback:', err);
            finalContent = formatToolFallbackResponse(message, executedTools);
            ctrl.enqueue(encodeSSE('token', { text: finalContent }));
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
