import type {
  PipelineQueryRow,
  PipelineQueryStatus,
  PipelineRunRow,
  PipelineRunWithQueries,
  PipelineStatus,
} from "@geo/shared-types";

export type {
  PipelineQueryRow,
  PipelineQueryStatus,
  PipelineRunRow,
  PipelineRunWithQueries,
  PipelineStatus,
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
