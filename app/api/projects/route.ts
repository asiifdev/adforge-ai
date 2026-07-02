import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const limited = await enforceRateLimit(`user:${userId}`);
    if (limited) return limited;
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") ?? "20")));
    const search = searchParams.get("search") ?? undefined;
    const platform = searchParams.get("platform") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const where = {
      userId,
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
      ...(status && { status: status as "draft" | "generated" | "archived" }),
      ...(platform && {
        brief: { platforms: { has: platform as "google" | "meta" | "tiktok" | "taboola" } },
      }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { updatedAt: "desc" },
        include: {
          brief: { select: { platforms: true } },
          _count: { select: { creativeSets: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const variationCounts = await Promise.all(
      projects.map(async (p) => {
        const count = await prisma.variation.count({
          where: { deletedAt: null, creativeSet: { projectId: p.id } },
        });
        return { id: p.id, count };
      })
    );
    const countMap = Object.fromEntries(variationCounts.map((vc) => [vc.id, vc.count]));

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        platforms: p.brief?.platforms ?? [],
        variationCount: countMap[p.id] ?? 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    logError("GET /api/projects", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch projects" } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const limited = await enforceRateLimit(`user:${userId}`);
    if (limited) return limited;
    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: { userId, name: parsed.data.name },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    logError("POST /api/projects", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create project" } }, { status: 500 });
  }
}
