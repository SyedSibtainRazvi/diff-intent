# diff-intent

> AI-powered git diff analysis - understand the intent behind code changes

[![npm version](https://img.shields.io/npm/v/diff-intent.svg)](https://www.npmjs.com/package/diff-intent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

diff-intent analyzes your git diffs using LLMs to explain:
- **Purpose**: What the change is trying to accomplish
- **Change Type**: Whether it's a refactor or behavior change
- **Risks**: What could break
- **Tests**: What tests should exist

## Features

- **Multi-provider support**: Groq (FREE), OpenAI, Anthropic
- **Flexible input**: Staged changes, commits, branches, or piped diffs
- **Beautiful output**: Colored terminal, Markdown, GitHub, or JSON
- **Smart caching**: 24-hour response cache to save API calls
- **Interactive mode**: Ask follow-up questions about security, performance, etc.

## Quick Start

```bash
# Install globally
pnpm add -g diff-intent
# or: npm install -g diff-intent

# Set up an API key (Groq is free!)
export GROQ_API_KEY=your-key-here

# Analyze staged changes
diff-intent

# Analyze last commit
diff-intent HEAD~1

# Analyze a branch
diff-intent main..feature-branch
```

## Installation

```bash
pnpm add -g diff-intent
# or
npm install -g diff-intent
```

### API Keys

diff-intent auto-detects available providers from environment variables:

| Provider | Environment Variable | Default Model | Pricing |
|----------|---------------------|---------------|---------|
| Groq | `GROQ_API_KEY` | llama-3.3-70b | FREE tier |
| OpenAI | `OPENAI_API_KEY` | gpt-4o-mini | ~$0.15/1M tokens |
| Anthropic | `ANTHROPIC_API_KEY` | claude-3-5-haiku | ~$0.80/1M tokens |

Get a free Groq API key at [console.groq.com](https://console.groq.com)

## Usage

### Basic Commands

```bash
# Analyze staged changes (default)
diff-intent

# Analyze specific commits
diff-intent HEAD~1              # Last commit
diff-intent HEAD~3              # Last 3 commits
diff-intent abc123              # Specific commit

# Compare branches
diff-intent main..feature       # Branch comparison
diff-intent origin/main..HEAD   # Compare to remote

# From file
diff-intent --file changes.diff

# Piped input (legacy mode)
git diff | diff-intent
```

### Analysis Modes

**Default (Overview)**: Analyzes the entire diff and provides a high-level summary - the big picture of what changed and why.

```bash
diff-intent HEAD~1
# Returns: Overall purpose, change type, key risks, general test areas
```

**Per-file (Detailed)**: Analyzes each file separately with detailed, specific insights.

```bash
diff-intent HEAD~1 --per-file
# Returns: Specific functions changed, edge cases, concrete test cases
```

Use `--per-file` when you need to understand the specifics of each file's changes, especially for code review.

### Options

```bash
diff-intent [target] [options]

Options:
  -p, --provider <provider>  LLM provider (groq, openai, anthropic)
  -m, --model <model>        Specific model to use
  -f, --format <format>      Output format (terminal, markdown, json, github)
  --file <path>              Read diff from file
  --no-color                 Disable colored output
  --per-file                 Analyze each file separately (detailed mode)
  -s, --side-by-side         Show diff and intent side by side
  --show-cost                Show token count and cost estimate
  -i, --interactive          Enable follow-up questions
  --no-cache                 Bypass response cache
  -V, --version              Output version number
  -h, --help                 Display help
```

### Subcommands

```bash
# Interactive setup wizard
diff-intent init

# Show current configuration
diff-intent config

# Clear response cache
diff-intent config --clear
```

## Output Formats

### Terminal (default for TTY)

```
╭──────────────────────────────────────────────────────╮
│  Diff Intent Analysis                                │
╰──────────────────────────────────────────────────────╯

  Purpose
  ├─ Refactor authentication flow for better security
  └─ Add rate limiting to prevent abuse

  Change Type
  └─ Behavior change

  Risks
  ├─ Existing sessions may be invalidated
  └─ API response format changed

  Suggested Tests
  ├─ Test rate limit triggers after 100 requests
  └─ Test session persistence across deploys
```

### JSON

```bash
diff-intent --format json
```

```json
{
  "purpose": ["Refactor authentication flow"],
  "changeType": ["Behavior change"],
  "risks": ["Existing sessions may be invalidated"],
  "tests": ["Test rate limit triggers"]
}
```

### GitHub (for PR comments)

```bash
diff-intent --format github
```

Outputs collapsible sections with checkboxes for suggested tests.

### Markdown

```bash
diff-intent --format markdown
```

## Configuration

Create `.diff-intentrc.json` in your project root:

```json
{
  "provider": "groq",
  "outputFormat": "terminal",
  "cache": true,
  "showCost": false
}
```

Or use the setup wizard:

```bash
diff-intent init
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | string | auto-detect | LLM provider |
| `model` | string | provider default | Specific model |
| `outputFormat` | string | `terminal` | Default output format |
| `cache` | boolean | `true` | Enable response caching |
| `cacheTTL` | number | `24` | Cache TTL in hours |
| `showCost` | boolean | `false` | Show token/cost info |
| `colors` | boolean | `true` | Enable colored output |
| `customPrompt` | string | - | Custom system prompt |

### Supported Config Files

- `.diff-intentrc`
- `.diff-intentrc.json`
- `.diff-intentrc.yaml`
- `.diff-intentrc.js`
- `diff-intent.config.js`
- `package.json` (`diff-intent` key)

## GitHub Actions

Automatically analyze PRs and post a comment with the diff intent summary.

### Setup

1. **Add your API key as a GitHub Secret**
   - Go to repo Settings → Secrets → Actions
   - Add `GROQ_API_KEY` (or `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`)

2. **Generate the workflow** (recommended)
   ```bash
   diff-intent init
   # Select "Add GitHub Actions workflow for PR analysis"
   ```

3. **Or create manually** at `.github/workflows/diff-intent.yml`:

```yaml
name: Diff Intent Analysis

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
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: |
          git fetch origin ${{ github.base_ref }} --depth=1
          git diff origin/${{ github.base_ref }}...HEAD | npx diff-intent@latest --format github > analysis.md

      - name: Comment on PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: diff-intent
          path: analysis.md
```

### How It Works

- **One comment per PR** - Uses sticky comments that update on each push (not spam)
- **Overview by default** - High-level summary of all changes
- **Per-file mode** - Add `--per-file` for detailed analysis of each file (can be verbose for large PRs)

## Interactive Mode

Ask follow-up questions about your diff:

```bash
diff-intent -i
```

After the initial analysis, you can explore:
- Security implications
- Performance impact
- Breaking changes
- Alternative approaches

## Examples

### Analyze a security fix

```bash
diff-intent --file examples/security-fix.diff --show-cost
```

### Per-file analysis of a large PR

```bash
diff-intent main..feature --per-file
```

### Side-by-side view

```bash
diff-intent HEAD~1 --side-by-side
```

### Use a different provider

```bash
diff-intent --provider openai --model gpt-4o
```

## Troubleshooting

### "No API key found"

Set at least one API key:
```bash
export GROQ_API_KEY=your-key    # Recommended (free)
export OPENAI_API_KEY=your-key
export ANTHROPIC_API_KEY=your-key
```

### "No staged changes"

Either stage your changes:
```bash
git add .
diff-intent
```

Or specify a target:
```bash
diff-intent HEAD~1
```

### Cache issues

Clear the cache:
```bash
diff-intent config --clear
```

Or bypass for a single request:
```bash
diff-intent --no-cache
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.
