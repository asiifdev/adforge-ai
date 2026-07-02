import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone build for the production Dockerfile.
  output: "standalone",
  // A stray /Users/a/package-lock.json outside the repo makes Next.js
  // misdetect the workspace root; pin it to this project explicitly.
  turbopack: {
    root: path.join(__dirname),
  },
  // Prisma's generated client ships a native query engine and dynamically
  // requires helper packages in ways Turbopack's bundler can't trace through
  // pnpm's symlinked store — leave it as a plain runtime require() instead.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
