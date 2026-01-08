export type PipelineStatus = "pending" | "running" | "analyzing" | "completed" | "failed";

export type PipelineQueryStatus =
  | "pending"
  | "running"
  | "waiting_login"
  | "waiting_captcha"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout";

export type PipelineRunRow = {
  id: string;
  category: string;
  status: PipelineStatus;
  dify_workflow_run_id: string | null;
  analysis_workflow_run_id: string | null;
  analysis_result: unknown | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type PipelineQueryRow = {
  id: string;
  run_id: string;
  query: string;
  position: number;
  gpt_task_id: string | null;
  status: PipelineQueryStatus;
  response_text: string | null;
  response_raw: unknown | null;
  created_at: string;
  updated_at: string;
};

export type PipelineRunUpdate = Partial<{
  status: PipelineStatus;
  dify_workflow_run_id: string | null;
  analysis_workflow_run_id: string | null;
  analysis_result: unknown | null;
  error: string | null;
}>;

export type PipelineQueryInsert = {
  id: string;
  run_id: string;
  query: string;
  position: number;
  status: PipelineQueryStatus;
};

export type PipelineRunWithQueries = PipelineRunRow & {
  queries: PipelineQueryRow[];
};
