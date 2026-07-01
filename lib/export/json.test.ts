import { describe, it, expect } from "vitest";
import type { Variation, Project, Brief } from "@prisma/client";
import { exportToJSON } from "./json";

describe("exportToJSON", () => {
  it("groups variations by platform and preserves metadata", () => {
    const project = { id: "p-1", name: "My Campaign", status: "generated", createdAt: new Date() } as Pick<
      Project,
      "id" | "name" | "status" | "createdAt"
    >;

    const variations = [
      {
        id: "v-1",
        platform: "google",
        content: { headlines: [], descriptions: [] },
        isFavorite: true,
        label: "A",
        notes: null,
        position: 0,
        creativeSetId: "cs-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "v-2",
        platform: "meta",
        content: { primaryText: "x", headline: "y", description: "z", callToAction: "Shop Now" },
        isFavorite: false,
        label: null,
        notes: "internal note",
        position: 0,
        creativeSetId: "cs-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as Variation[];

    const json = JSON.parse(exportToJSON({ project, brief: null as Brief | null, variations }));

    expect(Object.keys(json.platforms)).toEqual(["google", "meta"]);
    expect(json.platforms.google).toHaveLength(1);
    expect(json.platforms.meta[0].notes).toBe("internal note");
    expect(json.project.name).toBe("My Campaign");
  });
});
