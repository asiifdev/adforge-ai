import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import CreativesClient from "./CreativesClient";

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
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold truncate">{project.name}</h1>
            <p className="text-xs text-muted-foreground">{project.brief.productName}</p>
          </div>
        </div>
      </div>

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
