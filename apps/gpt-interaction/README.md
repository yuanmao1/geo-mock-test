# Call GPT Server

基于 FastAPI 的 ChatGPT 自动化服务器，提供异步任务执行、状态管理和 Webhook 支持。

## 功能特性

- ✅ **异步任务执行**: 任务在后台执行，通过轮询或 Webhook 获取结果
- ✅ **状态管理**: 完整的任务状态追踪 (pending, running, completed, failed 等)
- ✅ **Webhook 支持**: 任务完成时自动回调通知
- ✅ **人类行为模拟**: 模拟自然的鼠标移动和打字行为
- ✅ **会话持久化**: 按用户保存浏览器会话，保持登录状态
- ✅ **验证码检测**: 检测人机验证，支持手动处理
- ✅ **多用户支持**: 预留用户管理扩展接口
- ✅ **联网搜索**: 支持开启 ChatGPT 联网搜索功能

## 快速开始

### 1. 安装依赖

```bash
# 创建虚拟环境 (推荐)
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
# 复制示例配置
copy .env.example .env

# 编辑 .env 文件，根据需要修改配置
```

### 3. 启动服务

```bash
# 方式 1: 使用启动脚本
python run.py

# 方式 2: 使用 uvicorn
uvicorn app.main:app --reload

# 方式 3: 指定端口
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. 访问 API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Docker 运行

依赖：镜像内包含 `xvfb` 与 `google-chrome-stable`（用于 DrissionPage 驱动浏览器）。

### docker build + docker run

```bash
docker build -t gpt-interaction .
docker run --rm -p 8000:8000 --shm-size=2g gpt-interaction
```

说明：
- 若你使用外部数据库，请通过环境变量配置 `DB_*` 或 `DATABASE_URL`。
- `xvfb` 默认启用；如需关闭可设置 `ENABLE_XVFB=0`。

## API 使用示例

### 创建聊天任务

```bash
curl -X POST http://localhost:8000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请介绍一下 Python 的主要特点",
    "enable_search": true,
    "webhook_url": "https://your-webhook.com/callback"
  }'
```

响应:
```json
{
  "task": {
    "id": "01HXYZ...",
    "type": "chat",
    "status": "pending",
    "message": "请介绍一下 Python 的主要特点",
    "user_id": "default",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Task created successfully"
}
```

### 查询任务状态

```bash
curl http://localhost:8000/api/v1/tasks/{task_id}
```

### 获取任务列表

```bash
curl "http://localhost:8000/api/v1/tasks?status=completed&page=1&page_size=10"
```

### 发起手动登录

```bash
curl -X POST http://localhost:8000/api/v1/users/login/manual \
  -H "Content-Type: application/json" \
  -d '{"user_id": "my_user"}'
```

### 测试 Webhook

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "https://your-webhook.com/callback"}'
```

## Webhook 回调格式

当任务完成时，会向配置的 Webhook URL 发送 POST 请求:

```json
{
  "event": "task.completed",
  "task": {
    "id": "01HXYZ...",
    "type": "chat",
    "status": "completed",
    "message": "请介绍一下 Python 的主要特点",
    "response": "Python 是一种...",
    "user_id": "default",
    "created_at": "2024-01-01T00:00:00Z",
    "completed_at": "2024-01-01T00:01:00Z"
  },
  "timestamp": "2024-01-01T00:01:00Z",
  "metadata": {}
}
```

事件类型:
- `task.completed`: 任务成功完成
- `task.failed`: 任务失败
- `task.waiting_login`: 需要登录
- `task.waiting_captcha`: 检测到验证码

## 任务状态说明

| 状态 | 说明 |
|------|------|
| `pending` | 任务已创建，等待处理 |
| `running` | 任务正在执行 |
| `waiting_login` | 等待用户完成登录 |
| `waiting_captcha` | 检测到验证码，需要手动处理 |
| `completed` | 任务成功完成 |
| `failed` | 任务执行失败 |
| `cancelled` | 任务已取消 |
| `timeout` | 任务超时 |

## 配置说明

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `HOST` | `0.0.0.0` | 服务监听地址 |
| `PORT` | `8000` | 服务端口 |
| `DEBUG` | `false` | 调试模式 |
| `DB_HOST` | `127.0.0.1` | 数据库主机 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_USER` | `postgres` | 数据库用户 |
| `DB_PASSWORD` | `postgres` | 数据库密码 |
| `DB_NAME` | `talent_pool` | 数据库名称 |
| `DB_SSLMODE` | `disable` | 数据库 SSL 模式 |
| `DB_SCHEMA` | `talent_pool` | 数据库 schema |
| `DB_SEARCH_PATH` | `talent_pool,public` | 数据库 search_path |
| `DB_MAX_OPEN_CONNS` | `20` | 最大连接数 |
| `DB_MAX_IDLE_CONNS` | `10` | 最大空闲连接数 |
| `DB_CONN_MAX_LIFETIME` | `3600` | 连接最大生命周期(秒) |
| `BROWSER_HEADLESS` | `false` | 无头模式 |
| `BROWSER_USER_DATA_BASE_PATH` | `./user_data` | 用户数据目录 |
| `DEFAULT_USER_ID` | `default` | 默认用户ID |
| `TASK_TIMEOUT_SECONDS` | `300` | 任务超时(秒) |
| `MAX_CONCURRENT_TASKS` | `3` | 最大并发任务数 |
| `WEBHOOK_TIMEOUT_SECONDS` | `30` | Webhook超时 |
| `WEBHOOK_MAX_RETRIES` | `3` | Webhook重试次数 |

## 多用户支持

系统设计支持多用户，每个用户有独立的浏览器会话目录:

```
user_data/
├── default/
│   └── chatgpt_data/    # 默认用户的浏览器数据
├── user_001/
│   └── chatgpt_data/    # user_001 的浏览器数据
└── user_002/
    └── chatgpt_data/
```

创建任务时指定 `user_id` 即可使用不同用户的会话:

```json
{
  "message": "你好",
  "user_id": "user_001"
}
```

## 首次使用 (登录)

首次使用需要完成 ChatGPT 登录:

1. 发起手动登录任务
2. 浏览器会自动打开 ChatGPT 页面
3. 在浏览器中完成登录 (包括可能的验证码)
4. 登录状态会自动保存

之后的任务会复用已登录的会话。

## 人机验证处理

当检测到验证码时:

1. 任务状态变为 `waiting_captcha`
2. Webhook 会收到 `task.waiting_captcha` 事件
3. 需要手动在浏览器中完成验证
4. 完成后可以重新提交任务

## 扩展开发

### 添加认证

`app/services/user_service.py` 中预留了认证接口:

```python
# 实现这些方法来添加认证
async def register_user(username: str, password: str) -> UserResponse:
    ...

async def authenticate_user(username: str, password: str) -> Optional[UserResponse]:
    ...

async def create_api_key(user_id: str) -> str:
    ...
```

### 自定义浏览器选项

在 `app/services/browser.py` 的 `_create_browser_options()` 中添加:

```python
co.set_argument('--proxy-server=...')
co.set_argument('--user-agent=...')
```

## 注意事项

1. **首次运行**: 建议先手动登录以保存会话
2. **验证码**: ChatGPT 可能需要人机验证，请保持浏览器可见
3. **频率限制**: 避免过于频繁的请求，模拟人类行为
4. **生产环境**: 配置 CORS、添加认证、使用正式数据库

## License

MIT
