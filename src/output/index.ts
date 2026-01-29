import type { OutputFormat } from '../config';
import type { SummaryResult } from '../providers';
import { formatGitHub } from './github';
import { formatJSON } from './json';
import { formatMarkdown } from './markdown';
import { formatTerminal } from './terminal';

export interface FormatOptions {
  colors?: boolean;
  showCost?: boolean;
  provider?: string;
}

export type OutputFormatter = (result: SummaryResult, options?: FormatOptions) => Promise<string>;

export function getFormatter(format: OutputFormat): OutputFormatter {
  switch (format) {
    case 'terminal':
      return formatTerminal;
    case 'markdown':
      return formatMarkdown;
    case 'json':
      return formatJSON;
    case 'github':
      return formatGitHub;
    default:
      return formatTerminal;
  }
}

export { formatTerminal } from './terminal';
export { formatMarkdown } from './markdown';
export { formatJSON } from './json';
export { formatGitHub } from './github';
