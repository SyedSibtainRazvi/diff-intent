# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-01-29

### Added

- Initial public release of `diff-intent` CLI.
- AI-powered analysis of git diffs into four key sections:
  - Purpose
  - Change Type
  - Risks
  - Suggested Tests
- Multi-provider LLM support:
  - Groq (default, free tier) via `GROQ_API_KEY`
  - OpenAI via `OPENAI_API_KEY`
  - Anthropic via `ANTHROPIC_API_KEY`
- Flexible input targets:
  - Staged changes (default)
  - Commits (e.g., `HEAD~1`, `abc123`)
  - Branch ranges (e.g., `main..feature-branch`)
  - Diff files (`--file`) and piped diffs (`git diff | diff-intent`)
- Output formats:
  - `terminal` (default)
  - `markdown`
  - `json`
  - `github` (for PR comments)
- Analysis modes:
  - Overview (whole diff)
  - `--per-file` detailed per-file analysis
  - `--side-by-side` diff + intent in a two-column view
- Interactive mode (`-i`) for follow-up questions (security, performance, breaking changes, alternatives).
- Configuration system:
  - `.diff-intentrc*` and `diff-intent.config.js` support
  - Options for provider, model, output format, cache, TTL, colors, custom prompt
- Caching:
  - Local response cache with TTL
  - `config --clear` and `--no-cache` controls
- GitHub Actions integration:
  - Workflow to analyze PR diffs and post sticky comments
- Documentation and project meta:
  - README with quick start, usage, examples, and troubleshooting
  - CONTRIBUTING, SECURITY, LICENSE
  - CI workflows for linting, type-checking, and building
