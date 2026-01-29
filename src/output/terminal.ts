import type { SummaryResult } from '../providers';
import { createBoxen, createColors } from '../utils/colors';
import { formatCost, formatTokenCount } from '../utils/tokens';
import type { FormatOptions } from './index';

export async function formatTerminal(
  result: SummaryResult,
  options: FormatOptions = {}
): Promise<string> {
  const colors = await createColors(options.colors ?? true);
  const lines: string[] = [];

  const header = await createBoxen('Diff Intent Analysis', {
    title: undefined,
    padding: 0,
    borderColor: 'cyan',
  });
  lines.push(header);
  lines.push('');

  if (result.purpose.length > 0) {
    lines.push(colors.heading('  Purpose'));
    for (let i = 0; i < result.purpose.length; i++) {
      const prefix = i === result.purpose.length - 1 ? '└─' : '├─';
      lines.push(colors.dim(`  ${prefix} `) + result.purpose[i]);
    }
    lines.push('');
  }

  if (result.changeType.length > 0) {
    lines.push(colors.heading('  Change Type'));
    for (let i = 0; i < result.changeType.length; i++) {
      const prefix = i === result.changeType.length - 1 ? '└─' : '├─';
      lines.push(colors.dim(`  ${prefix} `) + result.changeType[i]);
    }
    lines.push('');
  }

  if (result.risks.length > 0) {
    lines.push(colors.warning('  Risks'));
    for (let i = 0; i < result.risks.length; i++) {
      const prefix = i === result.risks.length - 1 ? '└─' : '├─';
      lines.push(colors.dim(`  ${prefix} `) + result.risks[i]);
    }
    lines.push('');
  }

  if (result.tests.length > 0) {
    lines.push(colors.success('  Suggested Tests'));
    for (let i = 0; i < result.tests.length; i++) {
      const prefix = i === result.tests.length - 1 ? '└─' : '├─';
      lines.push(colors.dim(`  ${prefix} `) + result.tests[i]);
    }
    lines.push('');
  }

  if (options.showCost && result.meta) {
    const separator = colors.dim('─'.repeat(55));
    lines.push(separator);

    const parts: string[] = [];
    if (result.meta.tokens) {
      parts.push(`Tokens: ${formatTokenCount(result.meta.tokens)}`);
    }
    if (result.meta.cost !== undefined) {
      parts.push(`Cost: ${formatCost(result.meta.cost)}`);
    }
    if (options.provider || result.meta.model) {
      parts.push(`Provider: ${options.provider || result.meta.model}`);
    }

    lines.push(colors.dim(`  ${parts.join(' | ')}`));
  }

  return lines.join('\n');
}
