import { describe, expect, it } from 'vitest';
import { requestAiProvider, type AiProviderRequest } from './aiProvider';

const baseRequest: AiProviderRequest = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  apiKey: 'test-key',
  prompt: 'hello',
};

describe('requestAiProvider', () => {
  it('parses OpenAI response text through an injected fetch client', async () => {
    const fetchClient = async () =>
      new Response(JSON.stringify({ output_text: 'TodoFlow AI config OK' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    await expect(requestAiProvider(baseRequest, fetchClient)).resolves.toBe('TodoFlow AI config OK');
  });

  it('throws provider API error messages from failed responses', async () => {
    const fetchClient = async () =>
      new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

    await expect(requestAiProvider(baseRequest, fetchClient)).rejects.toThrow('Invalid API key');
  });

  it('requires an API key before making provider requests', async () => {
    let called = false;
    const fetchClient = async () => {
      called = true;
      return new Response('{}');
    };

    await expect(requestAiProvider({ ...baseRequest, apiKey: ' ' }, fetchClient)).rejects.toThrow('API key is required.');
    expect(called).toBe(false);
  });
});
