import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { exportToCSV } from "@/lib/export/csv";
import { exportToJSON } from "@/lib/export/json";
import { exportToPDF } from "@/lib/export/pdf";
import { Platform } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const format = searchParams.get("format") as "csv" | "json" | "pdf" | null;
    const platform = searchParams.get("platform") as Platform | null;
    const favoritesOnly = searchParams.get("favorites_only") === "true";

    if (!format || !["csv", "json", "pdf"].includes(format)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid format. Use csv, json, or pdf" } }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: { brief: true },
    });

    if (!project) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }

    const variations = await prisma.variation.findMany({
      where: {
        creativeSet: { projectId: id },
        ...(platform && { platform }),
        ...(favoritesOnly && { isFavorite: true }),
      },
      orderBy: [{ platform: "asc" }, { position: "asc" }],
    });

    if (variations.length === 0) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "No variations to export" } }, { status: 404 });
    }

    const slug = project.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const date = new Date().toISOString().split("T")[0];
    const filename = `adforge-${slug}-${date}`;

    if (format === "csv") {
      const csv = exportToCSV({ name: project.name, variations });
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === "json") {
      const json = exportToJSON({ project, brief: project.brief, variations });
      return new Response(json, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    }

    // PDF
    const pdfBytes = await exportToPDF({
      projectName: project.name,
      productName: project.brief?.productName ?? project.name,
      variations,
    });

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Export failed" } }, { status: 500 });
  }
}
