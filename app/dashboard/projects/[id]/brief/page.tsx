import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Sparkles } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import BriefForm from "@/components/brief/BriefForm";
import type { BriefInput } from "@/lib/validators/brief";

export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await requireAuth().catch(() => ({ userId: null }));
  if (!userId) notFound();

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: { brief: true },
  });

  if (!project) notFound();

  const initialBrief: BriefInput | null = project.brief
    ? {
        productName: project.brief.productName,
        description: project.brief.description,
        landingUrl: project.brief.landingUrl ?? "",
        targetAudience: project.brief.targetAudience,
        goal: project.brief.goal as BriefInput["goal"],
        tone: project.brief.tone as BriefInput["tone"],
        budgetRange: project.brief.budgetRange ?? "",
        platforms: project.brief.platforms as BriefInput["platforms"],
        variationsPerPlatform: project.brief.variationsPerPlatform,
        language: project.brief.language as BriefInput["language"],
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0"
          >
            <Zap className="h-3.5 w-3.5 text-indigo-600" />
            <span className="font-medium text-indigo-600 hidden sm:inline">AdForge</span>
          </Link>
          <span className="text-muted-foreground/50 text-sm">/</span>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            Projects
          </Link>
          <span className="text-muted-foreground/50 text-sm hidden sm:block">/</span>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0 sm:hidden" />
            <h1 className="font-semibold text-sm truncate">{project.name}</h1>
          </div>
          {initialBrief && (
            <Link
              href={`/dashboard/projects/${id}/creatives`}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-md px-2.5 py-1.5 shrink-0"
            >
              <Sparkles className="h-3 w-3" />
              View Creatives
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight">Campaign Brief</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the details below — the AI will use this to generate platform-optimized ad copy.
          </p>
        </div>
        <BriefForm projectId={id} initialBrief={initialBrief} />
      </main>
    </div>
  );
}
