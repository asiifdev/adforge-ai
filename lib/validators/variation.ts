import { z } from "zod";

export const variationLabelSchema = z.enum(["A", "B", "C", "D"]).nullable();

export const updateVariationSchema = z.object({
  isFavorite: z.boolean().optional(),
  label: variationLabelSchema.optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type UpdateVariationInput = z.infer<typeof updateVariationSchema>;

export const googleContentSchema = z.object({
  headlines: z.array(z.string().max(30)).length(15),
  descriptions: z.array(z.string().max(90)).length(4),
});

export const metaContentSchema = z.object({
  primaryText: z.string().max(125),
  headline: z.string().max(40),
  // 25 chars is Meta's actual recommended description length (not the previously
  // used 30) — see docs/FRD.md Module 2.2 for the platform-spec correction.
  description: z.string().max(25),
  callToAction: z.string(),
});

export const tiktokContentSchema = z.object({
  // No official TikTok platform limit applies to these fields — they're spoken-delivery
  // script segments, not a native text field. The cap here is a runaway-output guard only.
  hook: z.string().max(500),
  body: z.string().max(500),
  cta: z.string().max(500),
  onScreenText: z.array(z.string().max(500)),
});

export const taboolaContentSchema = z.object({
  headline: z.string().max(60),
  bodyText: z.string().max(250),
  // Taboola's official spec has no "thumbnail_description" field; the real matching
  // field is "Branding Text" (max 30 chars) — see docs/FRD.md Module 2.2.
  brandingText: z.string().max(30),
});

export type GoogleContent = z.infer<typeof googleContentSchema>;
export type MetaContent = z.infer<typeof metaContentSchema>;
export type TikTokContent = z.infer<typeof tiktokContentSchema>;
export type TaboolaContent = z.infer<typeof taboolaContentSchema>;
