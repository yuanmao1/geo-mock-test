# GEO Mock Test - 单镜像构建
FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/ ./apps/
COPY tsconfig.base.json ./

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Default command (can be overridden in docker-compose)
CMD ["bun", "run", "start"]
