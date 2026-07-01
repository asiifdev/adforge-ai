import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth";
import { generateVariations } from "@/lib/ai/generator";
import { checkRateLimit } from "@/lib/rate-limit";
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

  const { allowed, remaining, resetAt } = checkRateLimit(`generate:${userId}`, 10);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." } }),
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }
  void remaining;

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

      let totalSaved = 0;
      let anyPlatformFailed = false;

      try {
        // Each platform is generated and logged independently — one platform's
        // failure (e.g. a bad model response) shouldn't discard variations that
        // other platforms already generated in the same run.
        for (const platform of platforms) {
          send("platform_start", { platform });

          const variationsForPlatform: unknown[] = [];
          let platformTokens = 0;
          const platformStart = Date.now();

          try {
            const creativeSet = await prisma.creativeSet.create({
              data: {
                projectId: id,
                briefId: project.brief!.id,
                platform,
              },
            });

            await generateVariations(
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
                totalSaved++;
                send("variation", { platform: plat, variation, index });
              },
              (_plat, tokensUsed) => {
                platformTokens = tokensUsed;
              }
            );

            await prisma.generationLog.create({
              data: {
                projectId: id,
                modelUsed: process.env.OPENAI_MODEL ?? "gpt-4o",
                platform,
                tokensUsed: platformTokens,
                durationMs: Date.now() - platformStart,
                status: "success",
              },
            });

            send("platform_complete", { platform, count: variationsForPlatform.length });
          } catch (err) {
            anyPlatformFailed = true;
            const msg = err instanceof Error ? err.message : "Generation failed";
            const partial = variationsForPlatform.length > 0;

            await prisma.generationLog.create({
              data: {
                projectId: id,
                modelUsed: process.env.OPENAI_MODEL ?? "gpt-4o",
                platform,
                tokensUsed: platformTokens,
                durationMs: Date.now() - platformStart,
                status: partial ? "partial" : "error",
                errorMsg: msg,
              },
            }).catch(() => undefined);

            send("error", { message: msg, platform });
            if (partial) {
              send("platform_complete", { platform, count: variationsForPlatform.length });
            }
          }
        }

        if (totalSaved > 0) {
          await prisma.project.update({
            where: { id },
            data: { status: "generated" },
          });
        }

        send("done", {
          totalVariations: totalSaved,
          durationMs: Date.now() - start,
          partial: anyPlatformFailed && totalSaved > 0,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        send("error", { message: msg });
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
