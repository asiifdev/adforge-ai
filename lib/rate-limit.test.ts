import { describe, it, expect } from "vitest";
import { checkRateLimit, enforceRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-${Math.random()}`;
    const result = checkRateLimit(key, 3);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests once the limit is exceeded", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 2);
    checkRateLimit(key, 2);
    const third = checkRateLimit(key, 2);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    checkRateLimit(keyA, 1);
    const resultB = checkRateLimit(keyB, 1);
    expect(resultB.allowed).toBe(true);
  });
});

describe("enforceRateLimit", () => {
  it("returns null when under the limit", () => {
    const key = `test-${Math.random()}`;
    expect(enforceRateLimit(key, 5)).toBeNull();
  });

  it("returns a 429 NextResponse once the limit is exceeded", async () => {
    const key = `test-${Math.random()}`;
    enforceRateLimit(key, 1);
    const blocked = enforceRateLimit(key, 1);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
    const body = await blocked?.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
