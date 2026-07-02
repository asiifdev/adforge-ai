import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db/client";
import { checkRateLimit, enforceRateLimit } from "@/lib/rate-limit";

afterAll(async () => {
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "test-" } } });
  await prisma.$disconnect();
});

// This suite requires a real Postgres connection — the rate limiter is backed by
// the `rate_limits` table (not an in-memory Map) so it survives process restarts
// and is shared across serverless instances. That can only be verified against
// a real database, which is why this lives in the integration suite.
describe("checkRateLimit (Postgres-backed)", () => {
  it("allows requests under the limit", async () => {
    const key = `test-${Math.random()}`;
    const result = await checkRateLimit(key, 3);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests once the limit is exceeded", async () => {
    const key = `test-${Math.random()}`;
    await checkRateLimit(key, 2);
    await checkRateLimit(key, 2);
    const third = await checkRateLimit(key, 2);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("tracks separate keys independently", async () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    await checkRateLimit(keyA, 1);
    const resultB = await checkRateLimit(keyB, 1);
    expect(resultB.allowed).toBe(true);
  });

  it("persists the counter in the rate_limits table, not in memory", async () => {
    const key = `test-${Math.random()}`;
    await checkRateLimit(key, 5);
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    expect(row).not.toBeNull();
    expect(row?.count).toBe(1);
  });

  it("resets the window once it has expired", async () => {
    const key = `test-${Math.random()}`;
    await checkRateLimit(key, 1);
    // Simulate an expired window by backdating window_start directly.
    await prisma.rateLimit.update({
      where: { key },
      data: { windowStart: new Date(Date.now() - 61_000) },
    });
    const result = await checkRateLimit(key, 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });
});

describe("enforceRateLimit", () => {
  it("returns null when under the limit", async () => {
    const key = `test-${Math.random()}`;
    expect(await enforceRateLimit(key, 5)).toBeNull();
  });

  it("returns a 429 NextResponse once the limit is exceeded", async () => {
    const key = `test-${Math.random()}`;
    await enforceRateLimit(key, 1);
    const blocked = await enforceRateLimit(key, 1);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
    const body = await blocked?.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
