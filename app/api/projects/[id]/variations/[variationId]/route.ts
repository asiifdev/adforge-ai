import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { updateVariationSchema } from "@/lib/validators/variation";
import { VariationLabel } from "@prisma/client";

async function getVariationForUser(variationId: string, userId: string) {
  return prisma.variation.findFirst({
    where: {
      id: variationId,
      creativeSet: { project: { userId } },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variationId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const limited = enforceRateLimit(`user:${userId}`);
    if (limited) return limited;
    const { variationId } = await params;

    const variation = await getVariationForUser(variationId, userId);
    if (!variation) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Variation not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateVariationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input" } }, { status: 400 });
    }

    const updated = await prisma.variation.update({
      where: { id: variationId },
      data: {
        ...(parsed.data.isFavorite !== undefined && { isFavorite: parsed.data.isFavorite }),
        ...(parsed.data.label !== undefined && { label: parsed.data.label as VariationLabel | null }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    logError("PATCH /api/projects/:id/variations/:variationId", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update variation" } }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variationId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const limited = enforceRateLimit(`user:${userId}`);
    if (limited) return limited;
    const { variationId } = await params;

    const variation = await getVariationForUser(variationId, userId);
    if (!variation) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Variation not found" } }, { status: 404 });
    }

    await prisma.variation.delete({ where: { id: variationId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    logError("DELETE /api/projects/:id/variations/:variationId", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete variation" } }, { status: 500 });
  }
}
