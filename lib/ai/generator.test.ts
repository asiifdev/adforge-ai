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
  language: "english",
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

  it("truncates fields that exceed Meta's character limits instead of throwing", async () => {
    createMock.mockImplementation(() =>
      mockCompletion({
        variations: [
          {
            primary_text: "P".repeat(200),
            headline: "H".repeat(80),
            description: "D".repeat(60),
            call_to_action: "Shop Now",
          },
        ],
      })
    );

    const result = await generateVariations({ ...brief, platforms: ["meta"] }, ["meta"], 1);
    const content = result.variations[0].content as {
      primaryText: string;
      headline: string;
      description: string;
    };

    expect(content.primaryText.length).toBeLessThanOrEqual(125);
    expect(content.headline.length).toBeLessThanOrEqual(40);
    expect(content.description.length).toBeLessThanOrEqual(25);
  });
});

describe("Google content character limits", () => {
  it("truncates headlines/descriptions that exceed 30/90 chars instead of throwing", async () => {
    createMock.mockImplementation(() =>
      mockCompletion({
        headlines: Array.from({ length: 15 }, () => "H".repeat(50)),
        descriptions: Array.from({ length: 4 }, () => "D".repeat(120)),
      })
    );

    const result = await generateVariations(brief, ["google"], 1);
    const content = result.variations[0].content as { headlines: string[]; descriptions: string[] };

    expect(content.headlines.every((h) => h.length <= 30)).toBe(true);
    expect(content.descriptions.every((d) => d.length <= 90)).toBe(true);
  });
});

describe("Taboola generation", () => {
  it("maps branding_text (not the removed thumbnail_description field) into brandingText, truncated to 30 chars", async () => {
    createMock.mockImplementation(() =>
      mockCompletion({
        variations: [
          {
            headline: "H".repeat(70),
            body_text: "B".repeat(260),
            branding_text: "Brand Name That Is Way Too Long For Taboola",
          },
        ],
      })
    );

    const result = await generateVariations({ ...brief, platforms: ["taboola"] }, ["taboola"], 1);
    const content = result.variations[0].content as {
      headline: string;
      bodyText: string;
      brandingText: string;
    };

    expect(content.headline.length).toBeLessThanOrEqual(60);
    expect(content.bodyText.length).toBeLessThanOrEqual(250);
    expect(content.brandingText.length).toBeLessThanOrEqual(30);
  });
});
