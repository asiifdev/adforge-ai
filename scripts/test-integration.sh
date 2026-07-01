#!/usr/bin/env bash
# Runs the integration test suite against an isolated, throwaway Postgres
# container (never the dev DB) and tears it down afterward regardless of outcome.
set -euo pipefail

cd "$(dirname "$0")/.."

# docker-compose.yml interpolates all services' env requirements up front, even
# when only targeting postgres-test — these placeholders satisfy that check
# without affecting the actual `app` service, which isn't started here.
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret-at-least-32-characters-long}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-test-openai-key}"

cleanup() {
  docker compose --profile test down
}
trap cleanup EXIT

docker compose --profile test up -d --wait postgres-test
pnpm exec dotenv -e .env.test -- npx prisma db push --accept-data-loss
pnpm exec dotenv -e .env.test -- npx vitest run --config vitest.integration.config.ts
