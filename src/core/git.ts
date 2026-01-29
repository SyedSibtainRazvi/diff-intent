import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface GitDiffOptions {
  staged?: boolean;
  target?: string;
  base?: string;
}

export function isGitRepo(dir: string = process.cwd()): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: dir,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

export function getGitRoot(dir: string = process.cwd()): string | null {
  try {
    const result = execSync('git rev-parse --show-toplevel', {
      cwd: dir,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return result.trim();
  } catch {
    return null;
  }
}

export function getCurrentBranch(): string | null {
  try {
    const result = execSync('git branch --show-current', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

export function getDefaultBranch(): string {
  try {
    const result = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    const match = result.match(/refs\/remotes\/origin\/(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch {}

  try {
    execSync('git show-ref --verify --quiet refs/heads/main', { stdio: 'pipe' });
    return 'main';
  } catch {
    try {
      execSync('git show-ref --verify --quiet refs/heads/master', { stdio: 'pipe' });
      return 'master';
    } catch {
      return 'main';
    }
  }
}

export function getStagedDiff(): string {
  try {
    const result = execSync('git diff --staged', {
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to get staged diff: ${error}`);
  }
}

export function getUnstagedDiff(): string {
  try {
    const result = execSync('git diff', {
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024,
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to get unstaged diff: ${error}`);
  }
}

export function getGitDiff(target?: string): string {
  if (!target) {
    return getStagedDiff();
  }

  try {
    const result = execSync(`git diff ${target}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024,
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to get diff for "${target}": ${error}`);
  }
}

export function getBranchDiff(base: string, head?: string): string {
  const headRef = head || 'HEAD';
  try {
    const result = execSync(`git diff ${base}...${headRef}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024,
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to get branch diff ${base}...${headRef}: ${error}`);
  }
}

export function getCommitDiff(commitRange: string): string {
  try {
    const result = execSync(`git diff ${commitRange}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024,
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to get commit diff for "${commitRange}": ${error}`);
  }
}

export function hasChanges(): { staged: boolean; unstaged: boolean } {
  try {
    const staged = execSync('git diff --staged --name-only', {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    const unstaged = execSync('git diff --name-only', {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    return {
      staged: staged.length > 0,
      unstaged: unstaged.length > 0,
    };
  } catch {
    return { staged: false, unstaged: false };
  }
}

export function readDiffFromFile(filePath: string): string {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  return fs.readFileSync(absolutePath, 'utf-8');
}
