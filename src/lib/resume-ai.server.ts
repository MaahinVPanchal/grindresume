import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText, Output } from 'ai';
import type { z } from 'zod';
import { createLovableAiGatewayRunIdFetch } from './ai/run-id.ts';

export async function structuredAI<T>(schema: z.ZodType<T>, instructions: string, prompt: string, nebiusKey?: string, selectedModel?: string): Promise<T> {
  const output = Output.object({ schema });
  // BYOK uses the caller's key + chosen model; otherwise free features run on the owner's
  // server-side Nebius key with the same model the chat demo uses.
  const key = nebiusKey && selectedModel ? nebiusKey : process.env['NEBIUS_API_KEY'];
  // Free features use a model the owner's Nebius account can access and that supports JSON schema output.
  const model = nebiusKey && selectedModel ? selectedModel : process.env['DEMO_STRUCTURED_MODEL'] || 'Qwen/Qwen3-235B-A22B-Instruct-2507';
  if (key) {
    const provider = createOpenAICompatible({ name: 'nebius', baseURL: 'https://api.tokenfactory.nebius.com/v1', apiKey: key, supportsStructuredOutputs: true });
    const result = streamText({ model: provider(model), system: instructions, prompt, output, maxRetries: 0 });
    return await result.output;
  }
  const key2 = process.env['LOVABLE_API_KEY'];
  if (!key2) throw new Error('AI is not configured');
  const run = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({ baseURL: 'https://ai.gateway.lovable.dev/v1', apiKey: key2, headers: { 'Lovable-API-Key': key2, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' }, fetch: run.fetch });
  const result = streamText({ model: provider.responses('openai/gpt-6-astra'), instructions, prompt, output, maxRetries: 0, providerOptions: { openai: { forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', store: false, include: ['reasoning.encrypted_content'] } } });
  return await result.output;
}