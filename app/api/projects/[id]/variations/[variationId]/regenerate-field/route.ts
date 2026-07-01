import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { regenerateSingleField } from "@/lib/ai/generator";
import { BriefInput } from "@/lib/validators/brief";
import { Platform } from "@prisma/client";

const schema = z.object({ field: z.string().min(1) });

// Google fields address one entry of a headlines/descriptions array (e.g. "headline_3");
// every other platform's field name maps directly to a key in its content object.
function applyFieldToContent(content: unknown, field: string, value: string): object {
  const obj = { ...(content as Record<string, unknown>) };
  const arrayMatch = field.match(/^(headline|description)_(\d+)$/);

  if (arrayMatch) {
    const [, key, idxStr] = arrayMatch;
    const arrayKey = key === "headline" ? "headlines" : "descriptions";
    const idx = parseInt(idxStr, 10) - 1;
    const arr = Array.isArray(obj[arrayKey]) ? [...(obj[arrayKey] as string[])] : [];
    if (idx >= 0 && idx < arr.length) arr[idx] = value;
    obj[arrayKey] = arr;
    return obj;
  }

  obj[field] = value;
  return obj;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ variationId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const limited = enforceRateLimit(`user:${userId}`);
    if (limited) return limited;
    const { variationId } = await params;

    const variation = await prisma.variation.findFirst({
      where: { id: variationId, creativeSet: { project: { userId } } },
      include: { creativeSet: { include: { brief: true } } },
    });

    if (!variation) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Variation not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Field name required" } }, { status: 400 });
    }

    const briefData = variation.creativeSet.brief;
    const brief: BriefInput = {
      productName: briefData.productName,
      description: briefData.description,
      landingUrl: briefData.landingUrl ?? undefined,
      targetAudience: briefData.targetAudience,
      goal: briefData.goal as BriefInput["goal"],
      tone: briefData.tone as BriefInput["tone"],
      budgetRange: briefData.budgetRange ?? undefined,
      platforms: briefData.platforms as BriefInput["platforms"],
      variationsPerPlatform: briefData.variationsPerPlatform,
    };

    const value = await regenerateSingleField(
      brief,
      variation.platform as Platform,
      parsed.data.field,
      variation.content
    );

    const updatedContent = applyFieldToContent(variation.content, parsed.data.field, value);
    await prisma.variation.update({
      where: { id: variationId },
      data: { content: updatedContent },
    });

    return NextResponse.json({
      field: parsed.data.field,
      value,
      characterCount: value.length,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    logError("POST /api/projects/:id/variations/:variationId/regenerate-field", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Field regeneration failed" } }, { status: 500 });
  }
}
