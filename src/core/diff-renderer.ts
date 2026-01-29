import {
  type ParsedFile,
  type ParsedHunk,
  type ParsedLine,
  getDiffStats,
  parseDiff,
} from './diff-parser';

// Dynamic import for chalk (ESM module)
let chalk: typeof import('chalk').default;

async function getChalk() {
  if (!chalk) {
    const module = await import('chalk');
    chalk = module.default;
  }
  return chalk;
}

export interface RenderOptions {
  colors?: boolean;
  lineNumbers?: boolean;
  contextLines?: number;
  maxWidth?: number;
}

const DEFAULT_OPTIONS: Required<RenderOptions> = {
  colors: true,
  lineNumbers: true,
  contextLines: 3,
  maxWidth: 100,
};

export async function renderDiff(diff: string, options: RenderOptions = {}): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const files = parseDiff(diff);
  const c = opts.colors ? await getChalk() : null;

  const lines: string[] = [];

  for (const file of files) {
    lines.push(await renderFileHeader(file, c, opts));

    if (file.isBinary) {
      lines.push(c ? c.yellow('  Binary file changed') : '  Binary file changed');
      lines.push('');
      continue;
    }

    for (const hunk of file.hunks) {
      lines.push(await renderHunk(hunk, c, opts));
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function renderFileHeader(
  file: ParsedFile,
  c: typeof chalk | null,
  opts: Required<RenderOptions>
): Promise<string> {
  let status = '';
  if (file.isNew) status = ' (new)';
  else if (file.isDeleted) status = ' (deleted)';
  else if (file.isRenamed) status = ` (renamed from ${file.oldPath})`;

  const fileName = file.newPath + status;
  const width = Math.min(opts.maxWidth, fileName.length + 6);
  const border = '─'.repeat(width - 2);

  if (c) {
    return [
      c.cyan('┌─ ') +
        c.bold.cyan(fileName) +
        c.cyan(` ${'─'.repeat(Math.max(0, width - fileName.length - 4))}`),
    ].join('\n');
  }

  return `┌─ ${fileName} ${'─'.repeat(Math.max(0, width - fileName.length - 4))}`;
}

async function renderHunk(
  hunk: ParsedHunk,
  c: typeof chalk | null,
  opts: Required<RenderOptions>
): Promise<string> {
  const lines: string[] = [];

  for (const line of hunk.lines) {
    lines.push(await renderLine(line, c, opts));
  }

  return lines.join('\n');
}

async function renderLine(
  line: ParsedLine,
  c: typeof chalk | null,
  opts: Required<RenderOptions>
): Promise<string> {
  const lineNumWidth = 4;
  let lineNum = '';

  if (opts.lineNumbers && line.type !== 'header') {
    const oldNum =
      line.oldLineNumber?.toString().padStart(lineNumWidth) || ' '.repeat(lineNumWidth);
    const newNum =
      line.newLineNumber?.toString().padStart(lineNumWidth) || ' '.repeat(lineNumWidth);
    lineNum = `${oldNum} ${newNum} │ `;
  }

  const prefix = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';
  const content = line.type === 'header' ? line.content : prefix + line.content;

  if (!c) {
    return lineNum + content;
  }

  switch (line.type) {
    case 'header':
      return c.magenta(content);
    case 'addition':
      return c.dim(lineNum) + c.bgGreen.black(content);
    case 'deletion':
      return c.dim(lineNum) + c.bgRed.white(content);
    case 'context':
      return c.dim(lineNum) + content;
    default:
      return lineNum + content;
  }
}

export async function renderDiffSummary(
  diff: string,
  options: RenderOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const files = parseDiff(diff);
  const stats = getDiffStats(files);
  const c = opts.colors ? await getChalk() : null;

  const lines: string[] = [];

  if (c) {
    lines.push(c.bold('Files changed: ') + c.cyan(stats.filesChanged.toString()));
    lines.push(`${c.green(`+${stats.additions}`)} / ${c.red(`-${stats.deletions}`)}`);
    lines.push('');

    for (const file of files) {
      let status = '';
      if (file.isNew) status = c.green(' [new]');
      else if (file.isDeleted) status = c.red(' [deleted]');
      else if (file.isRenamed) status = c.yellow(' [renamed]');

      lines.push(`  ${c.cyan(file.newPath)}${status}`);
    }
  } else {
    lines.push(`Files changed: ${stats.filesChanged}`);
    lines.push(`+${stats.additions} / -${stats.deletions}`);
    lines.push('');

    for (const file of files) {
      let status = '';
      if (file.isNew) status = ' [new]';
      else if (file.isDeleted) status = ' [deleted]';
      else if (file.isRenamed) status = ' [renamed]';

      lines.push(`  ${file.newPath}${status}`);
    }
  }

  return lines.join('\n');
}

export async function renderSideBySide(
  diff: string,
  intent: string,
  options: RenderOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const c = opts.colors ? await getChalk() : null;

  const diffLines = diff.split('\n');
  const intentLines = intent.split('\n');
  const maxLines = Math.max(diffLines.length, intentLines.length);

  const diffWidth = Math.floor((opts.maxWidth - 3) / 2);
  const intentWidth = opts.maxWidth - diffWidth - 3;

  const lines: string[] = [];

  if (c) {
    const diffHeader = c.bold.cyan('DIFF'.padEnd(diffWidth));
    const intentHeader = c.bold.cyan('INTENT'.padEnd(intentWidth));
    lines.push(`${diffHeader} │ ${intentHeader}`);
    lines.push(c.dim(`${'─'.repeat(diffWidth)}─┼─${'─'.repeat(intentWidth)}`));
  } else {
    lines.push(`${'DIFF'.padEnd(diffWidth)} │ ${'INTENT'.padEnd(intentWidth)}`);
    lines.push(`${'─'.repeat(diffWidth)}─┼─${'─'.repeat(intentWidth)}`);
  }

  for (let i = 0; i < maxLines; i++) {
    const left = (diffLines[i] || '').slice(0, diffWidth).padEnd(diffWidth);
    const right = (intentLines[i] || '').slice(0, intentWidth);

    if (c) {
      const coloredLeft = diffLines[i]?.startsWith('+')
        ? c.green(left)
        : diffLines[i]?.startsWith('-')
          ? c.red(left)
          : left;
      lines.push(`${coloredLeft} │ ${right}`);
    } else {
      lines.push(`${left} │ ${right}`);
    }
  }

  return lines.join('\n');
}
