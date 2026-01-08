create table if not exists category_pipeline_runs (
  id text primary key,
  category text not null,
  status text not null,
  dify_workflow_run_id text,
  analysis_workflow_run_id text,
  analysis_result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists category_pipeline_queries (
  id text primary key,
  run_id text not null references category_pipeline_runs(id) on delete cascade,
  query text not null,
  position integer not null,
  gpt_task_id text,
  status text not null,
  response_text text,
  response_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_category_pipeline_queries_run_id
  on category_pipeline_queries (run_id);

create index if not exists idx_category_pipeline_queries_task_id
  on category_pipeline_queries (gpt_task_id);
