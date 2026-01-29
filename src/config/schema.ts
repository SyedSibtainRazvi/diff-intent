import type { ProviderName } from '../providers';

export type OutputFormat = 'markdown' | 'json' | 'github' | 'terminal';

export interface Config {
  provider?: ProviderName;
  model?: string;
  maxTokens?: number;
  outputFormat?: OutputFormat;
  cache?: boolean;
  cacheTTL?: number; // in hours
  showCost?: boolean;
  customPrompt?: string;
  colors?: boolean;
  ignore?: string[]; // file patterns to ignore (e.g., lock files)
}

export const DEFAULT_IGNORE_PATTERNS = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
  'composer.lock',
  'Gemfile.lock',
  'poetry.lock',
  'Cargo.lock',
];

export const DEFAULT_CONFIG: Required<Config> = {
  provider: 'groq' as ProviderName,
  model: '',
  maxTokens: 500,
  outputFormat: 'terminal',
  cache: true,
  cacheTTL: 24,
  showCost: false,
  customPrompt: '',
  colors: true,
  ignore: DEFAULT_IGNORE_PATTERNS,
};

export function validateConfig(config: unknown): Config {
  if (typeof config !== 'object' || config === null) {
    return {};
  }

  const validProviders: ProviderName[] = ['groq', 'openai', 'anthropic'];
  const validFormats: OutputFormat[] = ['markdown', 'json', 'github', 'terminal'];

  const c = config as Record<string, unknown>;
  const validated: Config = {};

  if (typeof c.provider === 'string' && validProviders.includes(c.provider as ProviderName)) {
    validated.provider = c.provider as ProviderName;
  }

  if (typeof c.model === 'string') {
    validated.model = c.model;
  }

  if (typeof c.maxTokens === 'number' && c.maxTokens > 0) {
    validated.maxTokens = c.maxTokens;
  }

  if (typeof c.outputFormat === 'string' && validFormats.includes(c.outputFormat as OutputFormat)) {
    validated.outputFormat = c.outputFormat as OutputFormat;
  }

  if (typeof c.cache === 'boolean') {
    validated.cache = c.cache;
  }

  if (typeof c.cacheTTL === 'number' && c.cacheTTL > 0) {
    validated.cacheTTL = c.cacheTTL;
  }

  if (typeof c.showCost === 'boolean') {
    validated.showCost = c.showCost;
  }

  if (typeof c.customPrompt === 'string') {
    validated.customPrompt = c.customPrompt;
  }

  if (typeof c.colors === 'boolean') {
    validated.colors = c.colors;
  }

  if (Array.isArray(c.ignore) && c.ignore.every((p) => typeof p === 'string')) {
    validated.ignore = c.ignore;
  }

  return validated;
}

export function mergeConfig(fileConfig: Config, cliOptions: Partial<Config>): Config {
  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...Object.fromEntries(Object.entries(cliOptions).filter(([, v]) => v !== undefined)),
  };
}
