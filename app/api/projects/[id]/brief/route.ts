import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { briefSchema } from "@/lib/validators/brief";
import { Platform, CampaignGoal, CampaignTone } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }

    const brief = await prisma.brief.findUnique({ where: { projectId: id } });
    if (!brief) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Brief not found" } }, { status: 404 });
    }

    return NextResponse.json(brief);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch brief" } }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = briefSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const brief = await prisma.brief.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        productName: data.productName,
        description: data.description,
        landingUrl: data.landingUrl || null,
        targetAudience: data.targetAudience,
        goal: data.goal as CampaignGoal,
        tone: data.tone as CampaignTone,
        budgetRange: data.budgetRange || null,
        platforms: data.platforms as Platform[],
        variationsPerPlatform: data.variationsPerPlatform,
      },
      update: {
        productName: data.productName,
        description: data.description,
        landingUrl: data.landingUrl || null,
        targetAudience: data.targetAudience,
        goal: data.goal as CampaignGoal,
        tone: data.tone as CampaignTone,
        budgetRange: data.budgetRange || null,
        platforms: data.platforms as Platform[],
        variationsPerPlatform: data.variationsPerPlatform,
      },
    });

    return NextResponse.json(brief);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to save brief" } }, { status: 500 });
  }
}
