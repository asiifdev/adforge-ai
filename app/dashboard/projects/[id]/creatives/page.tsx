import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, FileEdit } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import CreativesClient from "./CreativesClient";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  tiktok: "TikTok Ads",
  taboola: "Taboola",
};

export default async function CreativesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await requireAuth().catch(() => ({ userId: null }));
  if (!userId) redirect("/login");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: { brief: true },
  });

  if (!project) notFound();
  if (!project.brief) redirect(`/dashboard/projects/${id}/brief`);

  const variations = await prisma.variation.findMany({
    where: { creativeSet: { projectId: id } },
    orderBy: [{ creativeSet: { generatedAt: "desc" } }, { position: "asc" }],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
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
            <div className="min-w-0">
              <h1 className="font-semibold text-sm truncate">{project.name}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {project.brief.productName}
                {project.brief.platforms.length > 0 && (
                  <> &middot; {project.brief.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(", ")}</>
                )}
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/projects/${id}/brief`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border rounded-md px-2.5 py-1.5 hover:bg-muted"
          >
            <FileEdit className="h-3 w-3" />
            Edit Brief
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <CreativesClient
          projectId={id}
          brief={project.brief}
          initialVariations={JSON.parse(JSON.stringify(variations))}
          platforms={project.brief.platforms}
        />
      </div>
    </div>
  );
}
