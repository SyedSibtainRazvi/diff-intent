# Contributing to diff-intent

Thank you for your interest in contributing to diff-intent! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/SyedSibtainRazvi/diff-intent.git
   cd diff-intent
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your API key(s) to .env
   ```

4. **Build the project**
   ```bash
   pnpm run build
   ```

5. **Link for local testing**
   ```bash
   pnpm link --global
   ```

## Project Structure

```
src/
├── index.ts              # CLI entry point
├── commands/             # CLI command handlers
├── providers/            # LLM provider implementations
├── core/                 # Core functionality (git, diff parsing, caching)
├── output/               # Output formatters
├── config/               # Configuration loading
└── utils/                # Utility functions
```

## Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add types for all new functions
   - Keep functions small and focused

3. **Test your changes**
   ```bash
   pnpm run build
   diff-intent --help
   ```

4. **Commit with a clear message**
   ```bash
   git commit -m "feat: add support for XYZ"
   ```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Adding a New Provider

1. Create a new file in `src/providers/` (e.g., `newprovider.ts`)
2. Implement the `LLMProvider` interface
3. Add the provider to `src/providers/index.ts`
4. Update the type definitions and factory function
5. Update documentation

Example provider structure:

```typescript
import { LLMProvider, SummaryResult } from './index';

export class NewProvider implements LLMProvider {
  name = 'newprovider';

  constructor(model?: string) {
    // Initialize
  }

  getModel(): string {
    return this.model;
  }

  async summarize(diff: string, customPrompt?: string): Promise<SummaryResult> {
    // Implementation
  }
}
```

## Adding a New Output Format

1. Create a new file in `src/output/` (e.g., `newformat.ts`)
2. Export a formatter function matching the `OutputFormatter` type
3. Add the format to `src/output/index.ts`
4. Update the `OutputFormat` type in `src/config/schema.ts`

## Pull Request Process

1. Update the README.md if needed
2. Update the CHANGELOG.md
3. Ensure the build passes
4. Request review from maintainers

## Code Style

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use async/await instead of raw promises
- Add JSDoc comments for public APIs
- Keep line length under 100 characters

## Questions?

Feel free to open an issue for any questions or concerns.
