import { NextRequest, NextResponse } from "next/server";

const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT = 100;

export function checkRateLimit(
  key: string,
  limit: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = requests.get(key);

  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + WINDOW_MS };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
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
export function enforceRateLimit(key: string, limit: number = DEFAULT_RATE_LIMIT): NextResponse | null {
  const { allowed, remaining, resetAt } = checkRateLimit(key, limit);
  if (!allowed) return rateLimitResponse(limit, remaining, resetAt);
  return null;
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
