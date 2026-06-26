import type { Variation } from "@prisma/client";
import type {
  GoogleContent,
  MetaContent,
  TikTokContent,
  TaboolaContent,
} from "@/lib/validators/variation";

type PDFPayload = {
  projectName: string;
  productName: string;
  variations: Variation[];
};

export async function exportToPDF(payload: PDFPayload): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const margin = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addText = (text: string, size: number, bold = false, color = "#1a1a1a") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, y);
    y += (size / 3.5) * (Array.isArray(lines) ? lines.length : 1) + 2;
  };

  const checkPage = (needed = 20) => {
    if (y + needed > 285) {
      doc.addPage();
      y = margin;
    }
  };

  // Cover
  addText("AdForge AI — Creative Report", 20, true, "#4f46e5");
  addText(`Project: ${payload.projectName}`, 14, true);
  addText(`Product: ${payload.productName}`, 12);
  addText(`Generated: ${new Date().toLocaleDateString()}`, 10, false, "#666");
  y += 8;

  const platforms = ["google", "meta", "tiktok", "taboola"] as const;
  const platformLabels: Record<string, string> = {
    google: "Google Ads (RSA)",
    meta: "Meta Ads",
    tiktok: "TikTok Ads",
    taboola: "Taboola",
  };

  for (const platform of platforms) {
    const pvariations = payload.variations.filter((v) => v.platform === platform);
    if (pvariations.length === 0) continue;

    checkPage(30);
    addText(platformLabels[platform], 16, true, "#4f46e5");
    y += 2;

    for (const variation of pvariations) {
      checkPage(40);

      const meta: string[] = [];
      if (variation.label) meta.push(`Label: ${variation.label}`);
      if (variation.isFavorite) meta.push("★ Favorite");
      if (meta.length) addText(meta.join("  ·  "), 9, false, "#888");

      const content = variation.content as Record<string, unknown>;

      if (platform === "google") {
        const c = content as unknown as GoogleContent;
        addText("Headlines:", 10, true);
        c.headlines.forEach((h, i) => {
          checkPage(6);
          addText(`  ${i + 1}. ${h}  (${h.length}/30)`, 9);
        });
        addText("Descriptions:", 10, true);
        c.descriptions.forEach((d, i) => {
          checkPage(8);
          addText(`  ${i + 1}. ${d}  (${d.length}/90)`, 9);
        });
      } else if (platform === "meta") {
        const c = content as unknown as MetaContent;
        addText(`Primary Text: ${c.primaryText}`, 9);
        addText(`Headline: ${c.headline}`, 9);
        addText(`Description: ${c.description}`, 9);
        addText(`CTA: ${c.callToAction}`, 9);
      } else if (platform === "tiktok") {
        const c = content as unknown as TikTokContent;
        addText(`Hook (0–3s): ${c.hook}`, 9);
        addText(`Body: ${c.body}`, 9);
        addText(`CTA: ${c.cta}`, 9);
        addText(`On-Screen Text: ${c.onScreenText.join(" | ")}`, 9);
      } else if (platform === "taboola") {
        const c = content as unknown as TaboolaContent;
        addText(`Headline (${c.headline.length}/60): ${c.headline}`, 9);
        addText(`Body: ${c.bodyText}`, 9);
        addText(`Thumbnail: ${c.thumbnailDescription}`, 9);
      }

      if (variation.notes) {
        addText(`Notes: ${variation.notes}`, 9, false, "#555");
      }

      y += 5;

      // Divider
      doc.setDrawColor("#e5e7eb");
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    }
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
