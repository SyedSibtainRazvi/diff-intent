import type { LLMProvider, SummaryResult } from './index';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

export class GroqProvider implements LLMProvider {
  name = 'groq';
  private model: string;
  private apiKey: string;

  constructor(model?: string) {
    this.model = model || DEFAULT_MODEL;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
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
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = (await response.json()) as {
      choices?: {
        message?: {
          content?: string;
        };
      }[];
      usage?: {
        total_tokens?: number;
      };
    };

    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) {
      throw new Error('No content returned from Groq');
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
        cost: this.calculateCost(data.usage?.total_tokens || 0),
        model: this.model,
      },
    };
  }

  private calculateCost(tokens: number): number {
    // Groq is free tier, but we track for consistency
    return 0;
  }
}
