import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { generateVariations } from "@/lib/ai/generator";
import { BriefInput } from "@/lib/validators/brief";
import { Platform } from "@prisma/client";

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await requireAuth().catch(() => ({ userId: null }));
  if (!userId) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: { brief: true },
  });

  if (!project?.brief) {
    return new Response(JSON.stringify({ error: "No brief found for project" }), { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const platforms = (body.platforms as Platform[] | undefined) ?? project.brief.platforms as Platform[];

  const brief: BriefInput = {
    productName: project.brief.productName,
    description: project.brief.description,
    landingUrl: project.brief.landingUrl ?? undefined,
    targetAudience: project.brief.targetAudience,
    goal: project.brief.goal as BriefInput["goal"],
    tone: project.brief.tone as BriefInput["tone"],
    budgetRange: project.brief.budgetRange ?? undefined,
    platforms: platforms as BriefInput["platforms"],
    variationsPerPlatform: project.brief.variationsPerPlatform,
  };

  const start = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(sse(event, data)));
      };

      try {
        for (const platform of platforms) {
          send("platform_start", { platform });

          const creativeSet = await prisma.creativeSet.create({
            data: {
              projectId: id,
              briefId: project.brief!.id,
              platform,
            },
          });

          const variationsForPlatform: unknown[] = [];

          const { variations } = await generateVariations(
            brief,
            [platform],
            brief.variationsPerPlatform,
            async (plat, content, index) => {
              const variation = await prisma.variation.create({
                data: {
                  creativeSetId: creativeSet.id,
                  platform: plat,
                  content: content as object,
                  position: index,
                },
              });
              variationsForPlatform.push(variation);
              send("variation", { platform: plat, variation, index });
            }
          );

          const tokensUsed = 0;
          const durationMs = Date.now() - start;

          await prisma.generationLog.create({
            data: {
              projectId: id,
              modelUsed: process.env.OPENAI_MODEL ?? "gpt-4o",
              platform,
              tokensUsed,
              durationMs,
              status: "success",
            },
          });

          send("platform_complete", {
            platform,
            count: variations.filter((v) => v.platform === platform).length,
          });
        }

        await prisma.project.update({
          where: { id },
          data: { status: "generated" },
        });

        send("done", {
          totalVariations: platforms.length * brief.variationsPerPlatform,
          durationMs: Date.now() - start,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        send("error", { message: msg });

        await prisma.generationLog.create({
          data: {
            projectId: id,
            modelUsed: process.env.OPENAI_MODEL ?? "gpt-4o",
            platform: platforms[0] ?? "google",
            status: "error",
            errorMsg: msg,
          },
        }).catch(() => undefined);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
