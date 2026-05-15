export type AiProvider = 'openai' | 'anthropic' | 'gemini';

export interface AiProviderRequest {
  provider: AiProvider;
  model: string;
  apiKey: string;
  prompt: string;
}

type FetchClient = typeof fetch;

async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getErrorMessage(data: any, fallback: string): string {
  return data?.error?.message || fallback;
}

function getOpenAiText(data: any): string {
  return data.output_text || data.output?.[0]?.content?.[0]?.text || JSON.stringify(data, null, 2);
}

function getClaudeText(data: any): string {
  return data.content?.map((item: { text?: string }) => item.text).filter(Boolean).join('\n') || JSON.stringify(data, null, 2);
}

function getGeminiText(data: any): string {
  return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text).filter(Boolean).join('\n') || JSON.stringify(data, null, 2);
}

export async function requestAiProvider(
  config: AiProviderRequest,
  fetchClient: FetchClient = fetch
): Promise<string> {
  if (!config.apiKey.trim()) {
    throw new Error('API key is required.');
  }

  if (config.provider === 'openai') {
    const response = await fetchClient('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        input: config.prompt,
      }),
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(getErrorMessage(data, 'OpenAI request failed.'));
    return getOpenAiText(data);
  }

  if (config.provider === 'anthropic') {
    const response = await fetchClient('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: config.prompt }],
      }),
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(getErrorMessage(data, 'Claude request failed.'));
    return getClaudeText(data);
  }

  const response = await fetchClient(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: config.prompt }] }],
      }),
    }
  );
  const data = await readJson(response);
  if (!response.ok) throw new Error(getErrorMessage(data, 'Gemini request failed.'));
  return getGeminiText(data);
}
