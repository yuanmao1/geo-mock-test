import { config } from "../lib/config";
import { runDifyWorkflow } from "../lib/dify";
import { gptInteractionApi, type TaskCreateResponse, type TaskResponse } from "../lib/gptInteraction";
import { log } from "../lib/logger";
import { pipelineRepo } from "../repositories/pipelineRepo";
import type { PipelineQueryInsert, PipelineRunWithQueries } from "../models/pipeline";

const webhookUrl = `${config.webhookBaseUrl}${config.gptInteractionWebhookPath}`;

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

const analyzeResults = async (runId: string, category: string, text: string) => {
  if (!config.difyAnalysisApiKey) {
    await pipelineRepo.updateRun(runId, {
      status: "failed",
      error: "DIFY_ANALYSIS_API_KEY not configured",
    });
    return;
  }

  const analysis = await runDifyWorkflow(config.difyAnalysisApiKey, {
    inputs: { category, text },
  });

  const outputs = analysis?.data?.outputs ?? {};
  const result = (outputs as { result?: unknown }).result ?? outputs;

  await pipelineRepo.updateRun(runId, {
    status: "completed",
    analysis_workflow_run_id: analysis.workflow_run_id ?? null,
    analysis_result: result ?? null,
  });
};

const runPipeline = async (runId: string, category: string) => {
  if (!config.difyCategoryApiKey) {
    await pipelineRepo.updateRun(runId, {
      status: "failed",
      error: "DIFY_CATEGORY_API_KEY not configured",
    });
    return;
  }

  try {
    const difyResult = await runDifyWorkflow(config.difyCategoryApiKey, {
      inputs: { category },
    });

    const outputs = difyResult?.data?.outputs ?? {};
    const queries = toQueries((outputs as { result?: unknown }).result);

    if (!queries.length) {
      await pipelineRepo.updateRun(runId, {
        status: "failed",
        dify_workflow_run_id: difyResult.workflow_run_id ?? null,
        error: "No queries returned from Dify",
      });
      return;
    }

    const queryRows: PipelineQueryInsert[] = queries.map((query, index) => ({
      id: crypto.randomUUID(),
      run_id: runId,
      query,
      position: index,
      status: "pending",
    }));

    await pipelineRepo.insertQueries(queryRows);
    await pipelineRepo.updateRun(runId, {
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
          },
          webhook_url: webhookUrl,
        });

        const taskId = parseTaskId(taskResponse.data as TaskCreateResponse | string | null);
        if (taskId) {
          await pipelineRepo.attachTaskId(queryRow.id, taskId);
          return;
        }

        await pipelineRepo.markQueryFailed(
          queryRow.id,
          "Failed to create GPT task",
          taskResponse.data
        );
      })
    );
  } catch (error) {
    log("error", "category pipeline failed", {
      runId,
      error: error instanceof Error ? error.message : String(error),
    });
    await pipelineRepo.updateRun(runId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const geoMonitorService = {
  async startPipeline(category: string) {
    const runId = crypto.randomUUID();
    await pipelineRepo.createRun(runId, category);

    void runPipeline(runId, category);
    return runId;
  },

  async handleWebhook(payload: {
    event: string;
    task: TaskResponse;
    timestamp?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!payload?.task?.id) return;

    await pipelineRepo.updateQueryFromWebhook(payload.task);

    const run = await pipelineRepo.findRunByTaskId(payload.task.id);
    if (!run) return;

    const queries = await pipelineRepo.getQueriesByRunId(run.id);
    const allTerminal = pipelineRepo.allQueriesTerminal(queries);

    if (!allTerminal) return;

    const canAnalyze = await pipelineRepo.trySetAnalyzing(run.id);
    if (!canAnalyze) return;

    const text = collectResponseText(queries);
    if (!text) {
      await pipelineRepo.updateRun(run.id, {
        status: "failed",
        error: "No responses to analyze",
      });
      return;
    }

    await analyzeResults(run.id, run.category, text);
  },

  async getRun(runId: string): Promise<PipelineRunWithQueries | null> {
    const run = await pipelineRepo.getRunById(runId);
    if (!run) return null;
    const queries = await pipelineRepo.getQueriesByRunId(runId);
    return { ...run, queries };
  },
};
