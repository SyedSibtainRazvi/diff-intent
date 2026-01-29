export interface ParsedFile {
  oldPath: string;
  newPath: string;
  hunks: ParsedHunk[];
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

export interface ParsedHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: ParsedLine[];
}

export interface ParsedLine {
  type: 'context' | 'addition' | 'deletion' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export function splitDiffByFile(diff: string): string[] {
  const lines = diff.split('\n');
  const chunks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (current.length > 0) {
        chunks.push(current.join('\n'));
        current = [];
      }
    }
    current.push(line);
  }

  if (current.length > 0) {
    chunks.push(current.join('\n'));
  }

  return chunks;
}

export function parseDiff(diff: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const fileDiffs = splitDiffByFile(diff);

  for (const fileDiff of fileDiffs) {
    const file = parseFileDiff(fileDiff);
    if (file) {
      files.push(file);
    }
  }

  return files;
}

function parseFileDiff(fileDiff: string): ParsedFile | null {
  const lines = fileDiff.split('\n');
  if (lines.length === 0) return null;

  const diffLine = lines[0];
  const match = diffLine.match(/^diff --git a\/(.+) b\/(.+)$/);
  if (!match) return null;

  const oldPath = match[1];
  const newPath = match[2];

  const file: ParsedFile = {
    oldPath,
    newPath,
    hunks: [],
    isBinary: false,
    isNew: false,
    isDeleted: false,
    isRenamed: oldPath !== newPath,
  };

  for (const line of lines) {
    if (line.startsWith('Binary files')) {
      file.isBinary = true;
      return file;
    }
    if (line.startsWith('new file mode')) {
      file.isNew = true;
    }
    if (line.startsWith('deleted file mode')) {
      file.isDeleted = true;
    }
  }

  let currentHunk: ParsedHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch) {
      if (currentHunk) {
        file.hunks.push(currentHunk);
      }

      oldLineNum = Number.parseInt(hunkMatch[1], 10);
      newLineNum = Number.parseInt(hunkMatch[3], 10);

      currentHunk = {
        oldStart: oldLineNum,
        oldCount: Number.parseInt(hunkMatch[2] || '1', 10),
        newStart: newLineNum,
        newCount: Number.parseInt(hunkMatch[4] || '1', 10),
        lines: [
          {
            type: 'header',
            content: line,
          },
        ],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith(' ')) {
      currentHunk.lines.push({
        type: 'context',
        content: line.slice(1),
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
      });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      currentHunk.lines.push({
        type: 'addition',
        content: line.slice(1),
        newLineNumber: newLineNum++,
      });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      currentHunk.lines.push({
        type: 'deletion',
        content: line.slice(1),
        oldLineNumber: oldLineNum++,
      });
    }
  }

  if (currentHunk) {
    file.hunks.push(currentHunk);
  }

  return file;
}

export function getFileNameFromDiff(fileDiff: string): string {
  const match = fileDiff.match(/^diff --git a\/(.+) b\/(.+)$/m);
  if (match) {
    return match[2];
  }
  return 'unknown';
}

export function getDiffStats(files: ParsedFile[]): {
  filesChanged: number;
  additions: number;
  deletions: number;
} {
  let additions = 0;
  let deletions = 0;

  for (const file of files) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'addition') additions++;
        if (line.type === 'deletion') deletions++;
      }
    }
  }

  return {
    filesChanged: files.length,
    additions,
    deletions,
  };
}
