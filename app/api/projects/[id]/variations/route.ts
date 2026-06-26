import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { Platform } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }

    const platform = searchParams.get("platform") as Platform | null;
    const isFavorite = searchParams.get("is_favorite");
    const label = searchParams.get("label");

    const variations = await prisma.variation.findMany({
      where: {
        creativeSet: { projectId: id },
        ...(platform && { platform }),
        ...(isFavorite !== null && { isFavorite: isFavorite === "true" }),
        ...(label && { label: label as "A" | "B" | "C" | "D" }),
      },
      orderBy: [{ creativeSet: { generatedAt: "desc" } }, { position: "asc" }],
    });

    return NextResponse.json({ variations });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch variations" } }, { status: 500 });
  }
}
