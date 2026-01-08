# 项目概览

## 一句话简介
Call GPT Server 是一个基于 FastAPI 的 ChatGPT 自动化服务，提供异步任务执行、状态管理与 Webhook 回调。

## 主要能力
- 异步任务：创建任务后后台执行，支持轮询状态或 Webhook 回调。
- 登录会话：按用户保存浏览器会话，复用登录状态。
- 人类行为：模拟鼠标与输入节奏，降低风控触发概率。
- 批量任务：一次提交多条消息并异步处理。
- Webhook：任务完成/失败/等待登录或验证码时推送通知。

## 核心模块
- 路由层：`app/api/*`，定义 REST API。
- 业务层：`app/services/*`，任务、用户、批次、Webhook 等服务逻辑。
- 数据层：`app/models/*` + `app/db/connection.py`，SQLAlchemy + 异步数据库连接。
- 配置：`app/core/config.py` 读取 `.env` 与环境变量。

## 关键流程（简化）
1. 客户端 `POST /api/v1/tasks` 创建任务。
2. 任务入库，状态为 `pending`。
3. 后台执行器抓取待执行任务并运行浏览器自动化。
4. 任务完成后更新状态，并按需触发 Webhook 通知。

## 配置入口
主要配置在 `.env` / `.env.example` 中，关键项包括：
- 服务：`HOST`、`PORT`、`DEBUG`
- 数据库：`DB_*` 或 `DATABASE_URL`
- 执行：`TASK_TIMEOUT_SECONDS`、`MAX_CONCURRENT_TASKS`
- Webhook：`WEBHOOK_TIMEOUT_SECONDS`、`WEBHOOK_MAX_RETRIES`
- 浏览器：`BROWSER_HEADLESS`、`BROWSER_USER_DATA_BASE_PATH`

## 数据模型概览
- Task：单条任务，含 `status`、`message`、`response`、`webhook_url` 等。
- Batch：批量任务汇总，含 `total_tasks`、`completed_tasks`。
- User：用户信息与浏览器会话状态。
- WebhookLog：Webhook 投递日志。

## 标识字段说明（重要）
- `user_id`：用于浏览器会话/cookie 的隔离与持久化（会影响 `user_data/` 下的 profile 目录）。请求不传或传空字符串时使用 `DEFAULT_USER_ID`。
- `caller_user`：表示调用方用户（业务侧用户/租户），用于审计、检索与未来权限控制；与 cookie/session 存储无关。

## 潜在问题与建议
- 权限控制缺失：当前无鉴权，且 `/api/v1/tasks/{task_id}` 等接口未校验任务归属，生产环境有越权风险。
- CORS 过宽：`allow_origins=["*"]` 仅适合开发环境，生产建议收敛到可信域名。
- 任务查询范围：`GET /api/v1/tasks` 若传 `user_id` 可查询他人任务，建议限制或仅允许管理员。
- 批次状态持久化：`get_batch` 里计算进度但未持久化，可能导致状态在多次查询时不一致。
