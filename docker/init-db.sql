-- GEO Mock 数据库初始化脚本
-- 创建多个数据库以支持不同服务

-- 创建 GPT Interaction 数据库
CREATE DATABASE gpt_interaction;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE geo_mock TO postgres;
GRANT ALL PRIVILEGES ON DATABASE gpt_interaction TO postgres;

-- 连接到 geo_mock 数据库并创建扩展
\c geo_mock;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 基础表结构 (由 server/migrations/001_category_pipeline.sql 提供)
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

-- 基础表结构 (由 server/migrations/002_brand_duel_pipeline.sql 提供)
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

-- 连接到 gpt_interaction 数据库并创建扩展
\c gpt_interaction;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
