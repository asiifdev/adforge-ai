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
  variations: Variation[];
};

export function exportToCSV(project: ProjectWithVariations): string {
  const rows: Record<string, string>[] = [];

  for (const variation of project.variations) {
    const content = variation.content as Record<string, unknown>;

    if (variation.platform === "google") {
      const c = content as unknown as GoogleContent;
      const row: Record<string, string> = {
        Platform: "Google Ads RSA",
        "Variation ID": variation.id,
        Label: variation.label ?? "",
        Favorite: variation.isFavorite ? "Yes" : "No",
      };
      c.headlines.forEach((h, i) => {
        row[`Headline ${i + 1}`] = h;
      });
      c.descriptions.forEach((d, i) => {
        row[`Description ${i + 1}`] = d;
      });
      rows.push(row);
    } else if (variation.platform === "meta") {
      const c = content as unknown as MetaContent;
      rows.push({
        Platform: "Meta Ads",
        "Variation ID": variation.id,
        Label: variation.label ?? "",
        Favorite: variation.isFavorite ? "Yes" : "No",
        "Primary Text": c.primaryText,
        Headline: c.headline,
        Description: c.description,
        "Call to Action": c.callToAction,
      });
    } else if (variation.platform === "tiktok") {
      const c = content as unknown as TikTokContent;
      rows.push({
        Platform: "TikTok Ads",
        "Variation ID": variation.id,
        Label: variation.label ?? "",
        Favorite: variation.isFavorite ? "Yes" : "No",
        "Hook (0-3s)": c.hook,
        "Body (4-25s)": c.body,
        CTA: c.cta,
        "On-Screen Text": c.onScreenText.join(" | "),
      });
    } else if (variation.platform === "taboola") {
      const c = content as unknown as TaboolaContent;
      rows.push({
        Platform: "Taboola",
        "Variation ID": variation.id,
        Label: variation.label ?? "",
        Favorite: variation.isFavorite ? "Yes" : "No",
        Headline: c.headline,
        "Body Text": c.bodyText,
        "Thumbnail Description": c.thumbnailDescription,
      });
    }
  }

  return Papa.unparse(rows);
}
