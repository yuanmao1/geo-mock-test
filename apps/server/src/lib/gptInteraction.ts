import { config } from "./config";
import { log } from "./logger";

const trimTrailingSlash = (value: string) =>
  value.length > 1 ? value.replace(/\/+$/, "") : value;

const normalizePath = (value: string) =>
  value.startsWith("/") ? value : `/${value}`;

const baseUrl = trimTrailingSlash(config.gptInteractionBaseUrl);
const apiPrefix = trimTrailingSlash(config.gptInteractionApiPrefix);

const buildUrl = (path: string, useApiPrefix: boolean) => {
  const normalizedPath = normalizePath(path);
  return `${baseUrl}${useApiPrefix ? apiPrefix : ""}${normalizedPath}`;
};

const parseJsonSafe = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const withQuery = (path: string, query?: Record<string, unknown>) => {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.append(key, String(value));
  });
  const text = params.toString();
  return text ? `${path}?${text}` : path;
};

export type GptInteractionResponse<T> = {
  ok: boolean;
  status: number;
  data: T | string | null;
};

export type TaskStatus =
  | "pending"
  | "running"
  | "waiting_login"
  | "waiting_captcha"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout";

export type TaskType = "chat" | "check_login" | "manual_login";

export type BatchStatus = "pending" | "processing" | "completed" | "failed" | "partial";

export type SourceItem = {
  title: string;
  url: string;
};

export type TaskResponse = {
  id: string;
  type: TaskType;
  status: TaskStatus;
  message?: string;
  response?: string;
  error?: string;
  sources?: SourceItem[];
  user_id: string;
  caller_user?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
  screenshot?: string | null;
};

export type TaskCreateRequest = {
  message: string;
  enable_search?: boolean;
  user_id?: string;
  caller_user?: string;
  webhook_url?: string;
  metadata?: Record<string, unknown>;
};

export type TaskCreateResponse = {
  task: TaskResponse;
  message: string;
};

export type TaskListResponse = {
  tasks: TaskResponse[];
  total: number;
  page: number;
  page_size: number;
};

export type BatchCreateRequest = {
  tasks: TaskCreateRequest[];
  user_id?: string;
  caller_user?: string;
};

export type BatchResponse = {
  id: string;
  user_id: string;
  caller_user?: string;
  status: BatchStatus;
  total_tasks: number;
  completed_tasks: number;
  created_at: string;
  updated_at: string;
  tasks?: TaskResponse[];
};

export const requestGptInteraction = async <T = unknown>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, unknown>,
  useApiPrefix = true
): Promise<GptInteractionResponse<T>> => {
  const url = buildUrl(withQuery(path, query), useApiPrefix);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    const durationMs = Math.round(performance.now() - startedAt);
    log("info", "gpt-interaction request", {
      method: options.method ?? "GET",
      url,
      status: response.status,
      durationMs,
    });

    return {
      ok: response.ok,
      status: response.status,
      data: await parseJsonSafe(response),
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    log("error", "gpt-interaction request failed", {
      method: options.method ?? "GET",
      url,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      status: 0,
      data: null,
    };
  }
};

export const gptInteractionApi = {
  createTask: (body: TaskCreateRequest) =>
    requestGptInteraction<TaskCreateResponse>("/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listTasks: (query?: {
    user_id?: string;
    caller_user?: string;
    status?: TaskStatus;
    page?: number;
    page_size?: number;
  }) => requestGptInteraction<TaskListResponse>("/tasks", {}, query),
  getTask: (taskId: string, query?: { include_screenshot?: boolean }) =>
    requestGptInteraction<TaskResponse>(`/tasks/${taskId}`, {}, query),
  cancelTask: (taskId: string) =>
    requestGptInteraction<TaskResponse>(`/tasks/${taskId}/cancel`, {
      method: "POST",
    }),
  getTaskStatus: (taskId: string) =>
    requestGptInteraction<{
      task_id: string;
      status: TaskStatus;
      has_response: boolean;
      has_error: boolean;
    }>(`/tasks/${taskId}/status`),
  createBatch: (body: BatchCreateRequest) =>
    requestGptInteraction<BatchResponse>("/batches", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listBatches: (query?: {
    page?: number;
    page_size?: number;
    user_id?: string;
    caller_user?: string;
  }) => requestGptInteraction<BatchResponse[]>("/batches", {}, query),
  getBatch: (batchId: string) =>
    requestGptInteraction<BatchResponse>(`/batches/${batchId}`),
  testWebhook: (webhook_url: string) =>
    requestGptInteraction<{
      success: boolean;
      status_code: number;
      message: string;
    }>("/webhooks/test", {
      method: "POST",
      body: JSON.stringify({ webhook_url }),
    }),
};
