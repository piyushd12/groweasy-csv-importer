FROM node:20-alpine AS base

# ─── Dependencies Stage ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=packages/shared --workspace=apps/api --include-workspace-root

# ─── Build Stage ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY package.json ./

RUN npm run build -w packages/shared
RUN npm run build -w apps/api

# ─── Production Stage ───────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

COPY --from=builder --chown=expressjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=expressjs:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=expressjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=expressjs:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./

USER expressjs

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
