# AdForge AI — AI-Powered Ad Creative Generator

Generate platform-native ad copy for **Google Ads, Meta Ads, TikTok Ads, and Taboola** in seconds — not hours.

---

## What does this tool do?

AdForge AI eliminates the copy bottleneck in performance marketing. You enter a campaign brief once — product name, target audience, goal, and tone — and AdForge generates ready-to-use ad variations for every platform you select, fully compliant with each platform's character limits and format requirements.

**Platform-specific outputs:**
- **Google Ads RSA:** 15 headlines (≤30 chars each) + 4 descriptions (≤90 chars each) — ready for Ads Editor import
- **Meta Ads:** 3 complete variants with primary text (≤125 chars), headline (≤40 chars), description (≤25 chars), and CTA
- **TikTok Ads:** Hook/body/CTA scripts written for spoken delivery with on-screen text suggestions
- **Taboola:** Native-feel curiosity-gap headlines (≤60 chars), body text (≤250 chars), and branding text (≤30 chars) — matching Taboola's actual "Branding Text" ad field

Every variation appears in real-time via streaming as it's generated. You can star favorites, assign A/B/C/D labels, add internal notes, compare two variations side-by-side, and export directly to CSV (formatted for Google Ads Editor and Meta Ads Manager), JSON, or PDF. Every character limit above is enforced in code, not just requested in the AI prompt — see "Built to survive an audit" below.

Briefs can be generated in **English or Indonesian**, projects can be duplicated (brief included) to spin up variants of a working campaign, and the dashboard supports searching across your projects.

---

## Why build this one?

The insight is specific: **media buyers don't have a copy problem — they have a formatting problem.**

A good creative strategist can develop 5–10 winning angles in a brainstorm session. The bottleneck is translating those angles into 4 completely different platform-specific formats, each with strict character limits, different tone conventions, and different structural requirements. This takes 2–4 hours per campaign and requires either a dedicated copywriter or a media buyer taking time away from optimization.

Generic AI tools (ChatGPT, Claude directly) can write ad copy, but they don't know that:
- Google RSA headlines can't exceed 30 characters
- TikTok copy should be written for spoken delivery at ~3 words/second
- Taboola headlines should feel like editorial content, not ads
- Meta primary text needs a scroll-stopping first sentence

AdForge bakes these constraints into specialized system prompts per platform and validates output before saving. The result is platform-compliant copy that can go directly from the tool into an ad manager — no reformatting, no character counting, no manual adaptation.

---

## What would you build next if this were your full-time job?

**1. Direct ad platform API push**
Connect to Google Ads API and Meta Marketing API so approved creatives can be pushed directly to campaigns without copy-pasting. This removes the last manual step in the workflow.

**2. Performance feedback loop**
Import CTR, conversion rate, and CPA data from ad platforms. Over time, identify which creative angles, tones, and structures perform best for each vertical and audience. Use this to bias future generation toward proven patterns.

**3. Team workspaces and approval workflows**
Creative strategists generate → media buyers review → clients approve. With role-based access and an approval layer, AdForge becomes the source of truth for creative assets across a team or agency.

**4. Creative scoring (CTR prediction)**
Train a model on performance data to predict expected CTR or conversion rate before a variation goes live. Media buyers could sort variations by predicted performance and prioritize.

**5. Image brief generator**
Given the winning ad copy angles, generate detailed briefs for image/video creative teams: describe the ideal visual, scene, emotion, and CTA placement — bridging the gap between copy and creative production.

---

## Built to survive an audit

Before this submission, I ran a full audit of the codebase against its own PRD/FRD/API_SPEC/ERD — comparing documented behavior to what the code actually did, and fact-checking every platform character limit against Google, Meta, TikTok, and Taboola's current official specs (not assumptions). It surfaced real gaps, and I fixed them:

- **Character limits are now enforced in code, not just requested in the AI prompt.** The Zod schemas that validate every generated variation carry real `.max()` constraints per platform, and the generator truncates any AI output that drifts over the limit before it's saved — so "guaranteed platform-compliant copy" is actually guaranteed, not just instructed.
- **Corrected a real platform-spec error:** Taboola's ad unit has no "thumbnail description" field — I had one in the schema at 150 chars. It's now `branding_text` at 30 chars, matching Taboola's actual "Branding Text" field. Meta's description limit was corrected from 30 to 25 chars, its real recommended length.
- **Soft delete for variations**, so deleting a creative from the UI doesn't destroy data — it's recoverable at the DB level, matching the original functional spec.
- **Rate limiting backed by Postgres, not an in-memory Map** — the old approach would silently stop working on every server restart or across multiple instances. The new one is a single atomic upsert against a `rate_limits` table, verified to survive a process restart mid-window.
- **GIN and partial indexes** on `variations.content` and `is_favorite`, matching what the ERD always specified but the shipped schema was missing.

Full findings and the fixes are in `docs/ADR.md` (ADR-009) and reflected throughout `docs/FRD.md`, `docs/ERD.md`, and `docs/API_SPEC.md`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.9 (App Router, Server Actions, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS v4 + shadcn/ui (Base UI, not Radix) |
| AI | OpenAI SDK v6, GPT-4o (or any OpenAI-compatible endpoint via `OPENAI_BASE_URL`), streaming SSE |
| ORM | Prisma v7 (`@prisma/adapter-pg`) with PostgreSQL 18 |
| Auth | jose JWT (httpOnly cookies), enforced by `proxy.ts` (Next 16's rename of `middleware.ts`) |
| Validation | Zod v4 |
| Forms | React Hook Form v7 |
| Export | papaparse (CSV) + jsPDF (PDF) |
| Rate limiting | Postgres-backed atomic upsert (`rate_limits` table) — survives restarts, safe across instances |
| Testing | Vitest (unit) + isolated Dockerized Postgres for integration tests |
| Package manager | pnpm 10 |

> This project runs on a customized build of Next.js with breaking changes from the framework you may know — see `AGENTS.md` and `node_modules/next/dist/docs/` before making framework-level changes.

---

## Getting Started

### Prerequisites
- Node.js ≥ 22
- pnpm ≥ 10 (repo pins `pnpm@10.24.0` via `packageManager`)
- Docker (for local PostgreSQL)
- OpenAI API key, or any OpenAI-compatible endpoint (OpenRouter, Groq, Together, Ollama, ...)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — add OPENAI_API_KEY and a strong JWT_SECRET

# 4. Run database migrations
pnpm db:migrate

# 5. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and register an account.

### Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/adforge
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
# Optional: point at any OpenAI-compatible endpoint instead of api.openai.com
# e.g. OpenRouter, Groq, Together, or a local Ollama server
OPENAI_BASE_URL=
JWT_SECRET=your-secret-at-least-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / start |
| `pnpm lint` | ESLint |
| `pnpm test` / `pnpm test:watch` | Unit tests (Vitest) |
| `pnpm test:integration` | Integration tests against an isolated, throwaway Dockerized Postgres (`scripts/test-integration.sh`) |
| `pnpm db:migrate` | Run Prisma migrations against `.env.local` |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:push` | Push schema changes without a migration |
| `pnpm db:seed` | Seed the database (`prisma/seed.ts`) |

### Docker

`docker compose up -d` starts Postgres 18 for local dev. The full stack (app + Postgres) can also run in containers — see the multi-stage `Dockerfile` (deps → build → runtime, standalone Next.js output) and `docker-compose.yml`. `JWT_SECRET` and `OPENAI_API_KEY` are required and will fail the compose run if unset.

---

## Project Structure

```
adforge-ai/
├── app/
│   ├── (auth)/login|register           # Auth pages
│   ├── dashboard/                      # Projects list, search, actions
│   │   └── projects/[id]/
│   │       ├── brief/                  # Brief form
│   │       └── creatives/              # Generated creatives + streaming
│   └── api/
│       ├── auth/login|register|logout|me
│       └── projects/
│           ├── route.ts                # List/create projects
│           └── [id]/
│               ├── brief/              # Brief CRUD
│               ├── duplicate/          # Clone a project + its brief
│               ├── generate/           # SSE streaming generation endpoint
│               ├── variations/         # Star, label, notes, delete
│               └── export/             # CSV, JSON, PDF download
├── components/
│   ├── brief/                          # BriefForm, PlatformSelector
│   ├── creatives/                      # VariationCard, CharacterCounter
│   ├── export/                         # ExportMenu
│   ├── shared/                         # StreamingIndicator
│   └── ui/                             # shadcn/ui (Base UI) primitives
├── lib/
│   ├── ai/
│   │   ├── client.ts                   # Lazy OpenAI client init
│   │   ├── generator.ts                # Per-platform generation + truncation
│   │   └── prompts/                    # Per-platform engineered prompts
│   ├── db/client.ts                    # Prisma client singleton
│   ├── export/                         # csv.ts, json.ts, pdf.ts
│   ├── validators/                     # Zod schemas
│   ├── auth.ts                         # JWT issue/verify, requireAuth()
│   └── rate-limit.ts                   # Postgres-backed rate limiting
├── proxy.ts                            # Auth guard (Next 16's middleware.ts)
├── tests/                              # Vitest setup + integration suite
├── docs/                               # PRD, FRD, API Spec, ERD, ADR
├── prisma/schema.prisma                # Database schema
├── scripts/test-integration.sh         # Spins up throwaway Postgres for CI
├── Dockerfile                          # Multi-stage build (standalone output)
└── docker-compose.yml                  # App + Postgres 18 (+ test profile)
```

---

## Documentation

Full documentation in `/docs`:
- `PRD.md` — Product requirements, personas, user stories, feature list
- `FRD.md` — Functional specifications per module, platform specs, character limits
- `API_SPEC.md` — Complete REST API in OpenAPI-style format
- `ERD.md` — Database schema with table definitions, relationships, indexes
- `ADR.md` — Architecture decisions: Next.js 16, Prisma v7, SSE streaming, PostgreSQL 18, OpenAI
