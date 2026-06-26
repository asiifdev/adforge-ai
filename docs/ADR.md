# Architecture Decision Records — AdForge AI

---

## ADR-001: Next.js 15 App Router with Server Actions

**Status:** Accepted  
**Date:** 2025-06-26

### Context

We need a full-stack React framework that supports both server-side and client-side rendering, has excellent TypeScript support, and can handle streaming responses for AI generation.

### Decision

Use Next.js 15 with the App Router and Server Actions.

### Rationale

- **App Router** gives us React Server Components by default — database reads, auth checks, and initial data loading happen on the server with zero client bundle cost.
- **Server Actions** allow form submissions and mutations to call server-side code directly, eliminating the need for API route boilerplate for most mutations (brief saving, variation updates, etc.).
- **Streaming** is first-class in App Router — `ReadableStream` and SSE work naturally in route handlers.
- **Turbopack** as the dev bundler delivers significantly faster HMR cycles during development.
- Next.js 15 deploys to Vercel with zero configuration — ideal for a contest submission.

### Alternatives Considered

- **Remix**: Excellent streaming support but smaller ecosystem, less familiar to most developers.
- **SvelteKit**: Great performance but adds TypeScript complexity and unfamiliar framework.
- **Express + React SPA**: More control but much more boilerplate; no built-in streaming, SSR, or deployment optimization.

### Consequences

- We must use App Router patterns (`use client`, `use server`, async components) consistently.
- API routes in `app/api/` handle SSE streaming; Server Actions handle form mutations.
- Some client-side interactivity (streaming indicator, real-time counters) requires `"use client"` components.

---

## ADR-002: Drizzle ORM over Prisma

**Status:** Accepted  
**Date:** 2025-06-26

### Context

We need an ORM for PostgreSQL that has strong TypeScript support, handles migrations, and integrates well with Next.js serverless edge/node environments.

### Decision

Use Drizzle ORM.

### Rationale

- **Type safety without generation step**: Drizzle's schema defines types directly — no `prisma generate` required in CI/dev setup.
- **SQL-close API**: Drizzle queries look like SQL, making complex joins and JSONB operations intuitive.
- **Serverless-friendly**: Drizzle has minimal overhead and works in edge runtimes. Prisma's connection pooling model can cause issues with serverless cold starts.
- **JSONB support**: Drizzle handles PostgreSQL JSONB natively — critical for our `variations.content` column.
- **Bundle size**: Drizzle is significantly smaller than Prisma's generated client.

### Alternatives Considered

- **Prisma**: More mature ecosystem, better docs, but requires code generation step, heavier client, and has edge runtime limitations.
- **Kysely**: Excellent type safety but no schema management/migrations built in.
- **Raw `pg`**: Maximum control but no type safety, no migration tooling.

### Consequences

- Migrations managed via `drizzle-kit generate` + `drizzle-kit migrate`.
- Schema is single source of truth in `lib/db/schema.ts`.
- JSONB content fields are typed via Zod schemas at the application layer, not at the ORM layer.

---

## ADR-003: Streaming via Server-Sent Events (SSE)

**Status:** Accepted  
**Date:** 2025-06-26

### Context

AI generation can take 10–30 seconds for all platforms. Users should see results appearing incrementally rather than waiting for a loading spinner.

### Decision

Use Server-Sent Events (SSE) via `ReadableStream` in Next.js API route handlers.

### Rationale

- **User experience**: Variations appear one-by-one as they complete, giving perceived speed and feedback.
- **Simplicity over WebSockets**: SSE is unidirectional (server → client) which is all we need. No WebSocket server setup or connection management.
- **Native browser support**: `EventSource` is supported in all modern browsers.
- **Next.js compatible**: `ReadableStream` with `text/event-stream` content type works in Next.js route handlers.
- **OpenAI streaming**: OpenAI's SDK supports streaming responses; we can pipe the stream, parse JSON chunks, and emit SSE events as variations complete.

### Fallback Strategy

If the client doesn't support SSE (rare), we fall back to a polling endpoint (`GET /api/projects/:id/generation-status`) that the client polls every 2 seconds.

### Event Protocol

```
event: platform_start    // platform beginning generation
event: variation         // one complete variation ready
event: platform_complete // all variations for a platform done
event: done              // all platforms complete
event: error             // generation error (may be platform-specific)
```

### Consequences

- Client uses `EventSource` API or custom `fetch` with `ReadableStream` for SSE.
- Server must not buffer — stream must flush after each event.
- SSE connections time out; client should reconnect if connection drops mid-generation.
- Generation state stored in DB incrementally so reconnects don't lose progress.

---

## ADR-004: PostgreSQL as Database

**Status:** Accepted  
**Date:** 2025-06-26

### Context

We need a relational database that supports JSONB (for variation content), arrays (for platforms), and full-text search (for project search).

### Decision

Use PostgreSQL 16.

### Rationale

- **JSONB**: Variation content is platform-specific and schema-varies by platform. JSONB lets us store typed platform content without a rigid schema or separate tables per platform.
- **Arrays**: `platforms TEXT[]` is the cleanest representation for multi-select platform lists.
- **GIN indexes**: JSONB GIN index enables future full-text search inside variation content.
- **Reliability**: PostgreSQL is the gold standard for transactional relational data.
- **Ecosystem**: Drizzle + Neon/Supabase (managed Postgres) makes production deployment trivial.

**Local Dev:** Docker Compose runs `postgres:16-alpine`.  
**Production:** Neon (serverless Postgres, Vercel-friendly) or Supabase.

### Alternatives Considered

- **SQLite**: Simpler local setup but no JSONB, no arrays, poor serverless story.
- **MySQL**: No native JSONB arrays, weaker TypeScript ORM support.
- **MongoDB**: JSONB is a good-enough substitute; relational structure benefits from SQL joins.

---

## ADR-005: AI Provider and Model Strategy

**Status:** Accepted  
**Date:** 2025-06-26

### Context

We need an AI provider that supports streaming, structured JSON output, and has a reliable API with good rate limits.

### Decision

Use OpenAI with `gpt-4o` as the default model.

### Rationale

- **JSON mode / Structured Outputs**: OpenAI's `response_format: { type: "json_object" }` guarantees valid JSON output — critical for parsing platform-specific variation schemas reliably.
- **Streaming**: OpenAI SDK supports `stream: true` with async iteration.
- **gpt-4o quality**: Produces the highest-quality ad copy among available models; follows character limit instructions more reliably than smaller models.
- **SDK v5**: OpenAI's latest SDK has excellent TypeScript types and streaming helpers.

### Model Selection Strategy

- Default: `gpt-4o` (configured via `OPENAI_MODEL` env var)
- Users could optionally select `gpt-4o-mini` for faster/cheaper generation (V2)
- Model used is logged in `generation_logs.model_used` for cost attribution

### Prompt Engineering Strategy

- One prompt file per platform in `lib/ai/prompts/`
- System prompt defines platform specs, character limits, output schema
- User prompt injects campaign brief fields
- Temperature: 0.8 for creative variation; top_p: 0.95
- Each platform generates N variations in a single API call (all N returned as JSON array)

### Alternatives Considered

- **Anthropic Claude**: Excellent instruction following but no native JSON mode (at time of design); streaming is similar.
- **Google Gemini**: Less predictable structured output; smaller ecosystem.
- **Local models (Ollama)**: Cannot guarantee character limit compliance; quality too variable for production use.

---

## ADR-006: Export Format Decisions

**Status:** Accepted  
**Date:** 2025-06-26

### Context

Performance marketers need to get generated copy into their ad platforms. Each platform has different import formats.

### Decision

Support three export formats: CSV (platform-specific), JSON (universal), PDF (presentation).

### Rationale

**CSV:**
- Google Ads Editor accepts bulk CSV imports — our CSV column structure matches Google Ads Editor's bulk sheet format.
- Meta Ads Manager supports CSV import for ad creation.
- CSV is the most direct path from AdForge → live campaigns.
- Implemented with `papaparse` for reliable CSV generation.

**JSON:**
- Developers and power users may want to pipe output into other tools.
- Complete structured export with full metadata.
- Zero dependencies — native `JSON.stringify`.

**PDF:**
- Client presentation use case — creative directors and account managers share formatted PDFs in reviews.
- Implemented with `jsPDF` (browser-compatible, no server rendering needed).
- Generates clean card-layout report with all variation content and metadata.

### Out of Scope

- XLSX: Adds `xlsx` package dependency for marginal benefit over CSV.
- Direct API push (Google/Meta): Phase 2 — requires OAuth and platform-specific API permissions.

---

## ADR-007: Auth Strategy — jose JWT (No NextAuth)

**Status:** Accepted  
**Date:** 2025-06-26

### Context

We need authentication for a single-user-per-account model in MVP. No OAuth, no magic links, no team invites.

### Decision

Implement email/password auth with JWTs signed using the `jose` library.

### Rationale

- **Simplicity**: No third-party auth provider to configure, no OAuth credentials to manage.
- **Contest context**: For a submission, simplicity beats correctness complexity.
- **jose**: JOSE standard JWT implementation with edge-compatible crypto — works in Next.js middleware and route handlers.
- **7-day JWT**: Token stored in `localStorage` (or `httpOnly` cookie for security); refreshed on active use.

### Alternatives Considered

- **NextAuth.js (now Auth.js)**: Powerful but heavy setup for MVP; adds multiple config files and callback complexity.
- **Clerk**: Excellent DX but adds external dependency and cost.
- **Supabase Auth**: Ties us to Supabase as DB host (we want to keep DB provider flexible).

### Consequences

- No refresh token rotation in MVP — tokens expire after 7 days.
- Token stored client-side in `httpOnly` cookie for security.
- Password hashed with `bcryptjs` (10 rounds).
- Middleware in `middleware.ts` validates JWT on protected routes.
