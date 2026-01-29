import type { SummaryResult } from '../providers';
import type { FormatOptions } from './index';

export async function formatJSON(
  result: SummaryResult,
  options: FormatOptions = {}
): Promise<string> {
  const output: Record<string, unknown> = {
    purpose: result.purpose,
    changeType: result.changeType,
    risks: result.risks,
    tests: result.tests,
  };

  if (options.showCost && result.meta) {
    output.meta = {
      tokens: result.meta.tokens,
      cost: result.meta.cost,
      provider: options.provider || result.meta.model,
    };
  }

  return JSON.stringify(output, null, 2);
}
