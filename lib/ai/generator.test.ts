import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BriefInput } from "@/lib/validators/brief";

const createMock = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  getOpenAIClient: () => ({ chat: { completions: { create: createMock } } }),
  DEFAULT_MODEL: "gpt-4o",
}));

const { generateVariations } = await import("./generator");

const brief: BriefInput = {
  productName: "Widget Pro",
  description: "A very good widget that solves problems for busy professionals.",
  targetAudience: "Busy professionals who need widgets fast.",
  goal: "conversions",
  tone: "professional",
  platforms: ["google"],
  variationsPerPlatform: 5,
};

function mockCompletion(content: object, tokens = 100) {
  return {
    usage: { total_tokens: tokens },
    choices: [{ message: { content: JSON.stringify(content) } }],
  };
}

beforeEach(() => {
  createMock.mockReset();
});

describe("Google generation honors variationsPerPlatform", () => {
  it("makes one OpenAI call per requested variation and returns that many RSA sets", async () => {
    createMock.mockImplementation(() =>
      mockCompletion({
        headlines: Array.from({ length: 15 }, (_, i) => `H${i}`),
        descriptions: Array.from({ length: 4 }, (_, i) => `D${i}`),
      })
    );

    const result = await generateVariations(brief, ["google"], 4);

    expect(createMock).toHaveBeenCalledTimes(4);
    expect(result.variations).toHaveLength(4);
    expect(result.variations.every((v) => v.platform === "google")).toBe(true);
  });
});

describe("Google content tolerance", () => {
  it("trims an over-long headlines array down to 15", async () => {
    createMock.mockImplementation(() =>
      mockCompletion({
        headlines: Array.from({ length: 18 }, (_, i) => `H${i}`),
        descriptions: Array.from({ length: 4 }, (_, i) => `D${i}`),
      })
    );

    const result = await generateVariations(brief, ["google"], 1);
    const content = result.variations[0].content as { headlines: string[]; descriptions: string[] };

    expect(content.headlines).toHaveLength(15);
  });

  it("pads a short headlines array up to 15 by cycling existing entries", async () => {
    createMock.mockImplementation(() =>
      mockCompletion({
        headlines: ["H0", "H1", "H2"],
        descriptions: ["D0", "D1"],
      })
    );

    const result = await generateVariations(brief, ["google"], 1);
    const content = result.variations[0].content as { headlines: string[]; descriptions: string[] };

    expect(content.headlines).toHaveLength(15);
    expect(content.descriptions).toHaveLength(4);
    // padding cycles through the original entries rather than fabricating new text
    expect(content.headlines.slice(0, 3)).toEqual(["H0", "H1", "H2"]);
    expect(content.headlines[3]).toBe("H0");
  });
});

describe("Meta generation", () => {
  it("returns exactly `count` variations from a single completion", async () => {
    createMock.mockImplementation(() =>
      mockCompletion({
        variations: Array.from({ length: 3 }, (_, i) => ({
          primary_text: `Primary ${i}`,
          headline: `Headline ${i}`,
          description: `Description ${i}`,
          call_to_action: "Shop Now",
        })),
      })
    );

    const result = await generateVariations({ ...brief, platforms: ["meta"] }, ["meta"], 3);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(result.variations).toHaveLength(3);
  });
});
