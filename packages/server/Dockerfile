# ============================================================================
# Kontext API Server - Dockerfile for GCP Cloud Run
# ============================================================================

FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/server/package.json packages/server/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @kontext/server

# Copy source
COPY packages/server/ packages/server/

# Build
RUN pnpm --filter @kontext/server build

# Production stage
FROM node:22-slim AS production

WORKDIR /app

COPY --from=base /app/packages/server/dist ./dist
COPY --from=base /app/packages/server/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/server/node_modules ./packages/server/node_modules

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
