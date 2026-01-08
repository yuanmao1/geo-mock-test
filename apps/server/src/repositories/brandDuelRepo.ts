import { sql } from "../lib/db";
import type {
  BrandDuelQueryInsert,
  BrandDuelQueryRow,
  BrandDuelQueryStatus,
  BrandDuelRunRow,
  BrandDuelRunUpdate,
} from "../models/brandDuel";
import type { TaskResponse } from "../lib/gptInteraction";

const terminalStatuses: BrandDuelQueryStatus[] = [
  "completed",
  "failed",
  "cancelled",
  "timeout",
];

const updateRun = async (runId: string, fields: BrandDuelRunUpdate) => {
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
    update brand_duel_runs
    set ${sql(updates)},
        updated_at = now()
    where id = ${runId}
  `;
};

const createRun = async (runId: string, brandA: string, brandB: string, category: string) => {
  await sql`
    insert into brand_duel_runs
    (id, brand_a, brand_b, category, status)
    values (${runId}, ${brandA}, ${brandB}, ${category}, 'pending')
  `;
};

const insertQueries = async (rows: BrandDuelQueryInsert[]) => {
  if (!rows.length) return;

  await sql`
    insert into brand_duel_queries
    ${sql(rows, "id", "run_id", "query", "position", "status")}
  `;
};

const attachTaskId = async (queryId: string, taskId: string) => {
  await sql`
    update brand_duel_queries
    set gpt_task_id = ${taskId},
        status = 'running',
        updated_at = now()
    where id = ${queryId}
  `;
};

const updateQueryFromWebhook = async (task: TaskResponse) => {
  await sql`
    update brand_duel_queries
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
    update brand_duel_queries
    set status = 'failed',
        response_text = ${error},
        response_raw = ${sql.json(responseRaw ?? { error })},
        updated_at = now()
    where id = ${queryId}
  `;
};

const findRunByTaskId = async (taskId: string) => {
  const rows = await sql<BrandDuelRunRow[]>`
    select r.*
    from brand_duel_runs r
    join brand_duel_queries q on q.run_id = r.id
    where q.gpt_task_id = ${taskId}
    limit 1
  `;
  return rows[0] ?? null;
};

const getRunById = async (runId: string) => {
  const rows = await sql<BrandDuelRunRow[]>`
    select *
    from brand_duel_runs
    where id = ${runId}
    limit 1
  `;
  return rows[0] ?? null;
};

const getQueriesByRunId = async (runId: string) => {
  return sql<BrandDuelQueryRow[]>`
    select *
    from brand_duel_queries
    where run_id = ${runId}
    order by position asc
  `;
};

const listRuns = async (page: number, pageSize: number) => {
  const offset = (page - 1) * pageSize;
  const runs = await sql<BrandDuelRunRow[]>`
    select *
    from brand_duel_runs
    order by created_at desc
    limit ${pageSize}
    offset ${offset}
  `;
  const totals = await sql<{ total: number }[]>`
    select count(*)::int as total
    from brand_duel_runs
  `;
  return {
    runs,
    total: totals[0]?.total ?? 0,
  };
};

const trySetAnalyzing = async (runId: string) => {
  const rows = await sql`
    update brand_duel_runs
    set status = 'analyzing',
        updated_at = now()
    where id = ${runId}
      and status = 'running'
    returning id
  `;
  return rows.length > 0;
};

const allQueriesTerminal = (queries: BrandDuelQueryRow[]) =>
  queries.every((query) => terminalStatuses.includes(query.status));

export const brandDuelRepo = {
  createRun,
  updateRun,
  insertQueries,
  attachTaskId,
  updateQueryFromWebhook,
  markQueryFailed,
  findRunByTaskId,
  getRunById,
  getQueriesByRunId,
  listRuns,
  trySetAnalyzing,
  allQueriesTerminal,
};
