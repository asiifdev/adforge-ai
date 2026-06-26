# API Specification — AdForge AI

**Base URL:** `https://api.adforge.ai` (production) / `http://localhost:3000` (dev)  
**Version:** v1  
**Auth:** Bearer JWT token in `Authorization` header

---

## Authentication

### POST /api/auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "name": "string (required, 1-100 chars)"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string",
    "created_at": "ISO8601"
  },
  "token": "string (JWT)"
}
```

**Errors:**
- `400` — Validation error (invalid email, password too short)
- `409` — Email already registered

---

### POST /api/auth/login

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string"
  },
  "token": "string (JWT, expires 7d)"
}
```

**Errors:**
- `400` — Missing fields
- `401` — Invalid credentials

---

### POST /api/auth/logout

No body required. Invalidates token client-side (stateless JWT — just discard).

**Response 200:**
```json
{ "success": true }
```

---

### GET /api/auth/me

Returns the currently authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "created_at": "ISO8601"
}
```

**Errors:**
- `401` — Missing or invalid token

---

## Projects

### GET /api/projects

List all projects for the authenticated user.

**Query Params:**
- `page` — integer, default 1
- `per_page` — integer, default 20, max 100
- `search` — string, filters by project name
- `platform` — enum: `google|meta|tiktok|taboola`
- `status` — enum: `draft|generated|archived`

**Response 200:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "string",
      "status": "draft|generated|archived",
      "platforms": ["google", "meta"],
      "variation_count": 15,
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

---

### POST /api/projects

Create a new project.

**Request Body:**
```json
{
  "name": "string (required, 1-100 chars)"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "name": "string",
  "status": "draft",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**Errors:**
- `400` — Validation error

---

### GET /api/projects/:id

Get full project with brief and variation summary.

**Response 200:**
```json
{
  "id": "uuid",
  "name": "string",
  "status": "string",
  "brief": {
    "id": "uuid",
    "product_name": "string",
    "description": "string",
    "landing_url": "string|null",
    "target_audience": "string",
    "goal": "conversions|clicks|awareness",
    "tone": "aggressive|professional|casual",
    "budget_range": "string|null",
    "platforms": ["google", "meta"],
    "variations_per_platform": 5
  },
  "variation_counts": {
    "google": 5,
    "meta": 5,
    "tiktok": 0,
    "taboola": 5
  },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**Errors:**
- `404` — Project not found or not owned by user

---

### PATCH /api/projects/:id

Update project metadata.

**Request Body:**
```json
{
  "name": "string (optional)",
  "status": "draft|generated|archived (optional)"
}
```

**Response 200:** Updated project object (same schema as GET /api/projects/:id)

**Errors:**
- `400` — Validation error
- `404` — Not found

---

### DELETE /api/projects/:id

Hard delete project and all associated data.

**Response 200:**
```json
{ "success": true }
```

**Errors:**
- `404` — Not found

---

## Briefs

### POST /api/projects/:id/brief

Save or update the brief for a project.

**Request Body:**
```json
{
  "product_name": "string (required, 1-100 chars)",
  "description": "string (required, 10-1000 chars)",
  "landing_url": "string (optional, valid URL)",
  "target_audience": "string (required, 10-500 chars)",
  "goal": "conversions|clicks|awareness (required)",
  "tone": "aggressive|professional|casual (required)",
  "budget_range": "string (optional)",
  "platforms": ["google|meta|tiktok|taboola"] (required, min 1),
  "variations_per_platform": "integer (required, 3-10)"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "product_name": "string",
  "description": "string",
  "landing_url": "string|null",
  "target_audience": "string",
  "goal": "string",
  "tone": "string",
  "budget_range": "string|null",
  "platforms": ["google", "meta"],
  "variations_per_platform": 5,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**Errors:**
- `400` — Validation error
- `404` — Project not found

---

### GET /api/projects/:id/brief

**Response 200:** Brief object (same schema as above)

**Errors:**
- `404` — Project or brief not found

---

## Generation

### POST /api/projects/:id/generate

Trigger AI creative generation. Returns a Server-Sent Events (SSE) stream.

**Headers:**
```
Accept: text/event-stream
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "platforms": ["google", "meta"] // optional — defaults to platforms in brief
}
```

**SSE Event Stream Format:**

```
event: platform_start
data: {"platform": "google"}

event: variation
data: {"platform": "google", "variation": { ...variation object... }, "index": 0}

event: platform_complete
data: {"platform": "google", "count": 5}

event: platform_start
data: {"platform": "meta"}

event: variation
data: {"platform": "meta", "variation": { ...variation object... }, "index": 0}

event: platform_complete
data: {"platform": "meta", "count": 5}

event: done
data: {"total_variations": 10, "duration_ms": 4200}

event: error
data: {"message": "string", "platform": "google (optional)"}
```

**Variation Object (Google):**
```json
{
  "id": "uuid",
  "platform": "google",
  "content": {
    "headlines": ["string x15"],
    "descriptions": ["string x4"]
  },
  "is_favorite": false,
  "label": null,
  "notes": null,
  "position": 0
}
```

**Variation Object (Meta):**
```json
{
  "id": "uuid",
  "platform": "meta",
  "content": {
    "primary_text": "string",
    "headline": "string",
    "description": "string",
    "call_to_action": "Shop Now|Learn More|Sign Up|Get Offer|Book Now"
  }
}
```

**Variation Object (TikTok):**
```json
{
  "id": "uuid",
  "platform": "tiktok",
  "content": {
    "hook": "string (0-3s script)",
    "body": "string (4-25s script)",
    "cta": "string (last 5s)",
    "on_screen_text": ["string x3-5"]
  }
}
```

**Variation Object (Taboola):**
```json
{
  "id": "uuid",
  "platform": "taboola",
  "content": {
    "headline": "string (≤60 chars)",
    "body_text": "string (≤250 chars)",
    "thumbnail_description": "string (≤150 chars)"
  }
}
```

**Errors:**
- `400` — No brief found for project
- `404` — Project not found
- `500` — AI generation error (sent as SSE error event)

---

### POST /api/projects/:id/variations/:variationId/regenerate

Regenerate a single variation.

**Request Body:** (optional overrides)
```json
{
  "tone": "aggressive|professional|casual"
}
```

**Response 200:** Full variation object (same schema as SSE variation event)

**Errors:**
- `404` — Variation not found

---

### POST /api/projects/:id/variations/:variationId/regenerate-field

Regenerate a single field within a variation.

**Request Body:**
```json
{
  "field": "string (e.g. 'headline_3', 'primary_text', 'hook')"
}
```

**Response 200:**
```json
{
  "field": "string",
  "value": "string",
  "character_count": 28
}
```

**Errors:**
- `400` — Unknown field for platform
- `404` — Variation not found

---

## Variations

### GET /api/projects/:id/variations

List all variations for a project.

**Query Params:**
- `platform` — filter by platform
- `is_favorite` — boolean filter
- `label` — filter by label (A/B/C/D)

**Response 200:**
```json
{
  "variations": [
    {
      "id": "uuid",
      "platform": "google|meta|tiktok|taboola",
      "content": { ... },
      "is_favorite": false,
      "label": "A|B|C|D|null",
      "notes": "string|null",
      "position": 0,
      "created_at": "ISO8601"
    }
  ]
}
```

---

### PATCH /api/projects/:id/variations/:variationId

Update variation metadata (star, label, notes).

**Request Body:**
```json
{
  "is_favorite": "boolean (optional)",
  "label": "A|B|C|D|null (optional)",
  "notes": "string|null (optional, max 1000 chars)"
}
```

**Response 200:** Updated variation object

**Errors:**
- `400` — Validation error
- `404` — Variation not found

---

### DELETE /api/projects/:id/variations/:variationId

Delete a variation.

**Response 200:**
```json
{ "success": true }
```

**Errors:**
- `404` — Variation not found

---

## Export

### GET /api/projects/:id/export

Export all variations in the requested format.

**Query Params:**
- `format` — required: `csv|json|pdf`
- `platform` — optional: filter to one platform
- `favorites_only` — boolean, default false

**Response (CSV):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="adforge-{project-name}-{date}.csv"
```

**Response (JSON):**
```
Content-Type: application/json
Content-Disposition: attachment; filename="adforge-{project-name}-{date}.json"
```

**Response (PDF):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="adforge-{project-name}-{date}.pdf"
```

**Errors:**
- `400` — Invalid format
- `404` — Project not found or no variations to export

---

## Common Error Response Format

All error responses use this schema:

```json
{
  "error": {
    "code": "VALIDATION_ERROR|NOT_FOUND|UNAUTHORIZED|INTERNAL_ERROR",
    "message": "Human-readable description",
    "details": { } // optional: field-level validation errors
  }
}
```

## Rate Limiting

- Generation endpoint: 10 requests/minute per user
- All other endpoints: 100 requests/minute per user
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
