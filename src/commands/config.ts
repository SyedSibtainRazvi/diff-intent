import { DEFAULT_CONFIG, loadConfig } from '../config';
import { clearCache, getCacheStats, pruneExpiredCache } from '../core/cache';
import { detectProvider, getAvailableProviders } from '../providers';
import { createColors } from '../utils/colors';

export interface ConfigOptions {
  clear?: boolean;
}

export async function runConfig(options: ConfigOptions = {}): Promise<void> {
  const colors = await createColors(true);

  // Clear cache if requested
  if (options.clear) {
    const count = clearCache();
    console.log(colors.success(`Cleared ${count} cached entries.`));
    return;
  }

  console.log('');
  console.log(colors.heading('diff-intent Configuration'));
  console.log('');

  // Load and display config
  const { config, filePath } = await loadConfig();

  console.log(colors.info('Config file:'));
  console.log(`  ${filePath || colors.dim('(none - using defaults)')}`);
  console.log('');

  console.log(colors.info('Current settings:'));
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const configLines = [
    ['provider', mergedConfig.provider],
    ['model', mergedConfig.model || colors.dim('(default for provider)')],
    ['outputFormat', mergedConfig.outputFormat],
    ['cache', mergedConfig.cache ? 'enabled' : 'disabled'],
    ['cacheTTL', `${mergedConfig.cacheTTL} hours`],
    ['showCost', mergedConfig.showCost ? 'yes' : 'no'],
    ['colors', mergedConfig.colors ? 'enabled' : 'disabled'],
  ];

  for (const [key, value] of configLines) {
    console.log(`  ${colors.bold(key.padEnd(14))} ${value}`);
  }
  console.log('');

  // Available providers
  console.log(colors.info('Available providers:'));
  const available = getAvailableProviders();
  const detected = detectProvider();

  const providers: ['groq', 'openai', 'anthropic'] = ['groq', 'openai', 'anthropic'];
  for (const p of providers) {
    const isAvailable = available.includes(p);
    const isDefault = p === detected;
    const status = isAvailable ? colors.success('✓ API key found') : colors.dim('✗ No API key');
    const defaultMark = isDefault ? colors.info(' (auto-detected)') : '';
    console.log(`  ${p.padEnd(12)} ${status}${defaultMark}`);
  }
  console.log('');

  // Cache stats
  console.log(colors.info('Cache:'));
  const cacheStats = getCacheStats();
  console.log(`  Entries:    ${cacheStats.entries}`);
  console.log(`  Size:       ${formatBytes(cacheStats.sizeBytes)}`);
  if (cacheStats.oldestTimestamp) {
    const age = Date.now() - cacheStats.oldestTimestamp;
    console.log(`  Oldest:     ${formatDuration(age)} ago`);
  }
  console.log('');

  // Prune expired
  const pruned = pruneExpiredCache(mergedConfig.cacheTTL);
  if (pruned > 0) {
    console.log(colors.dim(`  (Pruned ${pruned} expired entries)`));
    console.log('');
  }

  // Help
  console.log(colors.dim('To clear cache: diff-intent config --clear'));
  console.log(colors.dim('To create config: diff-intent init'));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}
