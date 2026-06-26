# Functional Requirements Document — AdForge AI

## Module 1: Campaign Brief

### 1.1 Input Fields

| Field | Type | Required | Validation |
|---|---|---|---|
| product_name | string | Yes | 1–100 chars |
| description | string | Yes | 10–1000 chars |
| landing_url | string | No | Valid URL format if provided |
| target_audience | string | Yes | 10–500 chars |
| campaign_goal | enum | Yes | `conversions` \| `clicks` \| `awareness` |
| tone | enum | Yes | `aggressive` \| `professional` \| `casual` |
| budget_range | string | No | Free text, e.g. "$5k/day" |
| platforms | array | Yes | At least 1 of: `google` \| `meta` \| `tiktok` \| `taboola` |
| variations_per_platform | integer | Yes | 3–10, default 5 |

### 1.2 Validation Rules

- `product_name`: Required. Trim whitespace. Max 100 chars.
- `description`: Required. Min 10 chars to ensure meaningful content. Max 1000 chars.
- `landing_url`: Optional. If provided, must match URL regex `^https?://`. Not validated for reachability.
- `target_audience`: Required. Min 10 chars. Free text describing demographics/psychographics.
- `campaign_goal`: Required. Enum — UI renders as radio group.
- `tone`: Required. Enum — affects AI prompt temperature and word choice directives.
- `platforms`: Required. At least one must be selected.
- `variations_per_platform`: Integer 3–10. Default 5.

### 1.3 Brief Templates

Pre-filled brief templates that populate all fields with sensible defaults:

**E-commerce Template**
- Goal: conversions
- Tone: aggressive
- Audience: "Online shoppers looking for [product category], price-conscious, mobile-first"
- Description: "[Product name] — [key benefit]. [Secondary benefit]. Limited-time offer."

**SaaS Template**
- Goal: clicks
- Tone: professional
- Audience: "B2B decision makers, SMB owners, frustrated with current tools"
- Description: "[Tool name] helps [target role] [key outcome] without [pain point]."

**Lead Gen Template**
- Goal: conversions
- Tone: professional
- Audience: "Adults 25–55 seeking [outcome], homeowners / professionals"
- Description: "Get [valuable free resource] — [specific benefit]. No credit card required."

**Affiliate Offer Template**
- Goal: clicks
- Tone: casual
- Audience: "Impulse buyers, deal-seekers, social media users"
- Description: "[Offer name] — [shocking/interesting claim]. [Social proof or urgency hook]."

---

## Module 2: Platform Configuration

### 2.1 Platform Selection

Multi-select UI — user can select any combination of the four platforms. At least one required.

### 2.2 Platform Format Specifications

#### Google Ads — Responsive Search Ads (RSA)

| Field | Count | Character Limit | Notes |
|---|---|---|---|
| headlines | 15 | 30 chars each | Google uses these combinatorially |
| descriptions | 4 | 90 chars each | Google selects 2 per impression |

**Character limit enforcement:** System prompt instructs model to count strictly. Post-generation validation trims or flags violations. UI shows red counter for any over-limit field.

#### Meta Ads

3 complete ad variants generated, each containing:

| Field | Character Limit | Notes |
|---|---|---|
| primary_text | 125 chars | First line must hook the scroll |
| headline | 40 chars | Below creative image/video |
| description | 30 chars | Optional but displayed on desktop |
| call_to_action | — | Enum: Shop Now, Learn More, Sign Up, Get Offer, Book Now |

#### TikTok Ads

Video-first format. Content written for spoken delivery:

| Field | Duration | Notes |
|---|---|---|
| hook | 0–3 seconds | Pattern interrupt; must stop scroll |
| body | 4–25 seconds | Value delivery, story, demo |
| cta | Last 5 seconds | Single clear action |
| on_screen_text | — | 3–5 text overlays as strings |

No hard character limit — but system enforces approximate word counts per time segment (~3 words/second for spoken content).

#### Taboola

| Field | Character Limit | Notes |
|---|---|---|
| headline | 60 chars | Curiosity gap, native-feel |
| body_text | 250 chars | Expands on headline |
| thumbnail_description | 150 chars | Brief for image selection |

### 2.3 Real-Time Character Counter

All text fields with character limits render an inline counter:
- `0 / 30` format
- Color states:
  - **Gray**: empty
  - **Green**: 1 to 89% of limit
  - **Yellow/Amber**: 90–99% of limit  
  - **Red**: at or over limit
- Fields at/over limit block form submission for brief; are flagged (not blocked) for AI output display

---

## Module 3: AI Creative Generation

### 3.1 Trigger

User clicks "Generate Creatives" from the brief page. Brief must be valid (all required fields, at least one platform).

### 3.2 Generation Flow

1. Brief saved to database (upsert)
2. POST to `/api/projects/:id/generate`
3. Server opens SSE stream
4. For each selected platform:
   - Send platform start event: `{ event: 'platform_start', data: { platform } }`
   - Call OpenAI with platform-specific prompt
   - Stream JSON tokens as they arrive
   - On complete JSON parse: save variation to DB, send variation event
   - Send platform complete event
5. On all platforms complete: send `done` event
6. Client closes SSE connection

### 3.3 Variation Count

Configurable per brief: 3–10 variations per platform. Default: 5.

For Google Ads: each "variation" is one complete RSA set (15 headlines + 4 descriptions). This is the standard atomic unit for Google RSA testing.

### 3.4 Regenerate Variation

`POST /api/projects/:id/variations/:variationId/regenerate`

- Re-runs the same platform prompt with brief context
- Produces a new variation
- Replaces the existing variation in DB
- Does not affect other variations

### 3.5 Regenerate Single Field

`POST /api/projects/:id/variations/:variationId/regenerate-field`

Body: `{ field: "headline_3" }` (for Google), `{ field: "primary_text" }` (for Meta)

- Sends targeted prompt to regenerate only that field
- Injects existing variation context so regenerated field is coherent
- Returns updated field value

### 3.6 Generation Status States

| State | UI Representation |
|---|---|
| `idle` | "Generate Creatives" button active |
| `generating` | Spinner + streaming indicator per platform |
| `streaming` | Variations appear one by one as cards |
| `complete` | All cards rendered, controls active |
| `error` | Error message with retry option |

---

## Module 4: Variation Management

### 4.1 View Layout

- Tab navigation per platform (Google \| Meta \| TikTok \| Taboola)
- Within each tab: grid of VariationCard components
- Default: 2-column grid on desktop, 1-column on mobile

### 4.2 VariationCard Contents

Renders all platform-specific fields. For Google RSA:
- All 15 headlines listed with individual character counters
- All 4 descriptions listed with counters

For Meta: primary text, headline, description, CTA — one per card.

### 4.3 Variation Actions

| Action | UI | Behavior |
|---|---|---|
| Star/Favorite | ⭐ icon toggle | Toggles `is_favorite`, persists to DB |
| Label | A/B/C/D dropdown | Sets `label` field, persists to DB |
| Add Note | Text input on expand | Sets `notes` field |
| Regenerate | 🔄 icon | Replaces this variation via API |
| Delete | 🗑️ icon | Soft delete from DB, removes from UI |
| Copy | 📋 icon | Copies all fields as formatted text to clipboard |

### 4.4 Compare Mode

- Toggle compare mode button in toolbar
- User selects exactly 2 variations (checkboxes appear)
- Side-by-side view replaces grid
- Field-by-field alignment for easy diff reading
- "Exit Compare" button returns to grid

### 4.5 Filtering & Sorting

- Filter: All \| Starred only
- Sort: Created (default) \| By label (A→D)

---

## Module 5: History & Projects

### 5.1 Projects List (Dashboard)

- Paginated list of all user projects
- Each item shows: project name, platforms, creation date, variation count, last updated
- Search by project name
- Filter by platform and date range
- Click to open project

### 5.2 Project States

| State | Description |
|---|---|
| `draft` | Brief started, not generated |
| `generated` | At least one generation run |
| `archived` | Soft-archived, hidden by default |

### 5.3 Actions on Project List

- Open project
- Duplicate project (clones brief, no variations)
- Archive project
- Delete project (hard delete, with confirmation)

### 5.4 Project Detail

- Shows brief summary at top
- Platform tabs with all variations
- "Edit Brief" button → returns to brief form (prompts for re-generation)
- "Generate More" → runs generation again with same brief, appends new variations

---

## Module 6: Export

### 6.1 Export Formats

#### CSV Export

One CSV per platform (or combined with platform column):

**Google Ads CSV** (compatible with Google Ads Editor):
```
Campaign,Ad Group,Headline 1,Headline 2,...,Headline 15,Description 1,...,Description 4,Final URL
```

**Meta Ads CSV:**
```
Campaign Name,Ad Set Name,Primary Text,Headline,Description,CTA,Status
```

**TikTok / Taboola CSV:**
```
Platform,Variation #,Field Name,Content,Character Count
```

#### JSON Export

Full structured JSON:
```json
{
  "project": { "id": "...", "name": "..." },
  "brief": { ... },
  "platforms": {
    "google": [ { "variation_id": "...", "headlines": [...], "descriptions": [...] } ],
    "meta": [ ... ]
  }
}
```

#### PDF Export

Formatted report:
- Cover page: project name, brief summary, generation date
- One section per platform with all variations rendered as cards
- Character counts shown
- Starred variations marked

### 6.2 Export Triggers

- "Export" button in toolbar → dropdown: CSV / JSON / PDF
- Individual card "Copy" button → copies that variation's text to clipboard
