# syntax=docker/dockerfile:1

FROM node:22-slim AS base
RUN corepack enable

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate
# next build's page-data collection imports lib/auth.ts, which requires JWT_SECRET
# at module load — a real value is supplied at runtime via docker-compose/env, this
# placeholder only lets the build step (which never issues requests) get past import.
ARG JWT_SECRET="build-time-placeholder-not-used-at-runtime-32ch"
RUN pnpm build

# ---- runtime ----
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
# Next's standalone output tracer doesn't reliably follow pnpm's symlinked
# virtual store for Prisma's generated client and its native query engine
# (see prisma/schema.prisma's custom `output` path) — layering the full
# build-stage node_modules on top of standalone's traced subset guarantees
# every pnpm-store dependency (symlink targets included) is actually present.
COPY --from=build /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
