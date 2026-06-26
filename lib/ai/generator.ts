import { $Enums } from "@prisma/client";
type Platform = $Enums.Platform;
import { getOpenAIClient, DEFAULT_MODEL } from "./client";
import { getGoogleSystemPrompt, getGoogleUserPrompt } from "./prompts/google";
import { getMetaSystemPrompt, getMetaUserPrompt } from "./prompts/meta";
import { getTikTokSystemPrompt, getTikTokUserPrompt } from "./prompts/tiktok";
import { getTaboolaSystemPrompt, getTaboolaUserPrompt } from "./prompts/taboola";
import { BriefInput } from "@/lib/validators/brief";
import {
  googleContentSchema,
  metaContentSchema,
  tiktokContentSchema,
  taboolaContentSchema,
} from "@/lib/validators/variation";

export type GeneratedVariation = {
  platform: Platform;
  content: unknown;
  position: number;
};

export type GenerationResult = {
  variations: GeneratedVariation[];
  tokensUsed: number;
  durationMs: number;
};

async function generateForPlatform(
  platform: Platform,
  brief: BriefInput,
  count: number
): Promise<{ variations: unknown[]; tokensUsed: number }> {
  let systemPrompt: string;
  let userPrompt: string;

  if (platform === "google") {
    systemPrompt = getGoogleSystemPrompt();
    userPrompt = getGoogleUserPrompt(brief);
  } else if (platform === "meta") {
    systemPrompt = getMetaSystemPrompt();
    userPrompt = getMetaUserPrompt(brief, count);
  } else if (platform === "tiktok") {
    systemPrompt = getTikTokSystemPrompt();
    userPrompt = getTikTokUserPrompt(brief, count);
  } else {
    systemPrompt = getTaboolaSystemPrompt();
    userPrompt = getTaboolaUserPrompt(brief, count);
  }

  const response = await getOpenAIClient().chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.85,
    top_p: 0.95,
  });

  const tokensUsed = response.usage?.total_tokens ?? 0;
  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  if (platform === "google") {
    const validated = googleContentSchema.parse({
      headlines: parsed.headlines ?? [],
      descriptions: parsed.descriptions ?? [],
    });
    return { variations: [validated], tokensUsed };
  }

  const variationsRaw: unknown[] = parsed.variations ?? [];

  if (platform === "meta") {
    const validated = variationsRaw.slice(0, count).map((v: unknown) => {
      const item = v as Record<string, unknown>;
      return metaContentSchema.parse({
        primaryText: item.primary_text,
        headline: item.headline,
        description: item.description,
        callToAction: item.call_to_action,
      });
    });
    return { variations: validated, tokensUsed };
  }

  if (platform === "tiktok") {
    const validated = variationsRaw.slice(0, count).map((v: unknown) => {
      const item = v as Record<string, unknown>;
      return tiktokContentSchema.parse({
        hook: item.hook,
        body: item.body,
        cta: item.cta,
        onScreenText: item.on_screen_text ?? [],
      });
    });
    return { variations: validated, tokensUsed };
  }

  // taboola
  const validated = variationsRaw.slice(0, count).map((v: unknown) => {
    const item = v as Record<string, unknown>;
    return taboolaContentSchema.parse({
      headline: item.headline,
      bodyText: item.body_text,
      thumbnailDescription: item.thumbnail_description,
    });
  });
  return { variations: validated, tokensUsed };
}

export async function generateVariations(
  brief: BriefInput,
  platforms: Platform[],
  count: number,
  onVariation?: (platform: Platform, content: unknown, index: number) => void
): Promise<GenerationResult> {
  const start = Date.now();
  const allVariations: GeneratedVariation[] = [];
  let totalTokens = 0;

  for (const platform of platforms) {
    const { variations, tokensUsed } = await generateForPlatform(platform, brief, count);
    totalTokens += tokensUsed;

    variations.forEach((content, index) => {
      const variation: GeneratedVariation = { platform, content, position: index };
      allVariations.push(variation);
      onVariation?.(platform, content, index);
    });
  }

  return {
    variations: allVariations,
    tokensUsed: totalTokens,
    durationMs: Date.now() - start,
  };
}

export async function regenerateSingleVariation(
  brief: BriefInput,
  platform: Platform
): Promise<unknown> {
  const { variations } = await generateForPlatform(platform, brief, 1);
  return variations[0];
}

export async function regenerateSingleField(
  brief: BriefInput,
  platform: Platform,
  field: string,
  currentContent: unknown
): Promise<string> {
  const fieldPrompts: Record<string, string> = {
    headline: `Rewrite only the headline for this ${platform} ad. Current context: ${JSON.stringify(currentContent)}. Return JSON: {"value": "new headline"}`,
    primaryText: `Rewrite only the primary_text for this Meta ad. Current context: ${JSON.stringify(currentContent)}. Return JSON: {"value": "new primary text"}`,
    hook: `Rewrite only the hook (0-3 second script) for this TikTok ad. Current context: ${JSON.stringify(currentContent)}. Return JSON: {"value": "new hook"}`,
  };

  const prompt = fieldPrompts[field] ?? `Rewrite the "${field}" field for a ${platform} ad based on: ${JSON.stringify(currentContent)}. Return JSON: {"value": "new value"}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert ${platform} ads copywriter. Rewrite only the requested field while keeping it consistent with the overall ad context. Respect all character limits.`,
      },
      { role: "user", content: `Brief context: ${JSON.stringify(brief)}\n\n${prompt}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.9,
  });

  const raw = response.choices[0]?.message?.content ?? '{"value": ""}';
  const parsed = JSON.parse(raw);
  return parsed.value ?? "";
}
