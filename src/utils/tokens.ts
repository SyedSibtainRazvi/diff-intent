import { encode } from 'gpt-tokenizer';

export interface TokenInfo {
  count: number;
  estimatedCost: number;
  warning?: string;
}

// Token limits for different models
const MODEL_LIMITS: Record<string, number> = {
  // Groq
  'llama-3.3-70b-versatile': 131072,
  'llama-3.1-8b-instant': 131072,

  // OpenAI
  'gpt-4o-mini': 128000,
  'gpt-4o': 128000,
  'gpt-4-turbo': 128000,
  'gpt-3.5-turbo': 16385,

  // Anthropic
  'claude-3-5-haiku-latest': 200000,
  'claude-3-5-sonnet-latest': 200000,
  'claude-3-opus-latest': 200000,
};

// Pricing per 1M tokens (input)
const INPUT_PRICING: Record<string, number> = {
  // Groq (free tier)
  'llama-3.3-70b-versatile': 0,
  'llama-3.1-8b-instant': 0,

  // OpenAI
  'gpt-4o-mini': 0.15,
  'gpt-4o': 2.5,
  'gpt-4-turbo': 10,
  'gpt-3.5-turbo': 0.5,

  // Anthropic
  'claude-3-5-haiku-latest': 0.8,
  'claude-3-5-sonnet-latest': 3,
  'claude-3-opus-latest': 15,
};

export function countTokens(text: string): number {
  try {
    return encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

export function estimateCost(tokens: number, model: string): number {
  const pricePerMillion = INPUT_PRICING[model] ?? 0;
  return (tokens / 1_000_000) * pricePerMillion;
}

export function getTokenLimit(model: string): number {
  return MODEL_LIMITS[model] ?? 100000;
}

export function analyzeTokens(text: string, model: string): TokenInfo {
  const count = countTokens(text);
  const estimatedCost = estimateCost(count, model);
  const limit = getTokenLimit(model);

  let warning: string | undefined;
  if (count > limit * 0.8) {
    warning = `Token count (${count}) is approaching model limit (${limit})`;
  } else if (count > limit * 0.5) {
    warning = `Large diff: ${count} tokens`;
  }

  return {
    count,
    estimatedCost,
    warning,
  };
}

export function formatCost(cost: number): string {
  if (cost === 0) {
    return 'Free';
  }
  if (cost < 0.001) {
    return '<$0.001';
  }
  return `~$${cost.toFixed(4)}`;
}

export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function shouldWarnAboutTokens(text: string, model: string): boolean {
  const count = countTokens(text);
  const limit = getTokenLimit(model);
  return count > limit * 0.8;
}
