<!--
 * @Description: 
 * @Author: Devin
 * @Date: 2025-12-25 11:52:43
-->
# GEO Mock Platform

一个用于演示 GEO 优化电商流程的全栈项目，包含前端商城界面、后端接口、共享类型与 mock 数据，并支持调用 LLM 生成 GEO 文案。

## 项目构成

- `apps/web`：前端（Vite + React），展示商品列表/详情，支持 AI 视角与 GEO 文案展示。
- `apps/server`：后端（Bun + Elysia），提供商品/模型接口与 LLM 生成 API，同时服务生产静态资源。
- `packages/shared-types`：共享类型与 mock 数据，前后端统一引用。
- `public`：生产构建产物目录（`bun run build` 输出到这里）。

## 快速开始

### 开发模式（前后端分离）

1) 启动后端（API）

```bash
bun run dev
```

2) 启动前端（Vite）

```bash
bun run dev:web
```

如需前后端分离调试，可在 `apps/web/.env` 中设置：

```
VITE_API_TARGET=http://localhost:3000
```

### 生产模式（一键启动）

```bash
bun run build
bun run start
```

- `build` 会将前端产物输出到 `public/`
- `start` 会启动后端并托管 `public/` 的静态资源

## 环境变量

后端（`.env` 或系统环境变量）：

- `PORT`：后端端口（默认 3000）
- `LOG_LEVEL`：日志级别（`debug` | `info` | `warn` | `error`，默认 `info`）
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `QWEN_API_KEY`
- `GROK_API_KEY`

前端（`apps/web/.env`）：

- `VITE_API_TARGET`：API 地址（本地分离开发时使用）

可参考 `.env.example`。

## 常用脚本

- `bun run dev`：后端开发模式（Bun watch）
- `bun run dev:web`：前端开发模式（Vite dev server）
- `bun run build`：构建前端至 `public/`
- `bun run start`：启动后端并托管静态资源

## Docker 部署

所有 Docker 相关配置都在 `docker/` 目录下。

### 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| `server` | 3000 | API 后端服务（Elysia） |
| `web` | 5173 | 前端服务（Vite dev server） |

### 使用 docker-compose

```bash
cd docker

# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 端口配置

可在 `.env` 中自定义端口：

```env
SERVER_PORT=3000
WEB_PORT=5173
```

### 嵌入其他网站

本项目设计为嵌入到外部网站的 `/public/ecommerce` 路径下。

#### 访问路径示例

- 首页：`https://your-domain.com/public/ecommerce/`
- 商品页：`https://your-domain.com/public/ecommerce/product/p1`
- API：`https://your-domain.com/public/ecommerce/api/products`

#### Nginx 反向代理配置

参考 `docker/nginx.conf.example`，将以下配置添加到你的 Nginx server 块中：

```nginx
# Upstream 定义
upstream geo_mock_web {
    server 127.0.0.1:5173;
}

upstream geo_mock_api {
    server 127.0.0.1:3000;
}

# API 转发
location /public/ecommerce/api/ {
    rewrite ^/public/ecommerce/api/(.*)$ /api/$1 break;
    proxy_pass http://geo_mock_api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# 前端转发
location /public/ecommerce {
    proxy_pass http://geo_mock_web;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

#### 前端 Base Path 配置

构建时需设置 `VITE_BASE_PATH` 环境变量：

```bash
VITE_BASE_PATH=/public/ecommerce bun run build
```

或在 `apps/web/.env` 中配置：

```env
VITE_BASE_PATH=/public/ecommerce
```

