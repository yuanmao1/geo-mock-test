# Geo Monitor APIs

This document lists the server-side Geo Monitor related endpoints and
recommended frontend usage patterns.

Shared types are exported from `@geo/shared-types`:
- `CategoryPipelineStartRequest`
- `CategoryPipelineStartResponse`
- `CategoryPipelineListResponse`
- `CategoryPipelineGetResponse`
- `BrandDuelStartRequest`
- `BrandDuelStartResponse`
- `BrandDuelListResponse`
- `BrandDuelGetResponse`

## Category Pipeline

### GET /api/pipelines/category
List category pipeline runs (history).

Query:
- page (default 1)
- page_size (default 20, max 100)

Response:
```json
{
  "runs": [],
  "total": 0,
  "page": 1,
  "page_size": 20
}
```
Type: `CategoryPipelineListResponse`

### POST /api/pipelines/category
Start a category monitoring pipeline.

Request body:
```json
{
  "category": "Gree"
}
```

Response:
```json
{
  "run_id": "uuid"
}
```
Type: `CategoryPipelineStartResponse`

### GET /api/pipelines/category/{runId}
Fetch pipeline progress, queries, and final analysis_result.
Type: `CategoryPipelineGetResponse`

## Brand Duel Pipeline

### GET /api/pipelines/brand-duel
List brand duel pipeline runs (history).

Query:
- page (default 1)
- page_size (default 20, max 100)

Response:
```json
{
  "runs": [],
  "total": 0,
  "page": 1,
  "page_size": 20
}
```
Type: `BrandDuelListResponse`

### POST /api/pipelines/brand-duel
Start a brand duel pipeline.

Request body:
```json
{
  "brandA": "Gree",
  "brandB": "Midea",
  "category": "Air Conditioner"
}
```

Response:
```json
{
  "run_id": "uuid"
}
```
Type: `BrandDuelStartResponse`

### GET /api/pipelines/brand-duel/{runId}
Fetch pipeline progress, queries, and final analysis_result.
Type: `BrandDuelGetResponse`

## Monitor (UI Demo)

### POST /api/monitor/tasks
Create a test task for visual progress demo.

Request body:
```json
{
  "message": "Summarize the current page"
}
```

Response:
```json
{
  "task": {
    "id": "ulid",
    "status": "pending"
  },
  "message": "..."
}
```

### GET /api/monitor/tasks/{taskId}?include_screenshot=true
Poll task detail and a screenshot while running.

## Frontend Usage

1. Start pipeline and store run_id.
2. Poll the run endpoint every 2-5 seconds.
3. Show status and analysis_result when completed.
4. For demo visualization, create a monitor task and poll for screenshot.
