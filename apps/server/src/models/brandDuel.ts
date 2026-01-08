import type {
  BrandDuelQueryRow,
  BrandDuelQueryStatus,
  BrandDuelRunRow,
  BrandDuelRunWithQueries,
  BrandDuelStatus,
} from "@geo/shared-types";

export type {
  BrandDuelQueryRow,
  BrandDuelQueryStatus,
  BrandDuelRunRow,
  BrandDuelRunWithQueries,
  BrandDuelStatus,
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
