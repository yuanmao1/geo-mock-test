# API 文档

## 基础信息
- Base URL: `http://localhost:8000`
- API 前缀：除健康检查外，其余接口均以 `/api/v1` 开头
- 认证：当前为匿名模式（未实现鉴权）

## 关于 `user_id` 与 `caller_user`
- `user_id`：用于**浏览器会话/cookie**隔离与持久化（会影响 `user_data/` 下的 profile 目录）。可不传或传空字符串，服务端会使用默认 `DEFAULT_USER_ID`。
- `caller_user`：用于表示**调用方用户**（例如业务系统里的用户/租户），仅用于审计、检索与权限扩展，不参与 cookie/session 存储。

## 通用数据结构

### TaskStatus
`pending` | `running` | `waiting_login` | `waiting_captcha` | `completed` | `failed` | `cancelled` | `timeout`

### TaskType
`chat` | `check_login` | `manual_login`

### BatchStatus
`pending` | `processing` | `completed` | `failed` | `partial`

### SourceItem
字段 | 类型 | 说明
---|---|---
title | string | 引用来源标题
url | string | 引用来源链接

### TaskResponse
字段 | 类型 | 说明
---|---|---
id | string | 任务 ID（ULID）
type | TaskType | 任务类型
status | TaskStatus | 任务状态
message | string? | 输入消息（chat 任务）
response | string? | ChatGPT 响应
error | string? | 失败原因
sources | SourceItem[]? | 联网搜索的引用来源列表
user_id | string | cookie/session 用户（用于浏览器 profile 存储）
caller_user | string? | 调用方用户标识（与 cookie/session 无关）
created_at | datetime | 创建时间
started_at | datetime? | 开始时间
completed_at | datetime? | 完成时间
metadata | object? | 自定义元数据

### TaskCreateRequest
字段 | 类型 | 必填 | 说明
---|---|---|---
message | string | 是 | 发送给 ChatGPT 的消息
enable_search | boolean | 否 | 是否启用联网搜索（默认 true）
user_id | string | 否 | cookie/session 用户（不传或空字符串则使用默认）
caller_user | string | 否 | 调用方用户标识（可任意字符串）
webhook_url | string(URL) | 否 | Webhook 回调地址
metadata | object | 否 | Webhook 透传元数据

### TaskCreateResponse
字段 | 类型 | 说明
---|---|---
task | TaskResponse | 任务详情
message | string | 提示信息

### TaskListResponse
字段 | 类型 | 说明
---|---|---
tasks | TaskResponse[] | 任务列表
total | number | 总数
page | number | 当前页
page_size | number | 每页数量

### BatchCreateRequest
字段 | 类型 | 必填 | 说明
---|---|---|---
tasks | TaskCreateRequest[] | 是 | 批量任务
user_id | string | 否 | cookie/session 用户（不传或空字符串则使用默认）
caller_user | string | 否 | 调用方用户标识（可任意字符串）

### BatchResponse
字段 | 类型 | 说明
---|---|---
id | string | 批次 ID
user_id | string | cookie/session 用户
caller_user | string? | 调用方用户标识
status | BatchStatus | 批次状态
total_tasks | number | 总任务数
completed_tasks | number | 已完成任务数
created_at | datetime | 创建时间
updated_at | datetime | 更新时间
tasks | TaskResponse[]? | 任务详情（部分接口返回）

### UserResponse
字段 | 类型 | 说明
---|---|---
id | string | 用户 ID
username | string? | 用户名
is_active | boolean | 是否激活
created_at | datetime | 创建时间
has_browser_session | boolean | 是否存在浏览器会话

### ErrorResponse
字段 | 类型 | 说明
---|---|---
error | string | 错误码
message | string | 错误信息
details | object? | 额外信息

## 健康检查

### GET `/health`
描述：健康检查。

响应：
```json
{ "status": "ok" }
```

### GET `/status`
描述：服务状态与任务统计。

响应字段：`StatusResponse`
- status: string
- version: string
- active_tasks: number
- pending_tasks: number

### GET `/stats`
描述：按状态统计任务数量。

响应：
```json
{
  "tasks_by_status": {
    "pending": 3,
    "running": 1
  },
  "running_tasks": 1
}
```

## 任务接口

### POST `/api/v1/tasks`
描述：创建聊天任务（异步执行）。

请求体：`TaskCreateRequest`

响应：`TaskCreateResponse`

错误：
- 400 Invalid request
- 500 Internal server error

### GET `/api/v1/tasks`
描述：获取任务列表（分页）。

查询参数：
参数 | 类型 | 说明
---|---|---
user_id | string? | 按 cookie/session 用户过滤
caller_user | string? | 按调用方用户过滤
status | TaskStatus? | 状态过滤
page | number | 页码（默认 1）
page_size | number | 每页数量（默认 20，最大 100）

响应：`TaskListResponse`

### GET `/api/v1/tasks/{task_id}`
描述：获取任务详情。

路径参数：
- task_id: string

查询参数：
参数 | 类型 | 说明
---|---|---
include_screenshot | boolean | 是否包含浏览器截图（仅当任务处于 `running` 状态时有效，默认 `false`）

响应：`TaskResponse`

当 `include_screenshot=true` 且任务正在运行时，响应会额外包含：
字段 | 类型 | 说明
---|---|---
screenshot | string? | Base64 编码的 PNG 截图（如果任务不在运行中或截图失败则为 `null`）

错误：
- 404 Task not found

### POST `/api/v1/tasks/{task_id}/cancel`
描述：取消任务（pending/running）。

路径参数：
- task_id: string

响应：`TaskResponse`

错误：
- 404 Task not found

### GET `/api/v1/tasks/{task_id}/status`
描述：仅获取任务状态（轻量）。

响应：
```json
{
  "task_id": "01HXYZ...",
  "status": "running",
  "has_response": false,
  "has_error": false
}
```

## 批次接口

### POST `/api/v1/batches`
描述：创建批量任务。

请求体：`BatchCreateRequest`

响应：`BatchResponse`

错误：
- 400 Invalid request
- 500 Internal server error

### GET `/api/v1/batches/{batch_id}`
描述：获取批次详情（含任务列表）。

路径参数：
- batch_id: string

响应：`BatchResponse`（包含 `tasks`）

错误：
- 404 Batch not found
- 403 Not authorized to access this batch

### GET `/api/v1/batches`
描述：获取批次列表（分页）。

查询参数：
参数 | 类型 | 说明
---|---|---
page | number | 页码（默认 1）
page_size | number | 每页数量（默认 20，最大 100）
user_id | string? | 按 cookie/session 用户过滤
caller_user | string? | 按调用方用户过滤

响应：`BatchResponse[]`

## 用户/会话接口

### GET `/api/v1/users/me`
描述：获取当前用户信息。

响应：`UserResponse`

### GET `/api/v1/users`
描述：获取用户列表（分页）。

查询参数：
参数 | 类型 | 说明
---|---|---
page | number | 页码（默认 1）
page_size | number | 每页数量（默认 20，最大 100）

响应：
```json
{
  "users": [/* UserResponse[] */],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

### POST `/api/v1/users/login/manual`
描述：创建手动登录任务（打开浏览器，等待人工登录）。

请求体：
字段 | 类型 | 必填 | 说明
---|---|---|---
user_id | string | 否 | cookie/session 用户（不传或空字符串则使用默认）
caller_user | string | 否 | 调用方用户标识（可任意字符串）

响应：`TaskCreateResponse`

### GET `/api/v1/users/{user_id}/login-status`
描述：同步检查登录状态（会启动浏览器检测）。

响应：
```json
{
  "user_id": "default",
  "is_logged_in": true,
  "message": "User is logged in"
}
```

### POST `/api/v1/users/{user_id}/check-login`
描述：创建异步登录状态检测任务。

响应：`TaskCreateResponse`

## Webhook 接口

### POST `/api/v1/webhooks/test`
描述：测试 Webhook 回调地址。

请求体：
字段 | 类型 | 必填 | 说明
---|---|---|---
webhook_url | string(URL) | 是 | 回调地址

响应：
```json
{
  "success": true,
  "status_code": 200,
  "message": "Webhook test successful"
}
```

## Webhook 回调格式
当任务完成/失败/等待登录/验证码时，系统会向 `webhook_url` 发送：

```json
{
  "event": "task.completed",
  "task": { /* TaskResponse */ },
  "timestamp": "2024-01-01T00:01:00Z",
  "metadata": {}
}
```

事件类型示例：
- `task.completed`
- `task.failed`
- `task.waiting_login`
- `task.waiting_captcha`

## 数据库约束与迁移提示
- `tasks.user_id` / `batches.user_id` 作为 cookie/session 用户字段，存在外键约束指向 `users.id`；通过 API 创建任务/批次时服务会自动创建缺失的 `users` 记录，但如果你直接对数据库写入不满足约束的数据，会插入失败。
- 本项目使用 `Base.metadata.create_all` 初始化表结构；它不会自动对“已有表”做字段/约束变更。若你已有旧库，需要自行执行迁移（推荐 Alembic），或在开发环境直接删除旧表后重建。
