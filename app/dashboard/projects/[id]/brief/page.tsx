import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      }
    : null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">Campaign Brief</p>
        </div>
      </div>

      <BriefForm projectId={id} initialBrief={initialBrief} />
    </div>
  );
}
