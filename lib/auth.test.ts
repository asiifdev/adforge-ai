import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyToken } from "./auth";

describe("password hashing", () => {
  it("verifies a matching password against its hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("rejects a non-matching password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});

describe("JWT sign/verify", () => {
  it("round-trips a userId through sign and verify", async () => {
    const token = await signToken("user-123");
    await expect(verifyToken(token)).resolves.toBe("user-123");
  });

  it("returns null for a tampered token", async () => {
    const token = await signToken("user-123");
    const tampered = token.slice(0, -2) + "xx";
    await expect(verifyToken(tampered)).resolves.toBeNull();
  });

  it("returns null for garbage input", async () => {
    await expect(verifyToken("not-a-jwt")).resolves.toBeNull();
  });
});
