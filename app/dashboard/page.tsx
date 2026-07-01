import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Zap, FolderOpen, Archive } from "lucide-react";
import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ProjectActions from "./ProjectActions";
import DashboardSearch from "./DashboardSearch";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  taboola: "Taboola",
};

const PLATFORM_COLORS: Record<string, string> = {
  google: "bg-blue-100 text-blue-700",
  meta: "bg-violet-100 text-violet-700",
  tiktok: "bg-rose-100 text-rose-700",
  taboola: "bg-orange-100 text-orange-700",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "border-border text-muted-foreground",
  generated: "border-green-300 bg-green-50 text-green-700",
  archived: "border-border text-muted-foreground",
};

const PAGE_SIZE = 12;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; platform?: string; from?: string; to?: string; page?: string; archived?: string }>;
}) {
  const { userId } = await requireAuth().catch(() => ({ userId: null }));
  if (!userId) redirect("/login");

  const { search, platform, from, to, page: pageParam, archived } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const showArchived = archived === "true";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const where = {
    userId,
    status: showArchived ? ("archived" as const) : { not: "archived" as const },
    ...(search && { name: { contains: search, mode: "insensitive" as const } }),
    ...(platform && {
      brief: { platforms: { has: platform as "google" | "meta" | "tiktok" | "taboola" } },
    }),
    ...((from || to) && {
      updatedAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
      },
    }),
  };

  const [projects, matchingCount] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        brief: { select: { platforms: true, productName: true } },
        _count: { select: { creativeSets: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));

  const variationCounts = await Promise.all(
    projects.map(async (p) => {
      const count = await prisma.variation.count({
        where: { creativeSet: { projectId: p.id } },
      });
      return { id: p.id, count };
    })
  );
  const countMap = Object.fromEntries(variationCounts.map((vc) => [vc.id, vc.count]));

  const totalProjects = await prisma.project.count({ where: { userId, status: { not: "archived" } } });

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-foreground tracking-tight">AdForge AI</span>
          </div>
          <div className="flex items-center gap-3">
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign out
              </button>
            </form>
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {showArchived
                ? "Archived Projects"
                : user?.name
                ? `Welcome back, ${user.name.split(" ")[0]}`
                : "Projects"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {showArchived
                ? `${matchingCount} archived project${matchingCount === 1 ? "" : "s"}`
                : totalProjects === 0
                ? "Create your first campaign brief to get started"
                : `${totalProjects} active project${totalProjects === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={showArchived ? "/dashboard" : "/dashboard?archived=true"}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Back to Active" : "View Archived"}
            </Link>
            {!showArchived && <NewProjectButton userId={userId} />}
          </div>
        </div>

        {totalProjects > 0 && (
          <div className="mb-6">
            <Suspense>
              <DashboardSearch />
            </Suspense>
          </div>
        )}

        {showArchived && projects.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed text-muted-foreground">
            <p className="font-medium">No archived projects</p>
          </div>
        ) : projects.length === 0 && totalProjects === 0 ? (
          <div className="text-center py-28 rounded-2xl border border-dashed border-border bg-muted/20">
            <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-7 w-7 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto leading-relaxed">
              Create a campaign brief and generate platform-native ad copy for Google, Meta, TikTok, and Taboola in seconds.
            </p>
            <NewProjectButton userId={userId} />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed text-muted-foreground">
            <p className="font-medium">No projects match your search</p>
            <p className="text-sm mt-1">Try a different keyword or remove the platform filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group hover:border-indigo-200 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/projects/${project.id}/creatives`}
                        className="font-semibold hover:text-indigo-600 transition-colors line-clamp-1 block text-sm"
                      >
                        {project.name}
                      </Link>
                      {project.brief?.productName && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {project.brief.productName}
                        </p>
                      )}
                    </div>
                    <ProjectActions
                      projectId={project.id}
                      projectName={project.name}
                      isArchived={project.status === "archived"}
                      hasGenerated={project._count.creativeSets > 0}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(project.brief?.platforms ?? []).map((p) => (
                      <span
                        key={p}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_COLORS[p] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {PLATFORM_LABELS[p] ?? p}
                      </span>
                    ))}
                    {!project.brief && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        No brief yet
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {countMap[project.id] ?? 0} variation{(countMap[project.id] ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${STATUS_STYLES[project.status] ?? ""}`}
                      >
                        {project.status}
                      </Badge>
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <PageLink
              page={page - 1}
              disabled={page <= 1}
              search={{ search, platform, from, to, archived }}
            >
              Previous
            </PageLink>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <PageLink
              page={page + 1}
              disabled={page >= totalPages}
              search={{ search, platform, from, to, archived }}
            >
              Next
            </PageLink>
          </div>
        )}
      </main>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  search,
  children,
}: {
  page: number;
  disabled: boolean;
  search: { search?: string; platform?: string; from?: string; to?: string; archived?: string };
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="text-sm text-muted-foreground/40 px-3 py-1.5 rounded-md border border-border cursor-not-allowed">
        {children}
      </span>
    );
  }

  const params = new URLSearchParams();
  if (search.search) params.set("search", search.search);
  if (search.platform) params.set("platform", search.platform);
  if (search.from) params.set("from", search.from);
  if (search.to) params.set("to", search.to);
  if (search.archived) params.set("archived", search.archived);
  params.set("page", String(page));

  return (
    <Link
      href={`/dashboard?${params.toString()}`}
      className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
    >
      {children}
    </Link>
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
      <Button type="submit">
        <Plus className="h-4 w-4 mr-1.5" />
        New Project
      </Button>
    </form>
  );
}
