import { cosmiconfig } from 'cosmiconfig';
import { type Config, DEFAULT_CONFIG, mergeConfig, validateConfig } from './schema';

const MODULE_NAME = 'diff-intent';

let cachedConfig: Config | null = null;
let configFilePath: string | null = null;

export async function loadConfig(): Promise<{ config: Config; filePath: string | null }> {
  if (cachedConfig) {
    return { config: cachedConfig, filePath: configFilePath };
  }

  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      `.${MODULE_NAME}rc`,
      `.${MODULE_NAME}rc.json`,
      `.${MODULE_NAME}rc.yaml`,
      `.${MODULE_NAME}rc.yml`,
      `.${MODULE_NAME}rc.js`,
      `.${MODULE_NAME}rc.cjs`,
      `${MODULE_NAME}.config.js`,
      `${MODULE_NAME}.config.cjs`,
      'package.json',
    ],
  });

  try {
    const result = await explorer.search();
    if (result) {
      cachedConfig = validateConfig(result.config);
      configFilePath = result.filepath;
      return { config: cachedConfig, filePath: configFilePath };
    }
  } catch (error) {
    // Config loading failed, use defaults
    console.error('Warning: Failed to load config file:', error);
  }

  cachedConfig = {};
  configFilePath = null;
  return { config: cachedConfig, filePath: configFilePath };
}

export async function getConfig(cliOptions: Partial<Config> = {}): Promise<Config> {
  const { config: fileConfig } = await loadConfig();
  return mergeConfig(fileConfig, cliOptions);
}

export function clearConfigCache(): void {
  cachedConfig = null;
  configFilePath = null;
}

export { Config, DEFAULT_CONFIG, validateConfig, mergeConfig } from './schema';
