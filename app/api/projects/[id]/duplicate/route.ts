import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { Platform, CampaignGoal, CampaignTone } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const limited = enforceRateLimit(`user:${userId}`);
    if (limited) return limited;
    const { id } = await params;

    const source = await prisma.project.findFirst({
      where: { id, userId },
      include: { brief: true },
    });

    if (!source) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }

    const copy = await prisma.project.create({
      data: {
        userId,
        name: `${source.name} (Copy)`,
        status: "draft",
      },
    });

    if (source.brief) {
      await prisma.brief.create({
        data: {
          projectId: copy.id,
          productName: source.brief.productName,
          description: source.brief.description,
          landingUrl: source.brief.landingUrl,
          targetAudience: source.brief.targetAudience,
          goal: source.brief.goal as CampaignGoal,
          tone: source.brief.tone as CampaignTone,
          budgetRange: source.brief.budgetRange,
          platforms: source.brief.platforms as Platform[],
          variationsPerPlatform: source.brief.variationsPerPlatform,
        },
      });
    }

    return NextResponse.json({ id: copy.id, name: copy.name }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    logError("POST /api/projects/:id/duplicate", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to duplicate project" } }, { status: 500 });
  }
}
