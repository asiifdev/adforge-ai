import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { cookieJar } from "./setup";
import { prisma } from "@/lib/db/client";
import { signToken } from "@/lib/auth";
import { GET as listProjects, POST as createProject } from "@/app/api/projects/route";
import { DELETE as deleteProject } from "@/app/api/projects/[id]/route";

let userId: string;
let otherUserId: string;

async function authenticateAs(id: string) {
  const token = await signToken(id);
  cookieJar.set("adforge_token", token);
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: "integration-projects@test.local", passwordHash: "x", name: "Integration Test" },
  });
  userId = user.id;

  const other = await prisma.user.create({
    data: { email: "integration-projects-other@test.local", passwordHash: "x", name: "Other User" },
  });
  otherUserId = other.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  cookieJar.clear();
});

describe("POST /api/projects", () => {
  it("rejects unauthenticated requests", async () => {
    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Nope" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await createProject(req);
    expect(res.status).toBe(401);
  });

  it("creates a project scoped to the authenticated user", async () => {
    await authenticateAs(userId);
    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Summer Launch" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await createProject(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Summer Launch");

    const stored = await prisma.project.findUnique({ where: { id: body.id } });
    expect(stored?.userId).toBe(userId);
  });
});

describe("GET /api/projects", () => {
  it("only returns projects owned by the authenticated user", async () => {
    await authenticateAs(userId);
    await prisma.project.create({ data: { userId, name: "Mine" } });

    await authenticateAs(otherUserId);
    await prisma.project.create({ data: { userId: otherUserId, name: "Not Mine" } });

    await authenticateAs(userId);
    const req = new NextRequest("http://localhost/api/projects");
    const res = await listProjects(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.projects.every((p: { id: string }) => p.id)).toBe(true);
    const names = body.projects.map((p: { name: string }) => p.name);
    expect(names).not.toContain("Not Mine");
  });
});

describe("DELETE /api/projects/:id", () => {
  it("cascades to briefs and creative sets", async () => {
    await authenticateAs(userId);
    const project = await prisma.project.create({ data: { userId, name: "To Delete" } });
    await prisma.brief.create({
      data: {
        projectId: project.id,
        productName: "Widget",
        description: "A widget that helps people do things efficiently and reliably.",
        targetAudience: "People who need widgets for their daily work.",
        goal: "conversions",
        tone: "professional",
        platforms: ["google"],
        variationsPerPlatform: 5,
      },
    });

    const req = new NextRequest(`http://localhost/api/projects/${project.id}`, { method: "DELETE" });
    const res = await deleteProject(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);

    const stillThere = await prisma.project.findUnique({ where: { id: project.id } });
    expect(stillThere).toBeNull();
    const brief = await prisma.brief.findUnique({ where: { projectId: project.id } });
    expect(brief).toBeNull();
  });

  it("returns 404 for another user's project", async () => {
    const project = await prisma.project.create({ data: { userId: otherUserId, name: "Someone Else's" } });
    await authenticateAs(userId);

    const req = new NextRequest(`http://localhost/api/projects/${project.id}`, { method: "DELETE" });
    const res = await deleteProject(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(404);
  });
});
