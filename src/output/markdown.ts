import type { SummaryResult } from '../providers';
import { formatCost, formatTokenCount } from '../utils/tokens';
import type { FormatOptions } from './index';

export async function formatMarkdown(
  result: SummaryResult,
  options: FormatOptions = {}
): Promise<string> {
  const lines: string[] = [];

  lines.push('## Diff Intent Summary');
  lines.push('');

  if (result.purpose.length > 0) {
    lines.push('### Purpose');
    for (const item of result.purpose) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  if (result.changeType.length > 0) {
    lines.push('### Change Type');
    for (const item of result.changeType) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  if (result.risks.length > 0) {
    lines.push('### What Could Break');
    for (const item of result.risks) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  if (result.tests.length > 0) {
    lines.push('### Suggested Tests');
    for (const item of result.tests) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  if (options.showCost && result.meta) {
    lines.push('---');
    const parts: string[] = [];
    if (result.meta.tokens) {
      parts.push(`**Tokens:** ${formatTokenCount(result.meta.tokens)}`);
    }
    if (result.meta.cost !== undefined) {
      parts.push(`**Cost:** ${formatCost(result.meta.cost)}`);
    }
    if (options.provider || result.meta.model) {
      parts.push(`**Provider:** ${options.provider || result.meta.model}`);
    }
    lines.push(parts.join(' | '));
  }

  return lines.join('\n');
}
