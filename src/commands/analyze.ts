import * as fs from 'node:fs';
import { type Config, DEFAULT_IGNORE_PATTERNS, type OutputFormat, getConfig } from '../config';
import { getCached, setCache } from '../core/cache';
import { filterIgnoredFiles, getFileNameFromDiff, splitDiffByFile } from '../core/diff-parser';
import { renderSideBySide } from '../core/diff-renderer';
import { getGitDiff, getStagedDiff, hasChanges, isGitRepo, readDiffFromFile } from '../core/git';
import { getFormatter } from '../output';
import { type SummaryResult, createProvider } from '../providers';
import { createColors } from '../utils/colors';
import { stopSpinner, withSpinner } from '../utils/spinner';
import { analyzeTokens, shouldWarnAboutTokens } from '../utils/tokens';

// Overview prompt for full diff analysis - concise, high-level
const OVERVIEW_PROMPT = `You are a senior engineer reviewing a git diff.

Given the diff, provide a HIGH-LEVEL OVERVIEW. Focus on the big picture, not individual lines.

Respond ONLY with a JSON object:
{
  "purpose": ["1-2 sentences describing the overall goal of these changes"],
  "changeType": ["refactor" | "feature" | "bugfix" | "config" | "docs" | "test"],
  "risks": ["high-level risks or concerns, if any"],
  "tests": ["general testing areas to cover"]
}

Keep each array to 1-3 items maximum. Be concise and focus on WHAT and WHY, not HOW.`;

// Detailed prompt for per-file analysis - thorough, specific
const DETAILED_PROMPT = `You are a senior engineer reviewing a git diff for a single file.

Analyze this file's changes in detail. Be specific about:
- What functions/classes/methods were modified
- The specific behavioral changes
- Edge cases that might break
- Specific test cases needed

Respond ONLY with a JSON object:
{
  "purpose": ["specific changes made in this file"],
  "changeType": ["detailed description of change type and scope"],
  "risks": ["specific things that could break, edge cases, regressions"],
  "tests": ["specific test cases with example inputs/outputs if applicable"]
}

Be thorough and specific to this file's changes.`;

export interface AnalyzeOptions {
  provider?: string;
  model?: string;
  format?: OutputFormat;
  noColor?: boolean;
  perFile?: boolean;
  sideBySide?: boolean;
  showCost?: boolean;
  interactive?: boolean;
  file?: string;
  noCache?: boolean;
}

async function readDiffInput(target?: string, file?: string): Promise<string> {
  // Check for file input
  if (file) {
    return readDiffFromFile(file);
  }

  // Check for piped input (stdin)
  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, 'utf-8');
  }

  // Git-based input
  if (!isGitRepo()) {
    throw new Error(
      'Not a git repository. Use --file to analyze a diff file, or pipe diff content.'
    );
  }

  // If target is provided, use it
  if (target) {
    return getGitDiff(target);
  }

  // Default: staged changes
  const changes = hasChanges();
  if (changes.staged) {
    return getStagedDiff();
  }

  if (changes.unstaged) {
    throw new Error(
      'No staged changes. Stage your changes with `git add` or specify a target (e.g., HEAD~1).'
    );
  }

  throw new Error(
    'No changes to analyze. Make some changes and stage them, or specify a diff target.'
  );
}

async function analyzeDiff(
  diff: string,
  config: Config,
  options: AnalyzeOptions,
  promptType: 'overview' | 'detailed' = 'overview'
): Promise<SummaryResult> {
  const providerName = (options.provider || config.provider) as any;
  const model = options.model || config.model;
  const provider = createProvider(providerName, model);

  // Select the appropriate prompt
  const prompt =
    config.customPrompt || (promptType === 'detailed' ? DETAILED_PROMPT : OVERVIEW_PROMPT);

  // Check cache first (unless disabled)
  const useCache = !options.noCache && config.cache !== false;
  if (useCache) {
    const cached = getCached(diff, provider.name, provider.getModel(), config.cacheTTL);
    if (cached) {
      return cached;
    }
  }

  // Check token count and warn if needed
  const tokenInfo = analyzeTokens(diff, provider.getModel());
  if (tokenInfo.warning) {
    const colors = await createColors(!options.noColor);
    console.error(colors.warning(`Warning: ${tokenInfo.warning}`));
  }

  // Call the LLM
  const result = await withSpinner(
    `Analyzing with ${provider.name} (${provider.getModel()})...`,
    () => provider.summarize(diff, prompt),
    { successText: 'Analysis complete' }
  );

  // Cache the result
  if (useCache) {
    setCache(diff, provider.name, provider.getModel(), result);
  }

  return result;
}

export async function runAnalyze(target?: string, options: AnalyzeOptions = {}): Promise<void> {
  try {
    const config = await getConfig({
      provider: options.provider as any,
      model: options.model,
      outputFormat: options.format,
      colors: !options.noColor,
      showCost: options.showCost,
      cache: !options.noCache,
    });

    // Read diff input
    const rawDiff = await readDiffInput(target, options.file);

    if (!rawDiff.trim()) {
      throw new Error('No diff content to analyze.');
    }

    const ignorePatterns = config.ignore ?? DEFAULT_IGNORE_PATTERNS;
    const diff = filterIgnoredFiles(rawDiff, ignorePatterns);

    if (!diff.trim()) {
      throw new Error('No diff content to analyze after filtering ignored files.');
    }

    // Determine output format
    const format =
      options.format || config.outputFormat || (process.stdout.isTTY ? 'terminal' : 'markdown');
    const formatter = getFormatter(format);
    const useColors = !options.noColor && config.colors !== false && process.stdout.isTTY;

    // Per-file analysis (detailed)
    if (options.perFile) {
      const files = splitDiffByFile(diff);
      if (files.length === 0) {
        // Single chunk, analyze as-is with detailed prompt
        const result = await analyzeDiff(diff, config, options, 'detailed');
        const output = await formatter(result, {
          colors: useColors,
          showCost: options.showCost,
          provider: options.provider || config.provider,
        });
        console.log(output);
        return;
      }

      for (const fileDiff of files) {
        const fileName = getFileNameFromDiff(fileDiff);
        const colors = await createColors(useColors);
        console.log(colors.heading(`\n--- ${fileName} ---\n`));

        // Use detailed prompt for per-file analysis
        const result = await analyzeDiff(fileDiff, config, options, 'detailed');
        const output = await formatter(result, {
          colors: useColors,
          showCost: options.showCost,
          provider: options.provider || config.provider,
        });
        console.log(output);
      }
      return;
    }

    // Side-by-side view
    if (options.sideBySide) {
      const result = await analyzeDiff(diff, config, options);
      const intentOutput = await formatter(result, {
        colors: false,
        showCost: options.showCost,
        provider: options.provider || config.provider,
      });
      const sideBySide = await renderSideBySide(diff, intentOutput, {
        colors: useColors,
      });
      console.log(sideBySide);
      return;
    }

    // Standard analysis
    const result = await analyzeDiff(diff, config, options);
    const output = await formatter(result, {
      colors: useColors,
      showCost: options.showCost || config.showCost,
      provider: options.provider || config.provider,
    });
    console.log(output);

    // Interactive mode
    if (options.interactive && process.stdin.isTTY) {
      await runInteractiveMode(diff, result, config, options);
    }
  } catch (error) {
    stopSpinner();
    throw error;
  }
}

async function runInteractiveMode(
  diff: string,
  initialResult: SummaryResult,
  config: Config,
  options: AnalyzeOptions
): Promise<void> {
  const inquirer = await import('inquirer');
  const colors = await createColors(!options.noColor);

  const followUpPrompts: Record<string, string> = {
    security: `Analyze the security implications of this diff. Look for:
- Potential vulnerabilities (injection, XSS, CSRF, etc.)
- Authentication/authorization issues
- Data exposure risks
- Input validation concerns
Respond with a JSON object: { "securityIssues": ["..."], "recommendations": ["..."] }`,

    performance: `Analyze the performance implications of this diff. Look for:
- Algorithmic complexity changes
- Memory usage concerns
- Database query efficiency
- Caching implications
Respond with a JSON object: { "performanceImpact": ["..."], "recommendations": ["..."] }`,

    breaking: `Analyze breaking changes in this diff. Look for:
- API contract changes
- Database schema changes
- Configuration changes
- Behavioral changes that affect consumers
Respond with a JSON object: { "breakingChanges": ["..."], "migrationSteps": ["..."] }`,

    alternative: `Suggest alternative approaches for this change. Consider:
- Different design patterns
- More efficient implementations
- Better abstractions
- Industry best practices
Respond with a JSON object: { "alternatives": ["..."], "tradeoffs": ["..."] }`,
  };

  while (true) {
    console.log('');
    const { choice } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to know more about?',
        choices: [
          { name: 'Security implications', value: 'security' },
          { name: 'Performance impact', value: 'performance' },
          { name: 'Breaking changes', value: 'breaking' },
          { name: 'Suggest better approach', value: 'alternative' },
          { name: 'Exit', value: 'exit' },
        ],
      },
    ]);

    if (choice === 'exit') {
      break;
    }

    const customPrompt = followUpPrompts[choice];
    if (!customPrompt) continue;

    try {
      const providerName = (options.provider || config.provider) as any;
      const provider = createProvider(providerName, options.model || config.model);

      const result = await withSpinner('Analyzing...', async () => {
        const response = await fetch(
          provider.name === 'anthropic'
            ? 'https://api.anthropic.com/v1/messages'
            : provider.name === 'openai'
              ? 'https://api.openai.com/v1/chat/completions'
              : 'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(provider.name === 'anthropic'
                ? {
                    'x-api-key': process.env.ANTHROPIC_API_KEY!,
                    'anthropic-version': '2023-06-01',
                  }
                : {
                    Authorization: `Bearer ${
                      provider.name === 'openai'
                        ? process.env.OPENAI_API_KEY
                        : process.env.GROQ_API_KEY
                    }`,
                  }),
            },
            body: JSON.stringify(
              provider.name === 'anthropic'
                ? {
                    model: provider.getModel(),
                    max_tokens: 1000,
                    system: customPrompt,
                    messages: [{ role: 'user', content: diff }],
                  }
                : {
                    model: provider.getModel(),
                    max_tokens: 1000,
                    messages: [
                      { role: 'system', content: customPrompt },
                      { role: 'user', content: diff },
                    ],
                  }
            ),
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = (await response.json()) as any;
        const content =
          provider.name === 'anthropic'
            ? data.content?.[0]?.text
            : data.choices?.[0]?.message?.content;

        return content || 'No response';
      });

      console.log('');
      console.log(colors.heading(`${choice.charAt(0).toUpperCase() + choice.slice(1)} Analysis:`));
      console.log(result);
    } catch (error) {
      console.error(colors.error(`Error: ${error instanceof Error ? error.message : error}`));
    }
  }
}
