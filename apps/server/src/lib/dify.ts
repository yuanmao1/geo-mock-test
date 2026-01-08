import { config } from "./config";
import { log } from "./logger";

export type DifyWorkflowResponse = {
  workflow_run_id?: string;
  task_id?: string;
  data?: {
    id?: string;
    workflow_id?: string;
    status?: string;
    outputs?: Record<string, unknown>;
    error?: string | null;
    elapsed_time?: number;
    total_tokens?: number;
    total_steps?: number;
    created_at?: number;
    finished_at?: number;
  };
};

type DifyWorkflowRequest = {
  inputs: Record<string, unknown>;
  response_mode?: string;
  user?: string;
};

export const runDifyWorkflow = async (
  apiKey: string,
  payload: DifyWorkflowRequest
): Promise<DifyWorkflowResponse> => {
  const url = `${config.difyBaseUrl.replace(/\/+$/, "")}/v1/workflows/run`;
  const startedAt = performance.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: payload.inputs,
      response_mode: payload.response_mode ?? config.difyResponseMode,
      user: payload.user ?? config.difyUser,
    }),
  });

  const durationMs = Math.round(performance.now() - startedAt);
  const text = await response.text();
  const data = text ? (JSON.parse(text) as DifyWorkflowResponse) : {};

  log("info", "dify workflow run", {
    status: response.status,
    durationMs,
  });

  if (!response.ok) {
    log("error", "dify workflow failed", { status: response.status, data });
  }

  return data;
};
