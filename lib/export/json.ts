import type { Project, Brief, Variation } from "@prisma/client";

type ExportPayload = {
  project: Pick<Project, "id" | "name" | "status" | "createdAt">;
  brief: Brief | null;
  variations: Variation[];
};

export function exportToJSON(payload: ExportPayload): string {
  const byPlatform: Record<string, unknown[]> = {};

  for (const v of payload.variations) {
    if (!byPlatform[v.platform]) byPlatform[v.platform] = [];
    byPlatform[v.platform].push({
      id: v.id,
      content: v.content,
      isFavorite: v.isFavorite,
      label: v.label,
      notes: v.notes,
      position: v.position,
      createdAt: v.createdAt,
    });
  }

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      project: payload.project,
      brief: payload.brief,
      platforms: byPlatform,
    },
    null,
    2
  );
}
