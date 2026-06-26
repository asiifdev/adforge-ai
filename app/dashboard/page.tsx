import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ProjectActions from "./ProjectActions";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  taboola: "Taboola",
};

export default async function DashboardPage() {
  const { userId } = await requireAuth().catch(() => ({ userId: null }));
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const projects = await prisma.project.findMany({
    where: { userId, status: { not: "archived" } },
    orderBy: { updatedAt: "desc" },
    include: {
      brief: { select: { platforms: true, productName: true } },
      _count: { select: { creativeSets: true } },
    },
  });

  const variationCounts = await Promise.all(
    projects.map(async (p) => {
      const count = await prisma.variation.count({
        where: { creativeSet: { projectId: p.id } },
      });
      return { id: p.id, count };
    })
  );
  const countMap = Object.fromEntries(variationCounts.map((vc) => [vc.id, vc.count]));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            <span className="font-bold text-indigo-600">AdForge AI</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.name}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projects.length === 0
                ? "Create your first campaign brief to get started"
                : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <NewProjectButton userId={userId} />
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-24 rounded-xl border border-dashed">
            <Zap className="h-10 w-10 mx-auto mb-4 text-indigo-400 opacity-60" />
            <h2 className="text-lg font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Create a campaign brief and generate platform-native ad copy for Google, Meta, TikTok, and Taboola in seconds.
            </p>
            <NewProjectButton userId={userId} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/projects/${project.id}/creatives`}
                        className="font-semibold hover:text-indigo-600 transition-colors line-clamp-1 block"
                      >
                        {project.name}
                      </Link>
                      {project.brief?.productName && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {project.brief.productName}
                        </p>
                      )}
                    </div>
                    <ProjectActions projectId={project.id} projectName={project.name} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(project.brief?.platforms ?? []).map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {PLATFORM_LABELS[p] ?? p}
                      </Badge>
                    ))}
                    {!project.brief && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Draft — no brief yet
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {countMap[project.id] ?? 0} variation{(countMap[project.id] ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span>
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

async function NewProjectButton({ userId }: { userId: string }) {
  "use server";

  async function createProject() {
    "use server";
    const project = await prisma.project.create({
      data: { userId, name: "New Campaign" },
    });
    redirect(`/dashboard/projects/${project.id}/brief`);
  }

  return (
    <form action={createProject}>
      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
        <Plus className="h-4 w-4 mr-1.5" />
        New Project
      </Button>
    </form>
  );
}
