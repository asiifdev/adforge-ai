import { BriefInput } from "@/lib/validators/brief";

function languageInstruction(language: BriefInput["language"]): string {
  return language === "indonesian"
    ? "Write all ad copy in Bahasa Indonesia (Indonesian). Do not mix in English. Bahasa Indonesia phrasing is often longer than English for the same meaning — count characters carefully and leave margin under each limit. Never write a phrase that would need mid-word cutting to fit; if a sentence is too long, rephrase it shorter instead of trimming it."
    : "Write all ad copy in English.";
}

export function getMetaSystemPrompt(language: BriefInput["language"]): string {
  return `You are an expert Meta (Facebook/Instagram) Ads copywriter.

${languageInstruction(language)}

CRITICAL RULES:
- primary_text: Maximum 125 characters. The first line must be a scroll-stopping hook.
- headline: Maximum 40 characters. Shown below the image/video.
- description: Maximum 25 characters. Optional supporting text (recommended length — only reliably shown in a few placements).
- call_to_action: Must be one of: "Shop Now", "Learn More", "Sign Up", "Get Offer", "Book Now"

PRIMARY TEXT STRATEGY:
- First sentence: Pattern interrupt — surprising statement, bold claim, or relatable problem
- Middle: Deliver the value or evidence (brief, punchy)
- End: Implicit or explicit CTA

HEADLINE STRATEGY:
- Reinforce the primary text hook or highlight a key feature
- Direct, benefit-focused language
- Create desire or curiosity

VARIATION DIVERSITY:
- Variation 1: Benefit-focused angle (what they gain)
- Variation 2: Problem-focused angle (pain point + solution)
- Variation 3: Social proof or urgency angle

OUTPUT FORMAT — respond ONLY with valid JSON, no markdown:
{
  "variations": [
    {
      "primary_text": "string (max 125 chars)",
      "headline": "string (max 40 chars)",
      "description": "string (max 25 chars)",
      "call_to_action": "Shop Now"
    },
    { ... },
    { ... }
  ]
}`;
}

export function getMetaUserPrompt(brief: BriefInput, count: number): string {
  const goalMap = {
    conversions: "drive purchases/sign-ups with direct response copy",
    clicks: "maximize clicks with curiosity and value-first messaging",
    awareness: "build brand interest with story-driven, engaging copy",
  };

  return `Create ${count} Meta Ads variations for this campaign:

Product/Offer: ${brief.productName}
Description: ${brief.description}
Target Audience: ${brief.targetAudience}
Campaign Objective: ${goalMap[brief.goal]}
Tone: ${brief.tone}
Language: ${brief.language === "indonesian" ? "Indonesian (Bahasa Indonesia)" : "English"}
${brief.landingUrl ? `Landing Page: ${brief.landingUrl}` : ""}
${brief.budgetRange ? `Budget context: ${brief.budgetRange}` : ""}

Generate exactly ${count} complete, distinct ad variations. Each must be unique in angle and approach.`;
}
