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

// The model occasionally drifts by one or two entries. Rather than aborting the whole
// platform's generation (FRD 2.3 calls for trim/pad, not hard failure), coerce to the
// exact count the schema requires: trim overflow, pad shortfall by cycling existing entries.
function coerceToLength(items: string[], length: number): string[] {
  if (items.length === 0) return Array(length).fill("");
  if (items.length >= length) return items.slice(0, length);
  const padded = [...items];
  let i = 0;
  while (padded.length < length) {
    padded.push(items[i % items.length]);
    i++;
  }
  return padded;
}

async function generateGoogleRSASet(brief: BriefInput): Promise<{ variation: unknown; tokensUsed: number }> {
  const response = await getOpenAIClient().chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: getGoogleSystemPrompt() },
      { role: "user", content: getGoogleUserPrompt(brief) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.85,
    top_p: 0.95,
  });

  const tokensUsed = response.usage?.total_tokens ?? 0;
  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  const validated = googleContentSchema.parse({
    headlines: coerceToLength(parsed.headlines ?? [], 15),
    descriptions: coerceToLength(parsed.descriptions ?? [], 4),
  });

  return { variation: validated, tokensUsed };
}

async function generateForPlatform(
  platform: Platform,
  brief: BriefInput,
  count: number
): Promise<{ variations: unknown[]; tokensUsed: number }> {
  if (platform === "google") {
    // Each Google "variation" is one complete RSA set (15 headlines + 4 descriptions) —
    // the model can't reliably produce N distinct full sets in a single completion
    // without diversity collapsing, so each set is requested in its own call.
    let tokensUsed = 0;
    const variations: unknown[] = [];
    for (let i = 0; i < count; i++) {
      const { variation, tokensUsed: t } = await generateGoogleRSASet(brief);
      variations.push(variation);
      tokensUsed += t;
    }
    return { variations, tokensUsed };
  }

  let systemPrompt: string;
  let userPrompt: string;

  if (platform === "meta") {
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
  onVariation?: (platform: Platform, content: unknown, index: number) => void,
  onPlatformComplete?: (platform: Platform, tokensUsed: number) => void
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

    onPlatformComplete?.(platform, tokensUsed);
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
