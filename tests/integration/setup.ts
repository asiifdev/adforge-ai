// Runs before each integration test file. Provides a fake next/headers cookie
// jar so route handlers' requireAuth()/getSession() work outside an actual
// Next.js request context, while everything else (Prisma, Zod, rate limiting)
// runs for real against the throwaway Postgres container.
import { vi } from "vitest";

const cookieJar = vi.hoisted(() => new Map<string, string>());
export { cookieJar };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));
