import { z } from "zod";

export const platformSchema = z.enum(["google", "meta", "tiktok", "taboola"]);

export const briefSchema = z.object({
  productName: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Product name must be under 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be under 1000 characters"),
  landingUrl: z
    .string()
    .optional()
    .refine((val) => !val || val === "" || /^https?:\/\/.+/.test(val), {
      message: "Must be a valid URL",
    }),
  targetAudience: z
    .string()
    .min(10, "Target audience must be at least 10 characters")
    .max(500, "Target audience must be under 500 characters"),
  goal: z.enum(["conversions", "clicks", "awareness"]),
  tone: z.enum(["aggressive", "professional", "casual"]),
  budgetRange: z.string().max(100).optional(),
  platforms: z
    .array(platformSchema)
    .min(1, "Select at least one platform"),
  variationsPerPlatform: z
    .number()
    .int()
    .min(3, "Minimum 3 variations")
    .max(10, "Maximum 10 variations"),
});

export type BriefInput = z.infer<typeof briefSchema>;
