# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in diff-intent, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email the maintainer at **syedsibtain191@gmail.com** or use GitHub's private vulnerability reporting
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Considerations

### API Keys

- diff-intent requires API keys for LLM providers (Groq, OpenAI, Anthropic)
- Keys are read from environment variables only
- Keys are never logged, cached, or transmitted anywhere except to the respective API provider
- Use `.env` files locally and add them to `.gitignore`
- In CI/CD, use secrets management (e.g., GitHub Secrets)

### Data Privacy

- Diff content is sent to the configured LLM provider for analysis
- Response caching stores results locally in `~/.cache/diff-intent/`
- No telemetry or analytics are collected
- No data is sent to any third party except the chosen LLM provider

### Dependencies

- We regularly update dependencies to patch security vulnerabilities
- Use `npm audit` to check for known vulnerabilities
- Report any concerning dependency issues

## Best Practices

1. **Rotate API keys** periodically
2. **Review diffs** before analyzing - don't send sensitive code/secrets
3. **Use environment variables** for API keys, never hardcode them
4. **Keep the CLI updated** to get security patches
