import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { regenerateSingleVariation } from "@/lib/ai/generator";
import { BriefInput } from "@/lib/validators/brief";
import { Platform } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variationId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const limited = await enforceRateLimit(`user:${userId}`);
    if (limited) return limited;
    const { variationId } = await params;

    const variation = await prisma.variation.findFirst({
      where: { id: variationId, deletedAt: null, creativeSet: { project: { userId } } },
      include: { creativeSet: { include: { brief: true } } },
    });

    if (!variation) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Variation not found" } }, { status: 404 });
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
      language: briefData.language as BriefInput["language"],
    };

    const newContent = await regenerateSingleVariation(brief, variation.platform as Platform);

    const updated = await prisma.variation.update({
      where: { id: variationId },
      data: { content: newContent as object },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    logError("POST /api/projects/:id/variations/:variationId/regenerate", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Regeneration failed" } }, { status: 500 });
  }
}
