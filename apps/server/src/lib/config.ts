import { resolve } from "path";

const normalizePath = (value: string) => {
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
};

const trimTrailingSlash = (value: string) =>
  value.length > 1 ? value.replace(/\/+$/, "") : value;

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const apiPrefixRaw = normalizePath(Bun.env.API_PREFIX ?? "/api");
const apiPrefix = trimTrailingSlash(apiPrefixRaw);

const port = parseNumber(Bun.env.PORT, 3000);

const gptInteractionApiPrefixRaw = normalizePath(
  Bun.env.GPT_INTERACTION_API_PREFIX ?? "/api/v1"
);
const gptInteractionApiPrefix = trimTrailingSlash(gptInteractionApiPrefixRaw);

const logDir = Bun.env.LOG_DIR ?? "./logs";
const logFile = Bun.env.LOG_FILE ?? "server.log";
const logPath = Bun.env.LOG_PATH
  ? resolve(Bun.env.LOG_PATH)
  : resolve(logDir, logFile);

export const config = {
  port,
  apiPrefix,
  logDir,
  logPath,
  gptInteractionBaseUrl: Bun.env.GPT_INTERACTION_BASE_URL ?? "http://localhost:8000",
  gptInteractionApiPrefix,
  gptInteractionWebhookPath:
    Bun.env.GPT_INTERACTION_WEBHOOK_PATH ?? `${apiPrefix}/pipelines/category/webhook`,
  gptInteractionBrandDuelWebhookPath:
    Bun.env.GPT_INTERACTION_BRAND_DUEL_WEBHOOK_PATH ??
    `${apiPrefix}/pipelines/brand-duel/webhook`,
  webhookBaseUrl: Bun.env.WEBHOOK_BASE_URL ?? `http://localhost:${port}`,
  difyBaseUrl: Bun.env.DIFY_BASE_URL ?? "http://network.jancsitech.net",
  difyCategoryApiKey: Bun.env.DIFY_CATEGORY_API_KEY ?? "",
  difyAnalysisApiKey: Bun.env.DIFY_ANALYSIS_API_KEY ?? "",
  difyBrandDuelPromptsApiKey: Bun.env.DIFY_BRAND_DUEL_PROMPTS_API_KEY ?? "",
  difyBrandDuelAnalysisApiKey: Bun.env.DIFY_BRAND_DUEL_ANALYSIS_API_KEY ?? "",
  difyResponseMode: Bun.env.DIFY_RESPONSE_MODE ?? "blocking",
  difyUser: Bun.env.DIFY_USER ?? "geo-mock",
  databaseUrl: Bun.env.DATABASE_URL ?? "",
};

export type AppConfig = typeof config;
