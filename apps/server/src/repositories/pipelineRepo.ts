import { sql } from "../lib/db";
import type {
  PipelineQueryInsert,
  PipelineQueryRow,
  PipelineQueryStatus,
  PipelineRunRow,
  PipelineRunUpdate,
} from "../models/pipeline";
import type { TaskResponse } from "../lib/gptInteraction";

const terminalStatuses: PipelineQueryStatus[] = [
  "completed",
  "failed",
  "cancelled",
  "timeout",
];

const updateRun = async (runId: string, fields: PipelineRunUpdate) => {
  const updates: Record<string, unknown> = {};

  if (fields.status !== undefined) updates.status = fields.status;
  if (fields.dify_workflow_run_id !== undefined)
    updates.dify_workflow_run_id = fields.dify_workflow_run_id;
  if (fields.analysis_workflow_run_id !== undefined)
    updates.analysis_workflow_run_id = fields.analysis_workflow_run_id;
  if (fields.analysis_result !== undefined)
    updates.analysis_result = sql.json(fields.analysis_result);
  if (fields.error !== undefined) updates.error = fields.error;

  if (Object.keys(updates).length === 0) return;

  await sql`
    update category_pipeline_runs
    set ${sql(updates)},
        updated_at = now()
    where id = ${runId}
  `;
};

const createRun = async (runId: string, category: string) => {
  await sql`
    insert into category_pipeline_runs
    (id, category, status)
    values (${runId}, ${category}, 'pending')
  `;
};

const insertQueries = async (rows: PipelineQueryInsert[]) => {
  if (!rows.length) return;

  await sql`
    insert into category_pipeline_queries
    ${sql(rows, "id", "run_id", "query", "position", "status")}
  `;
};

const attachTaskId = async (queryId: string, taskId: string) => {
  await sql`
    update category_pipeline_queries
    set gpt_task_id = ${taskId},
        status = 'running',
        updated_at = now()
    where id = ${queryId}
  `;
};

const updateQueryFromWebhook = async (task: TaskResponse) => {
  await sql`
    update category_pipeline_queries
    set status = ${task.status},
        response_text = ${task.response ?? null},
        response_raw = ${sql.json(task)},
        updated_at = now()
    where gpt_task_id = ${task.id}
  `;
};

const markQueryFailed = async (
  queryId: string,
  error: string,
  responseRaw?: unknown
) => {
  await sql`
    update category_pipeline_queries
    set status = 'failed',
        response_text = ${error},
        response_raw = ${sql.json(responseRaw ?? { error })},
        updated_at = now()
    where id = ${queryId}
  `;
};

const findRunByTaskId = async (taskId: string) => {
  const rows = await sql<PipelineRunRow[]>`
    select r.*
    from category_pipeline_runs r
    join category_pipeline_queries q on q.run_id = r.id
    where q.gpt_task_id = ${taskId}
    limit 1
  `;
  return rows[0] ?? null;
};

const getRunById = async (runId: string) => {
  const rows = await sql<PipelineRunRow[]>`
    select *
    from category_pipeline_runs
    where id = ${runId}
    limit 1
  `;
  return rows[0] ?? null;
};

const getQueriesByRunId = async (runId: string) => {
  return sql<PipelineQueryRow[]>`
    select *
    from category_pipeline_queries
    where run_id = ${runId}
    order by position asc
  `;
};

const trySetAnalyzing = async (runId: string) => {
  const rows = await sql`
    update category_pipeline_runs
    set status = 'analyzing',
        updated_at = now()
    where id = ${runId}
      and status = 'running'
    returning id
  `;
  return rows.length > 0;
};

const allQueriesTerminal = (queries: PipelineQueryRow[]) =>
  queries.every((query) => terminalStatuses.includes(query.status));

export const pipelineRepo = {
  createRun,
  updateRun,
  insertQueries,
  attachTaskId,
  updateQueryFromWebhook,
  markQueryFailed,
  findRunByTaskId,
  getRunById,
  getQueriesByRunId,
  trySetAnalyzing,
  allQueriesTerminal,
};
