create table if not exists brand_duel_runs (
  id text primary key,
  brand_a text not null,
  brand_b text not null,
  category text not null,
  status text not null,
  dify_workflow_run_id text,
  analysis_workflow_run_id text,
  analysis_result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brand_duel_queries (
  id text primary key,
  run_id text not null references brand_duel_runs(id) on delete cascade,
  query text not null,
  position integer not null,
  gpt_task_id text,
  status text not null,
  response_text text,
  response_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brand_duel_queries_run_id
  on brand_duel_queries (run_id);

create index if not exists idx_brand_duel_queries_task_id
  on brand_duel_queries (gpt_task_id);
