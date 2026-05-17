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
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? '2025-04-01-preview';
export const WHISPER_DEPLOYMENT = process.env.AZURE_WHISPER_DEPLOYMENT ?? '';

function endpointOrigin(): string {
  if (!ENDPOINT) return '';
  try {
    return new URL(ENDPOINT).origin;
  } catch {
    return ENDPOINT.split('/openai')[0].replace(/\/$/, '');
  }
}

function responsesUrl() {
  return `${endpointOrigin()}/openai/responses?api-version=${API_VERSION}`;
}

function toResponsesInput(messages: ChatMessage[]): { instructions: string | null; input: unknown[] } {
  let instructions: string | null = null;
  const input: unknown[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      instructions = msg.content;
    } else if (msg.role === 'user') {
      input.push({ role: 'user', content: msg.content ?? '' });
    } else if (msg.role === 'assistant') {
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        if (msg.content) {
          input.push({ role: 'assistant', content: msg.content });
        }
        for (const tc of msg.tool_calls) {
          input.push({
            type: 'function_call',
            id: tc.id,
            call_id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          });
        }
      } else {
        input.push({ role: 'assistant', content: msg.content ?? '' });
      }
    } else if (msg.role === 'tool') {
      input.push({
        type: 'function_call_output',
        call_id: msg.tool_call_id ?? '',
        output: msg.content ?? '',
      });
    }
  }

  return { instructions, input };
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

  const { instructions, input } = toResponsesInput(messages);

  const body: Record<string, unknown> = {
    model: DEPLOYMENT,
    input,
    stream: true,
    max_output_tokens: 4096,
  };
  if (instructions) body.instructions = instructions;
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  let response: Response;
  try {
    response = await fetch(responsesUrl(), {
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
      const functionCalls: Record<string, { callId: string; name: string; args: string }> = {};
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          const calls = Object.values(functionCalls);
          if (calls.length > 0) {
            ctrl.enqueue({
              type: 'tool_calls',
              tool_calls: calls.map((c) => ({
                id: c.callId,
                type: 'function' as const,
                function: { name: c.name, arguments: c.args },
              })),
            });
          }
          ctrl.enqueue({ type: 'done' });
          ctrl.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
          if (!dataLine) continue;
          try {
            const parsed = JSON.parse(dataLine.slice(6));

            if (parsed.type === 'response.output_text.delta') {
              ctrl.enqueue({ type: 'token', text: parsed.delta ?? '' });
            } else if (parsed.type === 'response.output_item.added' && parsed.item?.type === 'function_call') {
              const item = parsed.item;
              functionCalls[item.id] = {
                callId: item.call_id ?? item.id,
                name: item.name ?? '',
                args: item.arguments ?? '',
              };
            } else if (parsed.type === 'response.function_call_arguments.delta') {
              const fc = functionCalls[parsed.item_id];
              if (fc) fc.args += parsed.delta ?? '';
            } else if (parsed.type === 'response.function_call_arguments.done') {
              const fc = functionCalls[parsed.item_id];
              if (fc) fc.args = parsed.arguments ?? fc.args;
            } else if (
              parsed.type === 'response.completed' ||
              parsed.type === 'response.failed' ||
              parsed.type === 'response.incomplete'
            ) {
              if (parsed.type === 'response.failed') {
                ctrl.enqueue({ type: 'error', message: parsed.response?.error?.message ?? 'Azure-Fehler' });
              }
              const calls = Object.values(functionCalls);
              if (calls.length > 0) {
                ctrl.enqueue({
                  type: 'tool_calls',
                  tool_calls: calls.map((c) => ({
                    id: c.callId,
                    type: 'function' as const,
                    function: { name: c.name, arguments: c.args },
                  })),
                });
              }
              ctrl.enqueue({ type: 'done' });
              ctrl.close();
              return;
            }
          } catch {
            // partial JSON — skip
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

  const { instructions, input } = toResponsesInput(messages);

  const body: Record<string, unknown> = {
    model: DEPLOYMENT,
    input,
    max_output_tokens: 4096,
  };
  if (instructions) body.instructions = instructions;
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(responsesUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': API_KEY },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Azure Fehler ${res.status}: ${t}`);
  }

  const json = await res.json();

  let content: string | null = null;
  const tool_calls: AzureToolCall[] = [];

  for (const item of json.output ?? []) {
    if (item.type === 'message') {
      for (const part of item.content ?? []) {
        if (part.type === 'output_text') {
          content = (content ?? '') + part.text;
        }
      }
    } else if (item.type === 'function_call') {
      tool_calls.push({
        id: item.call_id ?? item.id,
        type: 'function',
        function: { name: item.name, arguments: item.arguments },
      });
    }
  }

  return { content, tool_calls: tool_calls.length > 0 ? tool_calls : undefined };
}
