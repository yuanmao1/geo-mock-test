export type PipelineStatus = 'pending' | 'running' | 'analyzing' | 'completed' | 'failed';

export type PipelineQueryStatus =
  | 'pending'
  | 'running'
  | 'waiting_login'
  | 'waiting_captcha'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface PipelineRunRow {
  id: string;
  category: string;
  status: PipelineStatus;
  dify_workflow_run_id: string | null;
  analysis_workflow_run_id: string | null;
  analysis_result: unknown | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineQueryRow {
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
}

export interface PipelineRunWithQueries extends PipelineRunRow {
  queries: PipelineQueryRow[];
}

export interface PipelineListResponse {
  runs: PipelineRunRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface CategoryPipelineStartRequest {
  category: string;
}

export interface CategoryPipelineStartResponse {
  run_id: string;
}

export type CategoryPipelineListResponse = PipelineListResponse;

export type CategoryPipelineGetResponse = PipelineRunWithQueries;

export type BrandDuelStatus = PipelineStatus;

export type BrandDuelQueryStatus = PipelineQueryStatus;

export interface BrandDuelRunRow {
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
}

export interface BrandDuelQueryRow {
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
}

export interface BrandDuelRunWithQueries extends BrandDuelRunRow {
  queries: BrandDuelQueryRow[];
}

export interface BrandDuelListResponse {
  runs: BrandDuelRunRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface BrandDuelStartRequest {
  brandA: string;
  brandB: string;
  category: string;
}

export interface BrandDuelStartResponse {
  run_id: string;
}

export type BrandDuelGetResponse = BrandDuelRunWithQueries;
