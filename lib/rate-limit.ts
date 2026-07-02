import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

const WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT = 100;

type RateLimitRow = { count: number; window_start: Date };

// Backed by the `rate_limits` table (not an in-memory Map) so the counter survives
// process restarts and is shared across every serverless invocation / container
// instance hitting the same Postgres database. The upsert is a single atomic
// statement, so concurrent requests for the same key can't race each other.
export async function checkRateLimit(
  key: string,
  limit: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const rows = await prisma.$queryRaw<RateLimitRow[]>`
    INSERT INTO rate_limits (id, key, window_start, count)
    VALUES (gen_random_uuid()::text, ${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < now() - interval '60 seconds' THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - interval '60 seconds' THEN now()
        ELSE rate_limits.window_start
      END
    RETURNING count, window_start;
  `;

  const row = rows[0];
  const resetAt = row.window_start.getTime() + WINDOW_MS;

  if (row.count > limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  return { allowed: true, remaining: limit - row.count, resetAt };
}

function rateLimitResponse(limit: number, remaining: number, resetAt: number): NextResponse {
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." } },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(Math.max(0, remaining)),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}

/**
 * Enforces a rate limit for `key`. Returns a 429 NextResponse to short-circuit
 * with if the limit was exceeded, or null if the caller may proceed.
 */
export async function enforceRateLimit(
  key: string,
  limit: number = DEFAULT_RATE_LIMIT
): Promise<NextResponse | null> {
  const { allowed, remaining, resetAt } = await checkRateLimit(key, limit);
  if (!allowed) return rateLimitResponse(limit, remaining, resetAt);
  return null;
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
