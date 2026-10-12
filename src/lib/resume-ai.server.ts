import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText, Output } from 'ai';
import type { z } from 'zod';
import { createLovableAiGatewayRunIdFetch } from './ai/run-id.ts';

export async function structuredAI<T>(schema: z.ZodType<T>, instructions: string, prompt: string, nebiusKey?: string, selectedModel?: string): Promise<T> {
  const output = Output.object({ schema });
  if (nebiusKey && selectedModel) {
    const provider = createOpenAICompatible({ name: 'nebius', baseURL: 'https://api.tokenfactory.nebius.com/v1', apiKey: nebiusKey, supportsStructuredOutputs: true });
    const result = streamText({ model: provider(selectedModel), system: instructions, prompt, output, maxRetries: 0 });
    return await result.output;
  }
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error('AI is not configured');
  const run = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({ baseURL: 'https://ai.gateway.lovable.dev/v1', apiKey: key, headers: { 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' }, fetch: run.fetch });
  const result = streamText({ model: provider.responses('openai/gpt-6-astra'), instructions, prompt, output, maxRetries: 0, providerOptions: { openai: { forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', store: false, include: ['reasoning.encrypted_content'] } } });
  return await result.output;
}