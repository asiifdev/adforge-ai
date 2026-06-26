# Entity Relationship Document — AdForge AI

## Text-Based ERD Diagram

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│    users    │──1:N──│   projects   │──1:1──│    briefs    │
└─────────────┘       └──────────────┘       └──────────────┘
                              │
                             1:N
                              │
                       ┌──────────────┐
                       │ creative_sets│
                       └──────────────┘
                              │
                             1:N
                              │
                       ┌──────────────┐
                       │  variations  │
                       └──────────────┘

                       ┌──────────────────┐
                       │  generation_logs  │
                       └──────────────────┘
                              │
                              N:1
                              │
                       ┌──────────────┐
                       │   projects   │
                       └──────────────┘
```

---

## Table Definitions

### `users`

Stores authenticated user accounts.

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**Constraints:**
- `email` must be unique (enforced at DB level)
- `password_hash` stores bcrypt hash, never plaintext

---

### `projects`

A project is the top-level container for a campaign brief and its generated creatives.

```sql
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'generated', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
CREATE INDEX idx_projects_updated ON projects(user_id, updated_at DESC);
```

**Constraints:**
- Cascade delete: deleting a user removes all their projects
- `status` is an enum enforced by CHECK constraint

---

### `briefs`

Stores the campaign brief linked to a project. One-to-one with projects (upsert pattern).

```sql
CREATE TABLE briefs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  product_name            TEXT NOT NULL,
  description             TEXT NOT NULL,
  landing_url             TEXT,
  target_audience         TEXT NOT NULL,
  goal                    TEXT NOT NULL CHECK (goal IN ('conversions', 'clicks', 'awareness')),
  tone                    TEXT NOT NULL CHECK (tone IN ('aggressive', 'professional', 'casual')),
  budget_range            TEXT,
  platforms               TEXT[] NOT NULL,
  variations_per_platform INTEGER NOT NULL DEFAULT 5 CHECK (variations_per_platform BETWEEN 3 AND 10),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_briefs_project_id ON briefs(project_id);
```

**Constraints:**
- `UNIQUE` on `project_id` enforces 1:1 relationship with projects
- `platforms` stored as TEXT[] (Postgres array); validated at application layer to only contain known values
- `variations_per_platform` bounded by CHECK

---

### `creative_sets`

Groups all variations generated in a single generation run for a specific platform.

```sql
CREATE TABLE creative_sets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  brief_id     UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL CHECK (platform IN ('google', 'meta', 'tiktok', 'taboola')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creative_sets_project ON creative_sets(project_id);
CREATE INDEX idx_creative_sets_platform ON creative_sets(project_id, platform);
```

**Notes:**
- A project can have multiple creative sets per platform (user can re-generate)
- Each generation run creates one creative_set per platform

---

### `variations`

Stores individual generated ad variations. Content is platform-specific and stored as JSONB.

```sql
CREATE TABLE variations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_set_id UUID NOT NULL REFERENCES creative_sets(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN ('google', 'meta', 'tiktok', 'taboola')),
  content         JSONB NOT NULL,
  is_favorite     BOOLEAN NOT NULL DEFAULT FALSE,
  label           TEXT CHECK (label IN ('A', 'B', 'C', 'D') OR label IS NULL),
  notes           TEXT,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variations_creative_set ON variations(creative_set_id);
CREATE INDEX idx_variations_platform ON variations(creative_set_id, platform);
CREATE INDEX idx_variations_favorites ON variations(creative_set_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_variations_content ON variations USING GIN(content);
```

**JSONB Content Schemas by Platform:**

Google Ads:
```json
{
  "headlines": ["string", "...", "(15 total)"],
  "descriptions": ["string", "...", "(4 total)"]
}
```

Meta Ads:
```json
{
  "primary_text": "string",
  "headline": "string",
  "description": "string",
  "call_to_action": "Shop Now"
}
```

TikTok Ads:
```json
{
  "hook": "string",
  "body": "string",
  "cta": "string",
  "on_screen_text": ["string", "string", "string"]
}
```

Taboola:
```json
{
  "headline": "string",
  "body_text": "string",
  "thumbnail_description": "string"
}
```

**Constraints:**
- `content` validated at application layer before insert
- `label` is nullable (no label assigned)
- Partial index on `is_favorite` for performance on starred filter

---

### `generation_logs`

Audit log of every generation run for cost tracking and debugging.

```sql
CREATE TABLE generation_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  model_used  TEXT NOT NULL,
  platform    TEXT NOT NULL,
  tokens_used INTEGER,
  duration_ms INTEGER,
  status      TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  error_msg   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generation_logs_project ON generation_logs(project_id);
CREATE INDEX idx_generation_logs_created ON generation_logs(created_at DESC);
```

---

## Relationships Summary

| Relationship | Type | Cascade |
|---|---|---|
| users → projects | 1:N | DELETE CASCADE |
| projects → briefs | 1:1 | DELETE CASCADE |
| projects → creative_sets | 1:N | DELETE CASCADE |
| briefs → creative_sets | 1:N | DELETE CASCADE |
| creative_sets → variations | 1:N | DELETE CASCADE |
| projects → generation_logs | 1:N | DELETE CASCADE |

---

## Drizzle ORM Schema Notes

All tables will be defined in `lib/db/schema.ts` using Drizzle's schema DSL:
- UUIDs use `uuid('id').primaryKey().defaultRandom()`
- Timestamps use `timestamp('created_at', { withTimezone: true }).defaultNow().notNull()`
- JSONB fields use `jsonb('content').notNull()`
- Text arrays use `text('platforms').array().notNull()`
- All FK relationships defined with Drizzle's `references()` with `onDelete: 'cascade'`
