# syntax=docker/dockerfile:1
# ============================================================================
#  SOVEREIGN HEALTH INTELLIGENCE
#  BLOOD · BIOMARKERS · INSIGHT
#  https://sovereignhealth.io/ -- AGPL-3.0
# ============================================================================

# ── Dependencies stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY apps/health/sovereign-health/frontend/package.json apps/health/sovereign-health/frontend/pnpm-lock.yaml apps/health/sovereign-health/frontend/.npmrc ./
# Copy shared packages so pnpm can resolve workspace deps via file: protocol
COPY packages/ui /packages/ui
# Rewrite workspace:* to file: for standalone Docker build, use hoisted linker
RUN sed -i 's|"workspace:\*"|"file:/packages/ui"|g' package.json \
    && echo 'node-linker=hoisted' >> .npmrc \
    && pnpm install --no-frozen-lockfile

# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app/node_modules ./node_modules
# Copy app source
COPY apps/health/sovereign-health/frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars are baked at build time — pass via --build-arg
ARG NEXT_PUBLIC_API_URL=https://api.sovereignhealth.io
ARG NEXT_PUBLIC_APP_NAME=Sovereign Health Intelligence
ARG NEXT_PUBLIC_DEMO_HOSTNAME=demo.sovereignhealth.io
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_DEMO_HOSTNAME=${NEXT_PUBLIC_DEMO_HOSTNAME}
RUN pnpm build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
