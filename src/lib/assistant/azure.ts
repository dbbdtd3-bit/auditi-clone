export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: AzureToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type AzureToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type AzureTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ?? '';
const API_KEY = process.env.AZURE_OPENAI_API_KEY ?? '';
const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o';
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21';

function chatUrl() {
  const base = ENDPOINT.endsWith('/') ? ENDPOINT.slice(0, -1) : ENDPOINT;
  return `${base}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
}

export type StreamChunk =
  | { type: 'token'; text: string }
  | { type: 'tool_calls'; tool_calls: AzureToolCall[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

export async function streamChatCompletion(
  messages: ChatMessage[],
  tools?: AzureTool[],
): Promise<ReadableStream<StreamChunk>> {
  if (!ENDPOINT || !API_KEY) {
    return new ReadableStream({
      start(ctrl) {
        ctrl.enqueue({ type: 'error', message: 'Azure OpenAI ist noch nicht konfiguriert. Bitte die API-Schlüssel in der .env eintragen.' });
        ctrl.enqueue({ type: 'done' });
        ctrl.close();
      },
    });
  }

  const body: Record<string, unknown> = {
    messages,
    stream: true,
    max_tokens: 1024,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  let response: Response;
  try {
    response = await fetch(chatUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Netzwerkfehler';
    return new ReadableStream({
      start(ctrl) {
        ctrl.enqueue({ type: 'error', message: msg });
        ctrl.enqueue({ type: 'done' });
        ctrl.close();
      },
    });
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    return new ReadableStream({
      start(ctrl) {
        ctrl.enqueue({ type: 'error', message: `Azure Fehler ${response.status}: ${text}` });
        ctrl.enqueue({ type: 'done' });
        ctrl.close();
      },
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<StreamChunk>({
    async pull(ctrl) {
      const accumulatedToolCalls: Record<number, { id: string; name: string; args: string }> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          const calls = Object.values(accumulatedToolCalls);
          if (calls.length > 0) {
            ctrl.enqueue({
              type: 'tool_calls',
              tool_calls: calls.map((c) => ({
                id: c.id,
                type: 'function' as const,
                function: { name: c.name, arguments: c.args },
              })),
            });
          }
          ctrl.enqueue({ type: 'done' });
          ctrl.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            const calls = Object.values(accumulatedToolCalls);
            if (calls.length > 0) {
              ctrl.enqueue({
                type: 'tool_calls',
                tool_calls: calls.map((c) => ({
                  id: c.id,
                  type: 'function' as const,
                  function: { name: c.name, arguments: c.args },
                })),
              });
            }
            ctrl.enqueue({ type: 'done' });
            ctrl.close();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              ctrl.enqueue({ type: 'token', text: delta.content });
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx: number = tc.index ?? 0;
                if (!accumulatedToolCalls[idx]) {
                  accumulatedToolCalls[idx] = { id: tc.id ?? '', name: tc.function?.name ?? '', args: '' };
                }
                if (tc.id) accumulatedToolCalls[idx].id = tc.id;
                if (tc.function?.name) accumulatedToolCalls[idx].name = tc.function.name;
                if (tc.function?.arguments) accumulatedToolCalls[idx].args += tc.function.arguments;
              }
            }
          } catch {
            // partial chunk — skip
          }
        }
      }
    },
  });
}

export async function nonStreamChatCompletion(
  messages: ChatMessage[],
  tools?: AzureTool[],
): Promise<{ content: string | null; tool_calls?: AzureToolCall[] }> {
  if (!ENDPOINT || !API_KEY) {
    return { content: 'Azure OpenAI ist noch nicht konfiguriert.' };
  }

  const body: Record<string, unknown> = { messages, max_tokens: 1024 };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(chatUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': API_KEY },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Azure Fehler ${res.status}: ${t}`);
  }

  const json = await res.json();
  const choice = json?.choices?.[0];
  return {
    content: choice?.message?.content ?? null,
    tool_calls: choice?.message?.tool_calls,
  };
}
