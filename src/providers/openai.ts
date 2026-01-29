import type { LLMProvider, SummaryResult } from './index';

const DEFAULT_MODEL = 'gpt-4o-mini';
const API_URL = 'https://api.openai.com/v1/chat/completions';

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
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
};

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private model: string;
  private apiKey: string;

  constructor(model?: string) {
    this.model = model || DEFAULT_MODEL;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
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
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: customPrompt || SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: diff,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = (await response.json()) as {
      choices?: {
        message?: {
          content?: string;
        };
      }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) {
      throw new Error('No content returned from OpenAI');
    }

    const cleanedContent = messageContent
      .replace(/^\s*```(?:json)?/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedContent) as SummaryResult;

    return {
      purpose: parsed.purpose || [],
      changeType: parsed.changeType || [],
      risks: parsed.risks || [],
      tests: parsed.tests || [],
      meta: {
        tokens: data.usage?.total_tokens,
        cost: this.calculateCost(
          data.usage?.prompt_tokens || 0,
          data.usage?.completion_tokens || 0
        ),
        model: this.model,
      },
    };
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[this.model] || PRICING['gpt-4o-mini'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }
}
