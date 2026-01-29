import * as fs from 'node:fs';
import * as path from 'node:path';
import { getGitRoot, isGitRepo } from '../core/git';
import { type ProviderName, getAvailableProviders } from '../providers';
import { createColors } from '../utils/colors';

const GITHUB_WORKFLOW_TEMPLATE = (provider: string, perFile: boolean) => `name: Diff Intent Analysis

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Analyze PR diff
        id: analysis
        env:
          ${provider.toUpperCase()}_API_KEY: \${{ secrets.${provider.toUpperCase()}_API_KEY }}
        run: |
          git fetch origin \${{ github.base_ref }} --depth=1
          git diff origin/\${{ github.base_ref }}...HEAD | npx diff-intent@latest --format github ${perFile ? '--per-file ' : ''}> analysis.md

      - name: Comment on PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: diff-intent
          path: analysis.md
`;

const DEFAULT_CONFIG = {
  provider: 'groq',
  outputFormat: 'terminal',
  cache: true,
  showCost: false,
};

export async function runInit(): Promise<void> {
  const inquirer = await import('inquirer');
  const colors = await createColors(true);

  console.log('');
  console.log(colors.heading('Welcome to diff-intent!'));
  console.log("Let's set up your configuration.\n");

  // Detect available providers
  const availableProviders = getAvailableProviders();
  console.log(colors.info('Detecting API keys...'));

  if (availableProviders.length > 0) {
    console.log(colors.success(`Found: ${availableProviders.join(', ')}`));
  } else {
    console.log(colors.warning('No API keys found in environment.'));
    console.log('Set one of: GROQ_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY\n');
  }
  console.log('');

  // Provider selection
  const providerChoices: { name: string; value: ProviderName }[] = [
    {
      name: `Groq (llama-3.3-70b) - FREE tier available ${availableProviders.includes('groq') ? colors.success('✓ API key found') : ''}`,
      value: 'groq',
    },
    {
      name: `OpenAI (gpt-4o-mini) ${availableProviders.includes('openai') ? colors.success('✓ API key found') : ''}`,
      value: 'openai',
    },
    {
      name: `Anthropic (claude-3-5-haiku) ${availableProviders.includes('anthropic') ? colors.success('✓ API key found') : ''}`,
      value: 'anthropic',
    },
  ];

  const { provider } = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Which LLM provider would you like to use?',
      choices: providerChoices,
      default: availableProviders[0] || 'groq',
    },
  ]);

  // Output format
  const { outputFormat } = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'outputFormat',
      message: 'Default output format:',
      choices: [
        { name: 'Terminal (colored, for CLI use)', value: 'terminal' },
        { name: 'Markdown (for documentation)', value: 'markdown' },
        { name: 'GitHub (collapsible sections)', value: 'github' },
        { name: 'JSON (for scripting)', value: 'json' },
      ],
      default: 'terminal',
    },
  ]);

  // Additional options
  const { showCost, enableCache } = await inquirer.default.prompt([
    {
      type: 'confirm',
      name: 'showCost',
      message: 'Show token count and cost estimates?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'enableCache',
      message: 'Enable response caching (24h TTL)?',
      default: true,
    },
  ]);

  // Create config
  const config = {
    provider,
    outputFormat,
    showCost,
    cache: enableCache,
  };

  // Write config file
  const { writeConfig } = await inquirer.default.prompt([
    {
      type: 'confirm',
      name: 'writeConfig',
      message: 'Create .diff-intentrc.json in current directory?',
      default: true,
    },
  ]);

  if (writeConfig) {
    const configPath = path.join(process.cwd(), '.diff-intentrc.json');
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(colors.success(`\nCreated ${configPath}`));
  }

  // GitHub workflow
  if (isGitRepo()) {
    const { addWorkflow } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'addWorkflow',
        message: 'Add GitHub Actions workflow for PR analysis?',
        default: false,
      },
    ]);

    if (addWorkflow) {
      const { ciPerFile } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'ciPerFile',
          message: 'PR comment style:',
          choices: [
            { name: 'Overview (single high-level summary)', value: false },
            { name: 'Per-file (detailed analysis for each file)', value: true },
          ],
          default: false,
        },
      ]);

      const gitRoot = getGitRoot() || process.cwd();
      const workflowDir = path.join(gitRoot, '.github', 'workflows');
      const workflowPath = path.join(workflowDir, 'diff-intent.yml');

      if (!fs.existsSync(workflowDir)) {
        fs.mkdirSync(workflowDir, { recursive: true });
      }

      fs.writeFileSync(workflowPath, GITHUB_WORKFLOW_TEMPLATE(provider, ciPerFile));
      console.log(colors.success(`Created ${workflowPath}`));
      console.log(colors.warning('\nRemember to add your API key as a GitHub secret:'));
      console.log(`  ${provider.toUpperCase()}_API_KEY`);
    }

    // Check .gitignore
    const gitRoot = getGitRoot() || process.cwd();
    const gitignorePath = path.join(gitRoot, '.gitignore');

    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.diff-intentrc')) {
        const { updateGitignore } = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'updateGitignore',
            message: 'Add .diff-intentrc* to .gitignore?',
            default: true,
          },
        ]);

        if (updateGitignore) {
          fs.appendFileSync(gitignorePath, '\n# diff-intent\n.diff-intentrc*\n');
          console.log(colors.success('Updated .gitignore'));
        }
      }
    }
  }

  console.log('');
  console.log(colors.success('Setup complete!'));
  console.log('');
  console.log('Quick start:');
  console.log(colors.dim('  # Analyze staged changes'));
  console.log('  diff-intent');
  console.log('');
  console.log(colors.dim('  # Analyze last commit'));
  console.log('  diff-intent HEAD~1');
  console.log('');
  console.log(colors.dim('  # Analyze a branch'));
  console.log('  diff-intent main..feature');
  console.log('');
}
