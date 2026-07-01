import { describe, it, expect } from "vitest";
import Papa from "papaparse";
import type { Variation } from "@prisma/client";
import { exportToCSV } from "./csv";

function makeVariation(overrides: Partial<Variation> & { platform: string; content: unknown }): Variation {
  return {
    id: "v-1",
    creativeSetId: "cs-1",
    isFavorite: false,
    label: null,
    notes: null,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Variation;
}

describe("exportToCSV — Google", () => {
  it("emits Ads Editor bulk-sheet columns", () => {
    const variation = makeVariation({
      platform: "google",
      content: {
        headlines: Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
        descriptions: Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`),
      },
    });

    const csv = exportToCSV({ name: "My Campaign", landingUrl: "https://example.com", variations: [variation] });
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });
    const row = parsed.data[0];

    expect(row["Campaign"]).toBe("My Campaign");
    expect(row["Ad Group"]).toBe("Ad Group 1");
    expect(row["Headline 1"]).toBe("Headline 1");
    expect(row["Headline 15"]).toBe("Headline 15");
    expect(row["Description 4"]).toBe("Description 4");
    expect(row["Final URL"]).toBe("https://example.com");
  });
});

describe("exportToCSV — Meta", () => {
  it("emits Ads Manager bulk-import columns", () => {
    const variation = makeVariation({
      platform: "meta",
      content: {
        primaryText: "Hook them fast",
        headline: "Save big today",
        description: "Limited time",
        callToAction: "Shop Now",
      },
    });

    const csv = exportToCSV({ name: "My Campaign", variations: [variation] });
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });
    const row = parsed.data[0];

    expect(row["Campaign Name"]).toBe("My Campaign");
    expect(row["Ad Set Name"]).toBe("Ad Set 1");
    expect(row["Primary Text"]).toBe("Hook them fast");
    expect(row["CTA"]).toBe("Shop Now");
    expect(row["Status"]).toBe("Active");
  });
});

describe("exportToCSV — TikTok/Taboola generic format", () => {
  it("emits one row per field", () => {
    const variation = makeVariation({
      platform: "taboola",
      content: {
        headline: "You won't believe this",
        bodyText: "Full body copy here",
        thumbnailDescription: "A surprised face",
      },
    });

    const csv = exportToCSV({ name: "My Campaign", variations: [variation] });
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });

    expect(parsed.data).toHaveLength(3);
    expect(parsed.data.map((r) => r["Field Name"])).toEqual(["Headline", "Body Text", "Thumbnail Description"]);
    expect(parsed.data[0]["Platform"]).toBe("Taboola");
  });
});
