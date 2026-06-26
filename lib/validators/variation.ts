import { z } from "zod";

export const variationLabelSchema = z.enum(["A", "B", "C", "D"]).nullable();

export const updateVariationSchema = z.object({
  isFavorite: z.boolean().optional(),
  label: variationLabelSchema.optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type UpdateVariationInput = z.infer<typeof updateVariationSchema>;

export const googleContentSchema = z.object({
  headlines: z.array(z.string()).length(15),
  descriptions: z.array(z.string()).length(4),
});

export const metaContentSchema = z.object({
  primaryText: z.string(),
  headline: z.string(),
  description: z.string(),
  callToAction: z.string(),
});

export const tiktokContentSchema = z.object({
  hook: z.string(),
  body: z.string(),
  cta: z.string(),
  onScreenText: z.array(z.string()),
});

export const taboolaContentSchema = z.object({
  headline: z.string(),
  bodyText: z.string(),
  thumbnailDescription: z.string(),
});

export type GoogleContent = z.infer<typeof googleContentSchema>;
export type MetaContent = z.infer<typeof metaContentSchema>;
export type TikTokContent = z.infer<typeof tiktokContentSchema>;
export type TaboolaContent = z.infer<typeof taboolaContentSchema>;
