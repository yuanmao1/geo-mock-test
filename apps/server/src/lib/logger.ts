import { mkdirSync } from "fs";
import { config } from "./config";

export type LogLevel = "debug" | "info" | "warn" | "error";

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel =
  (Bun.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined) ?? "info";
const minRank = levelRank[configuredLevel] ?? levelRank.info;
let logDirReady = false;

const ensureLogDir = () => {
  if (logDirReady) return;
  mkdirSync(config.logDir, { recursive: true });
  logDirReady = true;
};

const formatLine = (
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
) => {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const metaText =
    meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${prefix} ${message}${metaText}`;
};

const writeLine = (line: string) => {
  try {
    ensureLogDir();
    void Bun.write(config.logPath, `${line}\n`, { append: true }).catch(
      (error) => {
        // eslint-disable-next-line no-console
        console.error("[logger] file write failed", error);
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[logger] init failed", error);
  }
};

export function log(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
) {
  if ((levelRank[level] ?? 100) < minRank) return;

  const line = formatLine(level, message, meta);

  // eslint-disable-next-line no-console
  console.log(line);
  writeLine(line);
}
