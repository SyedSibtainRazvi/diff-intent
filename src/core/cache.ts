import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { SummaryResult } from '../providers';

const CACHE_DIR = path.join(os.homedir(), '.cache', 'diff-intent');
const DEFAULT_TTL_HOURS = 24;

interface CacheEntry {
  result: SummaryResult;
  timestamp: number;
  provider: string;
  model: string;
}

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function hashDiff(diff: string, provider: string, model: string): string {
  const content = `${provider}:${model}:${diff}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getCachePath(hash: string): string {
  return path.join(CACHE_DIR, `${hash}.json`);
}

export function getCached(
  diff: string,
  provider: string,
  model: string,
  ttlHours: number = DEFAULT_TTL_HOURS
): SummaryResult | null {
  try {
    const hash = hashDiff(diff, provider, model);
    const cachePath = getCachePath(hash);

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    const content = fs.readFileSync(cachePath, 'utf-8');
    const entry: CacheEntry = JSON.parse(content);

    const ageMs = Date.now() - entry.timestamp;
    const ttlMs = ttlHours * 60 * 60 * 1000;

    if (ageMs > ttlMs) {
      fs.unlinkSync(cachePath);
      return null;
    }

    return entry.result;
  } catch {
    return null;
  }
}

export function setCache(
  diff: string,
  provider: string,
  model: string,
  result: SummaryResult
): void {
  try {
    ensureCacheDir();

    const hash = hashDiff(diff, provider, model);
    const cachePath = getCachePath(hash);

    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      provider,
      model,
    };

    fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2));
  } catch {}
}

export function clearCache(): number {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      return 0;
    }

    const files = fs.readdirSync(CACHE_DIR);
    let count = 0;

    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
        count++;
      }
    }

    return count;
  } catch {
    return 0;
  }
}

export function getCacheStats(): {
  entries: number;
  sizeBytes: number;
  oldestTimestamp: number | null;
} {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      return { entries: 0, sizeBytes: 0, oldestTimestamp: null };
    }

    const files = fs.readdirSync(CACHE_DIR);
    let entries = 0;
    let sizeBytes = 0;
    let oldestTimestamp: number | null = null;

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(CACHE_DIR, file);
        const stats = fs.statSync(filePath);
        entries++;
        sizeBytes += stats.size;

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(content);
          if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
          }
        } catch {}
      }
    }

    return { entries, sizeBytes, oldestTimestamp };
  } catch {
    return { entries: 0, sizeBytes: 0, oldestTimestamp: null };
  }
}

export function pruneExpiredCache(ttlHours: number = DEFAULT_TTL_HOURS): number {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      return 0;
    }

    const files = fs.readdirSync(CACHE_DIR);
    const ttlMs = ttlHours * 60 * 60 * 1000;
    let pruned = 0;

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(CACHE_DIR, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(content);
          const ageMs = Date.now() - entry.timestamp;

          if (ageMs > ttlMs) {
            fs.unlinkSync(filePath);
            pruned++;
          }
        } catch {
          fs.unlinkSync(filePath);
          pruned++;
        }
      }
    }

    return pruned;
  } catch {
    return 0;
  }
}
