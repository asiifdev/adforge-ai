import { describe, it, expect } from "vitest";
import {
  googleContentSchema,
  metaContentSchema,
  taboolaContentSchema,
  tiktokContentSchema,
} from "./variation";

describe("googleContentSchema", () => {
  it("rejects a headline over 30 chars", () => {
    const result = googleContentSchema.safeParse({
      headlines: [...Array.from({ length: 14 }, () => "ok"), "H".repeat(31)],
      descriptions: Array.from({ length: 4 }, () => "ok"),
    });
    expect(result.success).toBe(false);
  });

  it("accepts headlines/descriptions at exactly the limit", () => {
    const result = googleContentSchema.safeParse({
      headlines: Array.from({ length: 15 }, () => "H".repeat(30)),
      descriptions: Array.from({ length: 4 }, () => "D".repeat(90)),
    });
    expect(result.success).toBe(true);
  });
});

describe("metaContentSchema", () => {
  it("enforces the corrected 25-char description limit (not the old 30)", () => {
    const tooLong = metaContentSchema.safeParse({
      primaryText: "ok",
      headline: "ok",
      description: "D".repeat(26),
      callToAction: "Shop Now",
    });
    expect(tooLong.success).toBe(false);

    const atLimit = metaContentSchema.safeParse({
      primaryText: "ok",
      headline: "ok",
      description: "D".repeat(25),
      callToAction: "Shop Now",
    });
    expect(atLimit.success).toBe(true);
  });
});

describe("taboolaContentSchema", () => {
  it("uses brandingText (max 30), not the removed thumbnailDescription field", () => {
    expect("thumbnailDescription" in taboolaContentSchema.shape).toBe(false);
    expect("brandingText" in taboolaContentSchema.shape).toBe(true);

    const tooLong = taboolaContentSchema.safeParse({
      headline: "ok",
      bodyText: "ok",
      brandingText: "B".repeat(31),
    });
    expect(tooLong.success).toBe(false);
  });
});

describe("tiktokContentSchema", () => {
  it("has a generous sanity cap but no platform-specific hard limit", () => {
    const result = tiktokContentSchema.safeParse({
      hook: "H".repeat(400),
      body: "B".repeat(400),
      cta: "C".repeat(400),
      onScreenText: ["fine"],
    });
    expect(result.success).toBe(true);
  });
});
