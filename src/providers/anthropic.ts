import type { LLMProvider, SummaryResult } from './index';

const DEFAULT_MODEL = 'claude-3-5-haiku-latest';
const API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a senior engineer reviewing a git diff.

Given the user's diff, respond ONLY with a JSON object of this shape:
{
  "purpose": ["..."],
  "changeType": ["..."],
  "risks": ["..."],
  "tests": ["..."]
}

- "purpose": high-level intent behind the change
- "changeType": whether this is a refactor or behavior change
- "risks": what could break
- "tests": what tests should exist

Be concise.
Do NOT restate the diff line by line.`;

// Pricing per 1M tokens (as of 2024)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-5-haiku-latest': { input: 0.8, output: 4 },
  'claude-3-5-sonnet-latest': { input: 3, output: 15 },
  'claude-3-opus-latest': { input: 15, output: 75 },
};

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private model: string;
  private apiKey: string;

  constructor(model?: string) {
    this.model = model || DEFAULT_MODEL;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  getModel(): string {
    return this.model;
  }

  async summarize(diff: string, customPrompt?: string): Promise<SummaryResult> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 500,
        system: customPrompt || SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: diff,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const data = (await response.json()) as {
      content?: {
        type: string;
        text?: string;
      }[];
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
      };
    };

    const textContent = data.content?.find((c) => c.type === 'text');
    const messageContent = textContent?.text;
    if (!messageContent) {
      throw new Error('No content returned from Anthropic');
    }

    const cleanedContent = messageContent
      .replace(/^\s*```(?:json)?/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedContent) as SummaryResult;

    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    return {
      purpose: parsed.purpose || [],
      changeType: parsed.changeType || [],
      risks: parsed.risks || [],
      tests: parsed.tests || [],
      meta: {
        tokens: inputTokens + outputTokens,
        cost: this.calculateCost(inputTokens, outputTokens),
        model: this.model,
      },
    };
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[this.model] || PRICING['claude-3-5-haiku-latest'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }
}
