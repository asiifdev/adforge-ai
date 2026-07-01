import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { cookieJar } from "./setup";
import { prisma } from "@/lib/db/client";
import { signToken } from "@/lib/auth";
import { GET as listVariations } from "@/app/api/projects/[id]/variations/route";
import { PATCH as patchVariation } from "@/app/api/projects/[id]/variations/[variationId]/route";
import { GET as exportProject } from "@/app/api/projects/[id]/export/route";

let userId: string;
let projectId: string;
let variationId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: "integration-variations@test.local", passwordHash: "x", name: "Integration Test" },
  });
  userId = user.id;

  const project = await prisma.project.create({
    data: { userId, name: "Export Test Campaign", status: "generated" },
  });
  projectId = project.id;

  const brief = await prisma.brief.create({
    data: {
      projectId,
      productName: "Widget Pro",
      description: "A widget that helps busy professionals get more done every day.",
      landingUrl: "https://example.com/widget",
      targetAudience: "Busy professionals who need reliable tools.",
      goal: "conversions",
      tone: "professional",
      platforms: ["google", "meta"],
      variationsPerPlatform: 1,
    },
  });

  const creativeSet = await prisma.creativeSet.create({
    data: { projectId, briefId: brief.id, platform: "google" },
  });

  const variation = await prisma.variation.create({
    data: {
      creativeSetId: creativeSet.id,
      platform: "google",
      position: 0,
      content: {
        headlines: Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
        descriptions: Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`),
      },
    },
  });
  variationId = variation.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.clear();
  const token = await signToken(userId);
  cookieJar.set("adforge_token", token);
});

describe("GET /api/projects/:id/variations", () => {
  it("returns the seeded variation", async () => {
    const req = new NextRequest(`http://localhost/api/projects/${projectId}/variations`);
    const res = await listVariations(req, { params: Promise.resolve({ id: projectId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.variations).toHaveLength(1);
    expect(body.variations[0].id).toBe(variationId);
  });
});

describe("PATCH /api/projects/:id/variations/:variationId", () => {
  it("persists star/label/notes updates", async () => {
    const req = new NextRequest(`http://localhost/api/projects/${projectId}/variations/${variationId}`, {
      method: "PATCH",
      body: JSON.stringify({ isFavorite: true, label: "A", notes: "Strong angle" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await patchVariation(req, { params: Promise.resolve({ id: projectId, variationId }) });
    expect(res.status).toBe(200);

    const stored = await prisma.variation.findUnique({ where: { id: variationId } });
    expect(stored?.isFavorite).toBe(true);
    expect(stored?.label).toBe("A");
    expect(stored?.notes).toBe("Strong angle");
  });
});

describe("GET /api/projects/:id/export", () => {
  it("returns a Google Ads Editor-compatible CSV", async () => {
    const req = new NextRequest(`http://localhost/api/projects/${projectId}/export?format=csv`);
    const res = await exportProject(req, { params: Promise.resolve({ id: projectId }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");

    const csv = await res.text();
    expect(csv).toContain("Campaign,Ad Group");
    expect(csv).toContain("Final URL");
    expect(csv).toContain("https://example.com/widget");
  });

  it("returns structured JSON grouped by platform", async () => {
    const req = new NextRequest(`http://localhost/api/projects/${projectId}/export?format=json`);
    const res = await exportProject(req, { params: Promise.resolve({ id: projectId }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.platforms.google).toHaveLength(1);
    expect(body.project.name).toBe("Export Test Campaign");
  });

  it("404s when no variations exist for the filtered platform", async () => {
    const req = new NextRequest(`http://localhost/api/projects/${projectId}/export?format=csv&platform=tiktok`);
    const res = await exportProject(req, { params: Promise.resolve({ id: projectId }) });
    expect(res.status).toBe(404);
  });
});
