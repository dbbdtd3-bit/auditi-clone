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
  call_id?: string;
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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? process.env.OPENAI_RESPONSES_MODEL ?? '';
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '');

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ?? '';
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY ?? '';
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT ?? '';
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? '2025-04-01-preview';

const DEFAULT_MODEL = 'gpt-4o';

export const WHISPER_DEPLOYMENT =
  process.env.OPENAI_WHISPER_MODEL ?? process.env.AZURE_WHISPER_DEPLOYMENT ?? '';

type ProviderConfig = {
  label: string;
  model: string;
  url: string;
  headers: Record<string, string>;
};

type ResponsesTool = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: false;
};

function endpointOrigin(endpoint: string): string {
  if (!endpoint) return '';
  try {
    return new URL(endpoint).origin;
  } catch {
    return endpoint.split('/openai')[0].replace(/\/$/, '');
  }
}

function azureResponsesUrl() {
  return `${endpointOrigin(AZURE_ENDPOINT)}/openai/responses?api-version=${AZURE_API_VERSION}`;
}

function openAiResponsesUrl() {
  return `${OPENAI_BASE_URL}/responses`;
}

function getProviderConfig(): ProviderConfig | null {
  if (AZURE_ENDPOINT && AZURE_API_KEY) {
    return {
      label: 'Azure OpenAI',
      model: AZURE_DEPLOYMENT || OPENAI_MODEL || DEFAULT_MODEL,
      url: azureResponsesUrl(),
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_API_KEY,
      },
    };
  }

  if (OPENAI_API_KEY) {
    return {
      label: 'OpenAI',
      model: OPENAI_MODEL || DEFAULT_MODEL,
      url: openAiResponsesUrl(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    };
  }

  if (AZURE_API_KEY && !AZURE_ENDPOINT) {
    return {
      label: 'OpenAI',
      model: OPENAI_MODEL || AZURE_DEPLOYMENT || DEFAULT_MODEL,
      url: openAiResponsesUrl(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AZURE_API_KEY}`,
      },
    };
  }

  return null;
}

function toResponsesTools(tools?: AzureTool[]): ResponsesTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;

  return tools.map((tool) => ({
    type: 'function' as const,
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
    strict: false,
  }));
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
          const functionCall: Record<string, unknown> = {
            type: 'function_call',
            call_id: tc.call_id ?? tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          };
          if (tc.id.startsWith('fc')) functionCall.id = tc.id;
          input.push(functionCall);
        }
      } else {
        input.push({ role: 'assistant', content: msg.content ?? '' });
      }
    } else if (msg.role === 'tool') {
      if (!msg.tool_call_id) continue;
      input.push({
        type: 'function_call_output',
        call_id: msg.tool_call_id,
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
  const provider = getProviderConfig();

  if (!provider) {
    return new ReadableStream({
      start(ctrl) {
        ctrl.enqueue({ type: 'error', message: 'OpenAI ist noch nicht konfiguriert. Bitte OPENAI_API_KEY in der .env eintragen.' });
        ctrl.enqueue({ type: 'done' });
        ctrl.close();
      },
    });
  }

  const { instructions, input } = toResponsesInput(messages);

  const body: Record<string, unknown> = {
    model: provider.model,
    input,
    stream: true,
    max_output_tokens: 4096,
  };
  if (instructions) body.instructions = instructions;
  const responsesTools = toResponsesTools(tools);
  if (responsesTools) {
    body.tools = responsesTools;
    body.tool_choice = 'auto';
  }

  let response: Response;
  try {
    response = await fetch(provider.url, {
      method: 'POST',
      headers: provider.headers,
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
        ctrl.enqueue({ type: 'error', message: `${provider.label} Fehler ${response.status}: ${text}` });
        ctrl.enqueue({ type: 'done' });
        ctrl.close();
      },
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<StreamChunk>({
    async pull(ctrl) {
      const functionCalls: Record<string, { id: string; callId: string; name: string; args: string }> = {};
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          const calls = Object.values(functionCalls);
          if (calls.length > 0) {
            ctrl.enqueue({
              type: 'tool_calls',
              tool_calls: calls.map((c) => ({
                id: c.id,
                type: 'function' as const,
                call_id: c.callId,
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
                id: item.id,
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
                ctrl.enqueue({ type: 'error', message: parsed.response?.error?.message ?? `${provider.label}-Fehler` });
              }
              const calls = Object.values(functionCalls);
              if (calls.length > 0) {
                ctrl.enqueue({
                  type: 'tool_calls',
                  tool_calls: calls.map((c) => ({
                    id: c.id,
                    type: 'function' as const,
                    call_id: c.callId,
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
  const provider = getProviderConfig();

  if (!provider) {
    return { content: 'OpenAI ist noch nicht konfiguriert.' };
  }

  const { instructions, input } = toResponsesInput(messages);

  const body: Record<string, unknown> = {
    model: provider.model,
    input,
    max_output_tokens: 4096,
  };
  if (instructions) body.instructions = instructions;
  const responsesTools = toResponsesTools(tools);
  if (responsesTools) {
    body.tools = responsesTools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(provider.url, {
    method: 'POST',
    headers: provider.headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${provider.label} Fehler ${res.status}: ${t}`);
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
        id: item.id,
        type: 'function',
        call_id: item.call_id ?? item.id,
        function: { name: item.name, arguments: item.arguments },
      });
    }
  }

  return { content, tool_calls: tool_calls.length > 0 ? tool_calls : undefined };
}
