// Dynamic import for chalk (ESM module)
let chalk: typeof import('chalk').default;
let chalkLoaded = false;

async function getChalk() {
  if (!chalkLoaded) {
    const module = await import('chalk');
    chalk = module.default;
    chalkLoaded = true;
  }
  return chalk;
}

export interface Colors {
  success: (text: string) => string;
  error: (text: string) => string;
  warning: (text: string) => string;
  info: (text: string) => string;
  dim: (text: string) => string;
  bold: (text: string) => string;
  heading: (text: string) => string;
  addition: (text: string) => string;
  deletion: (text: string) => string;
  file: (text: string) => string;
}

const noOpColors: Colors = {
  success: (t) => t,
  error: (t) => t,
  warning: (t) => t,
  info: (t) => t,
  dim: (t) => t,
  bold: (t) => t,
  heading: (t) => t,
  addition: (t) => t,
  deletion: (t) => t,
  file: (t) => t,
};

export async function createColors(enabled = true): Promise<Colors> {
  if (!enabled) {
    return noOpColors;
  }

  const c = await getChalk();

  return {
    success: (t) => c.green(t),
    error: (t) => c.red(t),
    warning: (t) => c.yellow(t),
    info: (t) => c.cyan(t),
    dim: (t) => c.dim(t),
    bold: (t) => c.bold(t),
    heading: (t) => c.bold.cyan(t),
    addition: (t) => c.bgGreen.black(t),
    deletion: (t) => c.bgRed.white(t),
    file: (t) => c.cyan(t),
  };
}

export async function createBoxen(
  content: string,
  options: { title?: string; padding?: number; borderColor?: string } = {}
): Promise<string> {
  const boxen = await import('boxen');
  return boxen.default(content, {
    title: options.title,
    padding: options.padding ?? 1,
    borderColor: (options.borderColor as any) ?? 'cyan',
    borderStyle: 'round',
  });
}

export function supportsColor(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  return process.stdout.isTTY ?? false;
}
