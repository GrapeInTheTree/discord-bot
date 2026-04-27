# syntax=docker/dockerfile:1.7
# Multi-stage build — produces a minimal Node 22 image with only prod deps.

ARG NODE_VERSION=22.22.0
ARG PNPM_VERSION=10.14.0

# ──────────────────────────────────────────────────────────────────
# Stage 1: build
# ──────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /repo

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy lockfile + workspace manifests for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Install all deps (including dev) for build step
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy sources
COPY . .

# Build everything
RUN pnpm --filter @discord-bot/database run db:generate && \
    pnpm --filter @discord-bot/shared run build && \
    pnpm --filter @discord-bot/database run build && \
    pnpm --filter @discord-bot/bot run build

# Deploy bot with prod-only deps to /out
RUN pnpm --filter @discord-bot/bot deploy --prod /out

# ──────────────────────────────────────────────────────────────────
# Stage 2: runtime
# ──────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

# OpenSSL 3 + tini for proper signal handling
RUN apk add --no-cache tini

COPY --from=builder /out/dist ./dist
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/package.json ./package.json
# Prisma generated client + schema (for migrate deploy in entrypoint)
COPY --from=builder /repo/packages/database/prisma ./prisma

ENV NODE_ENV=production
USER node
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --spider http://localhost:3000/healthz || exit 1
