type OraInstance = Awaited<ReturnType<typeof import('ora')['default']>>;

let spinner: OraInstance | null = null;

export async function startSpinner(text: string): Promise<void> {
  if (!process.stdout.isTTY) {
    return;
  }

  const ora = (await import('ora')).default;
  spinner = ora({
    text,
    spinner: 'dots',
  }).start();
}

export function updateSpinner(text: string): void {
  if (spinner) {
    spinner.text = text;
  }
}

export function succeedSpinner(text?: string): void {
  if (spinner) {
    spinner.succeed(text);
    spinner = null;
  }
}

export function failSpinner(text?: string): void {
  if (spinner) {
    spinner.fail(text);
    spinner = null;
  }
}

export function stopSpinner(): void {
  if (spinner) {
    spinner.stop();
    spinner = null;
  }
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  options?: { successText?: string; failText?: string }
): Promise<T> {
  await startSpinner(text);

  try {
    const result = await fn();
    succeedSpinner(options?.successText);
    return result;
  } catch (error) {
    failSpinner(options?.failText || 'Failed');
    throw error;
  }
}
