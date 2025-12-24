export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const configuredLevel = (Bun.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined) ?? 'info';
const minRank = levelRank[configuredLevel] ?? levelRank.info;

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if ((levelRank[level] ?? 100) < minRank) return;

  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;

  // eslint-disable-next-line no-console
  console.log(`${prefix} ${message}${meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''}`);
}

