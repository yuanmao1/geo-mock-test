# GEO Mock Test - 单镜像构建
FROM oven/bun:1-alpine

WORKDIR /app

# Copy all source files
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/ ./apps/
COPY packages/ ./packages/
COPY tsconfig.base.json ./

# Install dependencies (without lockfile to resolve fresh)
RUN rm -rf node_modules apps/web/node_modules packages/shared-types/node_modules && \
    bun install --no-save

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Default command
CMD ["bun", "run", "start"]
