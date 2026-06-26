# AdForge AI — AI-Powered Ad Creative Generator

Generate platform-native ad copy for **Google Ads, Meta Ads, TikTok Ads, and Taboola** in seconds — not hours.

---

## What does this tool do?

AdForge AI eliminates the copy bottleneck in performance marketing. You enter a campaign brief once — product name, target audience, goal, and tone — and AdForge generates ready-to-use ad variations for every platform you select, fully compliant with each platform's character limits and format requirements.

**Platform-specific outputs:**
- **Google Ads RSA:** 15 headlines (≤30 chars each) + 4 descriptions (≤90 chars each) — ready for Ads Editor import
- **Meta Ads:** 3 complete variants with primary text (≤125 chars), headline (≤40 chars), description (≤30 chars), and CTA
- **TikTok Ads:** Hook/body/CTA scripts written for spoken delivery with on-screen text suggestions
- **Taboola:** Native-feel curiosity-gap headlines (≤60 chars) with body and thumbnail descriptions

Every variation appears in real-time via streaming as it's generated. You can star favorites, assign A/B/C/D labels, add internal notes, compare two variations side-by-side, and export directly to CSV (formatted for Google Ads Editor and Meta Ads Manager), JSON, or PDF.

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

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI) |
| AI | OpenAI SDK v6, GPT-4o, streaming SSE |
| ORM | Prisma v7 with PostgreSQL 18 |
| Auth | jose JWT (httpOnly cookies, 7-day expiry) |
| Validation | Zod v4 |
| Forms | React Hook Form v7 |
| Export | papaparse (CSV) + jsPDF (PDF) |
| Package manager | pnpm |

---

## Getting Started

### Prerequisites
- Node.js ≥ 22
- pnpm ≥ 10
- Docker (for local PostgreSQL)
- OpenAI API key

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
JWT_SECRET=your-secret-at-least-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Project Structure

```
adforge-ai/
├── app/
│   ├── (auth)/login|register      # Auth pages
│   ├── dashboard/                 # Projects list
│   │   └── projects/[id]/
│   │       ├── brief/             # Brief form
│   │       └── creatives/         # Generated creatives + streaming
│   └── api/projects/[id]/
│       ├── brief/                 # Brief CRUD
│       ├── generate/              # SSE streaming generation endpoint
│       ├── variations/            # Star, label, notes, delete
│       └── export/                # CSV, JSON, PDF download
├── components/
│   ├── brief/                     # BriefForm, PlatformSelector
│   ├── creatives/                 # VariationCard, CharacterCounter
│   ├── export/                    # ExportMenu
│   └── shared/                    # StreamingIndicator
├── lib/
│   ├── ai/prompts/                # Per-platform engineered prompts
│   ├── db/                        # Prisma client singleton
│   ├── export/                    # csv.ts, json.ts, pdf.ts
│   └── validators/                # Zod schemas
├── docs/                          # PRD, FRD, API Spec, ERD, ADR
├── prisma/schema.prisma           # Database schema
└── docker-compose.yml             # Local PostgreSQL 18
```

---

## Documentation

Full documentation in `/docs`:
- `PRD.md` — Product requirements, personas, user stories, feature list
- `FRD.md` — Functional specifications per module, platform specs, character limits
- `API_SPEC.md` — Complete REST API in OpenAPI-style format
- `ERD.md` — Database schema with table definitions, relationships, indexes
- `ADR.md` — Architecture decisions: Next.js 16, Prisma v7, SSE streaming, PostgreSQL 18, OpenAI
