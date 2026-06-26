# Product Requirements Document — AdForge AI

## 1. Product Vision

AdForge AI is a production-grade ad creative generation platform purpose-built for performance marketing teams. It transforms a campaign brief into platform-native ad copy — across Google Ads, Meta Ads, TikTok Ads, and Taboola — in seconds, not hours.

**Mission:** Eliminate the copy bottleneck in performance marketing by generating spec-compliant, high-converting ad variations at scale.

---

## 2. Problem Statement

Performance and affiliate marketers must maintain active A/B tests across 4+ ad platforms simultaneously. Each platform has entirely different copy formats, character limits, tone requirements, and creative conventions. A media buyer running a campaign across all four platforms needs:

- 15 RSA headlines + 4 descriptions (Google)
- 3 full ad variants with primary text, headline, description (Meta)
- Hook/body/CTA scripts written for spoken video (TikTok)
- Native-feel curiosity-gap headlines (Taboola)

Doing this manually takes 2–4 hours per campaign. Using generic AI tools (ChatGPT) produces copy that ignores platform specs, blows character limits, and requires manual reformatting. Agencies and affiliate teams have no purpose-built tool that understands platform constraints at the prompt engineering level.

---

## 3. Target Users & Personas

### Persona 1: Media Buyer — "Alex"
- Manages 10–30 active campaigns across platforms
- Primary goal: ship more tests faster, kill losers, scale winners
- Pain point: writing copy per platform from scratch every launch
- Tech comfort: high — uses Ads Editor, works in spreadsheets, comfortable with SaaS tools

### Persona 2: Creative Strategist — "Jordan"
- Owns the creative angle and messaging framework
- Primary goal: test many angles quickly to identify top performers
- Pain point: translating a creative angle into platform-specific formats
- Tech comfort: medium-high — thinks in frameworks, not ad specs

### Persona 3: Affiliate Marketer — "Sam"
- Runs solo or small team, manages own budget
- Primary goal: fast launches on tight timeline and budget
- Pain point: no dedicated copywriter, must do it all themselves
- Tech comfort: high — scrappy, tool-literate, moves fast

---

## 4. Core Use Cases

1. **Brief → Multi-Platform Copy**: Enter a product brief once, generate ready-to-use copy for all selected platforms in under 60 seconds.
2. **Angle Iteration**: Test 5–10 creative angles per platform without writing each from scratch.
3. **Platform Switch**: Adapt winning copy from one platform to another format with one click.
4. **Creative Management**: Star, label, annotate, and compare variations before pushing to ad managers.
5. **Export for Ad Managers**: Download CSV formatted for Google Ads Editor or Meta Ads Manager bulk import.

---

## 5. User Stories

- As a media buyer, I can enter a product brief and select target platforms so that I get platform-compliant ad copy without manual formatting.
- As a media buyer, I can regenerate a single variation without losing my other approved variations.
- As a creative strategist, I can generate 10 variations per platform to rapidly identify the strongest angles.
- As a media buyer, I can star my favorite variations and label them A/B/C for split testing.
- As a media buyer, I can download a CSV that I can directly import into Google Ads Editor.
- As an affiliate marketer, I can save my campaigns as projects and return to them later.
- As a team lead, I can export a formatted PDF of all creative for client presentation.

---

## 6. Feature List

### MVP Features

| Feature | Priority | Notes |
|---|---|---|
| Campaign brief form | P0 | Product name, audience, goal, tone, platforms |
| Google Ads RSA generation | P0 | 15 headlines, 4 descriptions, strict char limits |
| Meta Ads generation | P0 | 3 variants with all fields |
| TikTok Ads generation | P0 | Hook/body/CTA script format |
| Taboola generation | P0 | Native-style headlines and body |
| Platform character count validation | P0 | Real-time with color coding |
| Streaming generation (SSE) | P0 | Variations appear as generated |
| Regenerate individual variation | P0 | Without affecting others |
| Star/label/notes on variation | P1 | Workflow management |
| Export CSV | P1 | Google Ads and Meta formats |
| Export JSON | P1 | Structured raw data |
| Project save/load | P1 | Persist and continue work |
| Compare mode (2 variations) | P1 | Side-by-side diff view |
| Auth (register/login) | P0 | JWT-based, simple |
| Export PDF | P2 | Formatted report |
| Brief templates | P2 | E-commerce, SaaS, lead gen presets |
| Duplicate project | P2 | Clone as starting point |

### V2 Features (Out of Scope for MVP)

- Direct Google Ads / Meta Ads API push
- Performance feedback loop (import CTR data)
- Team workspaces and approval flows
- Creative scoring / CTR prediction
- Image brief generator for creative teams
- Multi-language ad generation

---

## 7. Success Metrics

| Metric | Target |
|---|---|
| Time to first creative set | < 60 seconds |
| Variations per session | ≥ 10 average |
| Project save rate | > 70% of sessions |
| Export rate | > 50% of completed sessions |
| D7 retention | > 40% |
| Character limit violations in output | 0% (enforced by system) |

---

## 8. Constraints & Assumptions

- Users have their own OpenAI API key OR the platform provides shared access (MVP: platform-provided)
- No image generation in MVP — copy only
- Authentication is simple JWT — no OAuth in MVP
- PostgreSQL hosted locally in dev; production deployment to Vercel + managed Postgres (Neon/Supabase)
- No billing/subscription in MVP — assume internal tool or free tier

---

## 9. Out of Scope for MVP

- Mobile native app (responsive web is sufficient)
- Direct ad platform API integration (push to Google/Meta)
- Team collaboration / multi-user workspaces
- Creative performance analytics
- Custom AI model fine-tuning
- White-labeling
