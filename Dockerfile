# ============================================================================
# Kontext API Server - Dockerfile for GCP Cloud Run
# ============================================================================

FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/server/package.json packages/server/

# Install dependencies
RUN pnpm install --filter @kontext/server

# Copy source
COPY packages/server/ packages/server/

# Build
RUN pnpm --filter @kontext/server build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "packages/server/dist/index.js"]
