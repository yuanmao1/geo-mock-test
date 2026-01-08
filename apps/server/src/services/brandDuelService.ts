import { config } from "../lib/config";
import { runDifyWorkflow } from "../lib/dify";
import { gptInteractionApi, type TaskCreateResponse, type TaskResponse } from "../lib/gptInteraction";
import { log } from "../lib/logger";
import { brandDuelRepo } from "../repositories/brandDuelRepo";
import type { BrandDuelQueryInsert, BrandDuelRunWithQueries } from "../models/brandDuel";

const webhookUrl = `${config.webhookBaseUrl}${config.gptInteractionBrandDuelWebhookPath}`;

const toQueries = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
};

const collectResponseText = (responses: { response_text: string | null }[]) =>
  responses
    .map((query) => query.response_text)
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

const parseTaskId = (data: TaskCreateResponse | string | null) => {
  if (!data || typeof data === "string") return null;
  return data.task?.id ?? null;
};

const analyzeResults = async (
  runId: string,
  brandA: string,
  brandB: string,
  text: string
) => {
  if (!config.difyBrandDuelAnalysisApiKey) {
    await brandDuelRepo.updateRun(runId, {
      status: "failed",
      error: "DIFY_BRAND_DUEL_ANALYSIS_API_KEY not configured",
    });
    return;
  }

  const analysis = await runDifyWorkflow(config.difyBrandDuelAnalysisApiKey, {
    inputs: { brandA, brandB, text },
  });

  const outputs = analysis?.data?.outputs ?? {};
  const result = (outputs as { result?: unknown }).result ?? outputs;

  await brandDuelRepo.updateRun(runId, {
    status: "completed",
    analysis_workflow_run_id: analysis.workflow_run_id ?? null,
    analysis_result: result ?? null,
  });
};

const runPipeline = async (
  runId: string,
  brandA: string,
  brandB: string,
  category: string
) => {
  if (!config.difyBrandDuelPromptsApiKey) {
    await brandDuelRepo.updateRun(runId, {
      status: "failed",
      error: "DIFY_BRAND_DUEL_PROMPTS_API_KEY not configured",
    });
    return;
  }

  try {
    const difyResult = await runDifyWorkflow(config.difyBrandDuelPromptsApiKey, {
      inputs: { brandA, brandB, category },
    });

    const outputs = difyResult?.data?.outputs ?? {};
    const queries = toQueries((outputs as { result?: unknown }).result);

    if (!queries.length) {
      await brandDuelRepo.updateRun(runId, {
        status: "failed",
        dify_workflow_run_id: difyResult.workflow_run_id ?? null,
        error: "No queries returned from Dify",
      });
      return;
    }

    const queryRows: BrandDuelQueryInsert[] = queries.map((query, index) => ({
      id: crypto.randomUUID(),
      run_id: runId,
      query,
      position: index,
      status: "pending",
    }));

    await brandDuelRepo.insertQueries(queryRows);
    await brandDuelRepo.updateRun(runId, {
      status: "running",
      dify_workflow_run_id: difyResult.workflow_run_id ?? null,
    });

    await Promise.all(
      queryRows.map(async (queryRow) => {
        const taskResponse = await gptInteractionApi.createTask({
          message: queryRow.query,
          metadata: {
            run_id: runId,
            query_id: queryRow.id,
            brandA,
            brandB,
            category,
          },
          webhook_url: webhookUrl,
        });

        const taskId = parseTaskId(taskResponse.data as TaskCreateResponse | string | null);
        if (taskId) {
          await brandDuelRepo.attachTaskId(queryRow.id, taskId);
          return;
        }

        await brandDuelRepo.markQueryFailed(
          queryRow.id,
          "Failed to create GPT task",
          taskResponse.data
        );
      })
    );
  } catch (error) {
    log("error", "brand duel pipeline failed", {
      runId,
      error: error instanceof Error ? error.message : String(error),
    });
    await brandDuelRepo.updateRun(runId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const brandDuelService = {
  async startPipeline(brandA: string, brandB: string, category: string) {
    const runId = crypto.randomUUID();
    await brandDuelRepo.createRun(runId, brandA, brandB, category);

    void runPipeline(runId, brandA, brandB, category);
    return runId;
  },

  async handleWebhook(payload: {
    event: string;
    task: TaskResponse;
    timestamp?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!payload?.task?.id) return;

    await brandDuelRepo.updateQueryFromWebhook(payload.task);

    const run = await brandDuelRepo.findRunByTaskId(payload.task.id);
    if (!run) return;

    const queries = await brandDuelRepo.getQueriesByRunId(run.id);
    const allTerminal = brandDuelRepo.allQueriesTerminal(queries);

    if (!allTerminal) return;

    const canAnalyze = await brandDuelRepo.trySetAnalyzing(run.id);
    if (!canAnalyze) return;

    const text = collectResponseText(queries);
    if (!text) {
      await brandDuelRepo.updateRun(run.id, {
        status: "failed",
        error: "No responses to analyze",
      });
      return;
    }

    await analyzeResults(run.id, run.brand_a, run.brand_b, text);
  },

  async getRun(runId: string): Promise<BrandDuelRunWithQueries | null> {
    const run = await brandDuelRepo.getRunById(runId);
    if (!run) return null;
    const queries = await brandDuelRepo.getQueriesByRunId(runId);
    return { ...run, queries };
  },

  async listRuns(page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const { runs, total } = await brandDuelRepo.listRuns(safePage, safePageSize);
    return {
      runs,
      total,
      page: safePage,
      page_size: safePageSize,
    };
  },
};
