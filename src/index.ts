#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { runAnalyze, runConfig, runInit } from './commands';
import type { OutputFormat } from './config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: VERSION } = require('../package.json');

const program = new Command();

program
  .name('diff-intent')
  .description('AI-powered git diff analysis - understand the intent behind code changes')
  .version(VERSION)
  .argument('[target]', 'Git diff target (e.g., HEAD~1, main..feature, commit-sha)')
  .option('-p, --provider <provider>', 'LLM provider (groq, openai, anthropic)')
  .option('-m, --model <model>', 'Specific model to use')
  .option('-f, --format <format>', 'Output format (terminal, markdown, json, github)')
  .option('--file <path>', 'Read diff from file instead of git')
  .option('--no-color', 'Disable colored output')
  .option('--per-file', 'Detailed per-file analysis (vs. high-level overview)')
  .option('-s, --side-by-side', 'Show diff and intent side by side')
  .option('--show-cost', 'Show token count and cost estimate')
  .option('-i, --interactive', 'Enable interactive follow-up questions')
  .option('--no-cache', 'Bypass response cache')
  .action(async (target: string | undefined, options) => {
    try {
      await runAnalyze(target, {
        provider: options.provider,
        model: options.model,
        format: options.format as OutputFormat,
        noColor: !options.color,
        perFile: options.perFile,
        sideBySide: options.sideBySide,
        showCost: options.showCost,
        interactive: options.interactive,
        file: options.file,
        noCache: !options.cache,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Interactive setup wizard')
  .action(async () => {
    try {
      await runInit();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .option('--clear', 'Clear the response cache')
  .action(async (options) => {
    try {
      await runConfig({ clear: options.clear });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
