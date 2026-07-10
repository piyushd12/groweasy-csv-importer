FROM node:20-alpine AS base

# ─── Dependencies Stage ──────────────────────────────────────────────
FROM base AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN npm ci \
    --workspace=packages/shared \
    --workspace=apps/api \
    --include-workspace-root


# ─── Build Stage ─────────────────────────────────────────────────────
FROM base AS builder

WORKDIR /app

# npm workspaces hoist dependencies to the root node_modules directory
COPY --from=deps /app/node_modules ./node_modules

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY package.json ./

RUN npm run build -w packages/shared
RUN npm run build -w apps/api


# ─── Production Stage ────────────────────────────────────────────────
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs expressjs

COPY --from=builder --chown=expressjs:nodejs \
    /app/packages/shared/dist \
    ./packages/shared/dist

COPY --from=builder --chown=expressjs:nodejs \
    /app/packages/shared/package.json \
    ./packages/shared/package.json

COPY --from=builder --chown=expressjs:nodejs \
    /app/apps/api/dist \
    ./apps/api/dist

COPY --from=builder --chown=expressjs:nodejs \
    /app/apps/api/package.json \
    ./apps/api/package.json

COPY --from=builder --chown=expressjs:nodejs \
    /app/node_modules \
    ./node_modules

COPY --from=builder --chown=expressjs:nodejs \
    /app/package.json \
    ./package.json

USER expressjs

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]