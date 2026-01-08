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

  async listRuns(page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const { runs, total } = await pipelineRepo.listRuns(safePage, safePageSize);
    return {
      runs,
      total,
      page: safePage,
      page_size: safePageSize,
    };
  },

  // 获取品类聚合统计
  async getCategoryAggregation(category: string) {
    const runs = await pipelineRepo.getAggregatedResults(category);
    
    if (!runs.length) {
      return {
        category,
        total_runs: 0,
        brands: [],
        summary: null,
      };
    }

    // 聚合所有分析结果中的品牌数据
    const brandMap = new Map<string, {
      mentions: number;
      positive: number;
      negative: number;
      neutral: number;
      keywords: Set<string>;
      strengths: Set<string>;
      weaknesses: Set<string>;
    }>();

    for (const run of runs) {
      let analysisResult = run.analysis_result;
      if (typeof analysisResult === 'string') {
        try {
          analysisResult = JSON.parse(analysisResult);
        } catch {
          continue;
        }
      }

      // 处理分析结果
      const brands = Array.isArray(analysisResult) 
        ? analysisResult 
        : (analysisResult as { summary?: { leaderboard?: unknown[] } })?.summary?.leaderboard || [];

      for (const brand of brands) {
        const name = brand.brand || brand.name;
        if (!name) continue;

        const existing = brandMap.get(name) || {
          mentions: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
          keywords: new Set(),
          strengths: new Set(),
          weaknesses: new Set(),
        };

        existing.mentions++;
        
        // 情感统计
        const sentiment = brand.sentiment?.toLowerCase?.() || '';
        if (sentiment.includes('positive') || (typeof brand.sentiment === 'number' && brand.sentiment > 0.6)) {
          existing.positive++;
        } else if (sentiment.includes('negative') || (typeof brand.sentiment === 'number' && brand.sentiment < 0.4)) {
          existing.negative++;
        } else {
          existing.neutral++;
        }

        // 关键词
        if (brand.keywords) {
          brand.keywords.forEach((k: string) => existing.keywords.add(k));
        }
        if (brand.strengths) {
          brand.strengths.forEach((s: string) => existing.strengths.add(s));
        }
        if (brand.weaknesses) {
          brand.weaknesses.forEach((w: string) => existing.weaknesses.add(w));
        }

        brandMap.set(name, existing);
      }
    }

    // 转换为数组并排序
    const aggregatedBrands = Array.from(brandMap.entries())
      .map(([name, data]) => ({
        brand: name,
        mentions: data.mentions,
        sentiment: {
          positive: data.positive,
          negative: data.negative,
          neutral: data.neutral,
        },
        mentionRate: (data.mentions / runs.length) * 100,
        keywords: Array.from(data.keywords).slice(0, 10),
        strengths: Array.from(data.strengths).slice(0, 5),
        weaknesses: Array.from(data.weaknesses).slice(0, 5),
      }))
      .sort((a, b) => b.mentions - a.mentions);

    return {
      category,
      total_runs: runs.length,
      date_range: {
        from: runs[runs.length - 1]?.created_at,
        to: runs[0]?.created_at,
      },
      brands: aggregatedBrands,
      top_brand: aggregatedBrands[0]?.brand || null,
    };
  },
};
