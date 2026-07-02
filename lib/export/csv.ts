import Papa from "papaparse";
import type { Variation } from "@prisma/client";
import type {
  GoogleContent,
  MetaContent,
  TikTokContent,
  TaboolaContent,
} from "@/lib/validators/variation";

type ProjectWithVariations = {
  name: string;
  landingUrl?: string | null;
  variations: Variation[];
};

// Google Ads Editor bulk sheet columns (ADR-006 / FRD 6.1): one row per RSA set.
function buildGoogleRows(project: ProjectWithVariations, variations: Variation[]): Record<string, string>[] {
  return variations.map((variation, i) => {
    const c = variation.content as unknown as GoogleContent;
    const row: Record<string, string> = {
      Campaign: project.name,
      "Ad Group": `Ad Group ${i + 1}`,
    };
    for (let h = 0; h < 15; h++) {
      row[`Headline ${h + 1}`] = c.headlines[h] ?? "";
    }
    for (let d = 0; d < 4; d++) {
      row[`Description ${d + 1}`] = c.descriptions[d] ?? "";
    }
    row["Final URL"] = project.landingUrl ?? "";
    return row;
  });
}

// Meta Ads Manager bulk import columns (ADR-006 / FRD 6.1).
function buildMetaRows(project: ProjectWithVariations, variations: Variation[]): Record<string, string>[] {
  return variations.map((variation, i) => {
    const c = variation.content as unknown as MetaContent;
    return {
      "Campaign Name": project.name,
      "Ad Set Name": `Ad Set ${i + 1}`,
      "Primary Text": c.primaryText,
      Headline: c.headline,
      Description: c.description,
      CTA: c.callToAction,
      Status: "Active",
    };
  });
}

// TikTok/Taboola have no documented ad-manager bulk import format (FRD 6.1),
// so they use the generic long-form field export.
function buildGenericRows(variations: Variation[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  for (const variation of variations) {
    const fields: [string, string][] =
      variation.platform === "tiktok"
        ? (() => {
            const c = variation.content as unknown as TikTokContent;
            return [
              ["Hook", c.hook],
              ["Body", c.body],
              ["CTA", c.cta],
              ["On-Screen Text", c.onScreenText.join(" | ")],
            ];
          })()
        : (() => {
            const c = variation.content as unknown as TaboolaContent;
            return [
              ["Headline", c.headline],
              ["Body Text", c.bodyText],
              ["Branding Text", c.brandingText],
            ];
          })();

    fields.forEach(([fieldName, content]) => {
      rows.push({
        Platform: variation.platform === "tiktok" ? "TikTok Ads" : "Taboola",
        "Variation #": String(variation.position + 1),
        "Field Name": fieldName,
        Content: content,
        "Character Count": String(content.length),
      });
    });
  }

  return rows;
}

const PLATFORM_ORDER = ["google", "meta", "tiktok", "taboola"] as const;

export function exportToCSV(project: ProjectWithVariations): string {
  const blocks: string[] = [];

  for (const platform of PLATFORM_ORDER) {
    const platformVariations = project.variations.filter((v) => v.platform === platform);
    if (platformVariations.length === 0) continue;

    let rows: Record<string, string>[];
    if (platform === "google") {
      rows = buildGoogleRows(project, platformVariations);
    } else if (platform === "meta") {
      rows = buildMetaRows(project, platformVariations);
    } else {
      rows = buildGenericRows(platformVariations);
    }

    blocks.push(Papa.unparse(rows));
  }

  return blocks.join("\n\n");
}
