export interface SummaryResult {
  purpose: string[];
  changeType: string[];
  risks: string[];
  tests: string[];
  meta?: {
    tokens?: number;
    cost?: number;
    model?: string;
  };
}

export interface LLMProvider {
  name: string;
  summarize(diff: string, customPrompt?: string): Promise<SummaryResult>;
  getModel(): string;
}

export type ProviderName = 'groq' | 'openai' | 'anthropic';

import { AnthropicProvider } from './anthropic';
import { GroqProvider } from './groq';
import { OpenAIProvider } from './openai';

export function detectProvider(): ProviderName | null {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GROQ_API_KEY) return 'groq';
  return null;
}

export function getAvailableProviders(): ProviderName[] {
  const providers: ProviderName[] = [];
  if (process.env.GROQ_API_KEY) providers.push('groq');
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic');
  return providers;
}

export function createProvider(name?: ProviderName, model?: string): LLMProvider {
  const providerName = name || detectProvider();

  if (!providerName) {
    throw new Error(
      'No API key found. Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY'
    );
  }

  switch (providerName) {
    case 'groq':
      return new GroqProvider(model);
    case 'openai':
      return new OpenAIProvider(model);
    case 'anthropic':
      return new AnthropicProvider(model);
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

export { GroqProvider } from './groq';
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
