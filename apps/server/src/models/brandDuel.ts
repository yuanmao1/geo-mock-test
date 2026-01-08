export type BrandDuelStatus = "pending" | "running" | "analyzing" | "completed" | "failed";

export type BrandDuelQueryStatus =
  | "pending"
  | "running"
  | "waiting_login"
  | "waiting_captcha"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout";

export type BrandDuelRunRow = {
  id: string;
  brand_a: string;
  brand_b: string;
  category: string;
  status: BrandDuelStatus;
  dify_workflow_run_id: string | null;
  analysis_workflow_run_id: string | null;
  analysis_result: unknown | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandDuelQueryRow = {
  id: string;
  run_id: string;
  query: string;
  position: number;
  gpt_task_id: string | null;
  status: BrandDuelQueryStatus;
  response_text: string | null;
  response_raw: unknown | null;
  created_at: string;
  updated_at: string;
};

export type BrandDuelRunUpdate = Partial<{
  status: BrandDuelStatus;
  dify_workflow_run_id: string | null;
  analysis_workflow_run_id: string | null;
  analysis_result: unknown | null;
  error: string | null;
}>;

export type BrandDuelQueryInsert = {
  id: string;
  run_id: string;
  query: string;
  position: number;
  status: BrandDuelQueryStatus;
};

export type BrandDuelRunWithQueries = BrandDuelRunRow & {
  queries: BrandDuelQueryRow[];
};
