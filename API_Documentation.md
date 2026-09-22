# Lyra Content Agent — API Integration Guide

**Version:** 1.0.0
**Base URL:** `https://lyra-content-agent.vercel.app`
**Full-stack app API prefix:** `/api` (for example, `https://lyra-content-agent.vercel.app/api/files`)
**Protocol:** REST / JSON
**Authentication:** None required

---

## Overview

The Lyra Content Agent API provides two core systems that you can integrate into any frontend or backend application:

1. **Files & Docs Module** — A media library with upload tracking and content moderation
2. **AI-Assisted Content Creation** — LLM-powered post generation, hashtag suggestions, and media recommendations

The API is deployed and live — no setup required. Just send HTTP requests to the base URL.

---

## Quick Test

Verify the API is reachable:

```bash
curl https://lyra-content-agent.vercel.app/health
```

```json
{
  "success": true,
  "message": "API is healthy"
}
```

---

## Response Format

All endpoints return a standard shape:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

---

## Files & Docs Module

### Create File

Initiates a file upload record. The file enters the moderation pipeline with status `upload_initiated`.

```
POST https://lyra-content-agent.vercel.app/files
```

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Original filename |
| `type` | string | Yes | One of: `image`, `video`, `audio`, `document` |
| `size` | number | Yes | File size in bytes (minimum 0) |
| `url` | string | Yes | Storage URL (simulated S3 path) |
| `tags` | string[] | No | Array of tags for recommendation matching |

**Note:** Clients cannot set the `status` field. All new files start as `upload_initiated` to prevent moderation bypass.

**Example:**

```bash
curl -X POST https://lyra-content-agent.vercel.app/files \
  -H "Content-Type: application/json" \
  -d '{
    "name": "product-launch.png",
    "type": "image",
    "size": 204800,
    "url": "https://s3.example.com/files/product-launch.png",
    "tags": ["product", "launch", "marketing"]
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "69f...",
    "name": "product-launch.png",
    "type": "image",
    "size": 204800,
    "url": "https://s3.example.com/files/product-launch.png",
    "tags": ["product", "launch", "marketing"],
    "status": "upload_initiated",
    "uploadDate": "2026-04-30T10:00:00.000Z",
    "createdAt": "2026-04-30T10:00:00.000Z",
    "updatedAt": "2026-04-30T10:00:00.000Z"
  }
}
```

---

### List Files

Returns a list of files with moderation filtering.

```
GET https://lyra-content-agent.vercel.app/files
```

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `type` | string | Filter by file type: `image`, `video`, `audio`, `document` |
| `status` | string | Filter by moderation status. Omit for user-facing calls to get only approved files |

**Default behavior (no status param):** Returns only `approved` files.

**Examples:**

```bash
# User-facing (approved only)
curl "https://lyra-content-agent.vercel.app/files"

# Filter by type
curl "https://lyra-content-agent.vercel.app/files?type=image"

# Admin view — specific status
curl "https://lyra-content-agent.vercel.app/files?status=approved"
curl "https://lyra-content-agent.vercel.app/files?status=rejected"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "69f...",
      "name": "product-launch.png",
      "type": "image",
      "size": 204800,
      "url": "https://s3.example.com/files/product-launch.png",
      "tags": ["product", "launch", "marketing"],
      "uploadDate": "2026-04-30T10:00:00.000Z",
      "status": "approved",
      "moderationReason": null,
      "createdAt": "2026-04-30T10:00:00.000Z",
      "updatedAt": "2026-04-30T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Update File Status

Simulates a moderation pipeline outcome. Transitions a file to `approved` or `rejected`.

```
PATCH https://lyra-content-agent.vercel.app/files/:id/status
```

**URL parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | MongoDB ObjectId of the file |

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | One of: `approved`, `rejected` |
| `moderationReason` | string | Required if rejected | Reason for rejection |

**Examples:**

```bash
# Approve a file
curl -X PATCH https://lyra-content-agent.vercel.app/files/69f.../status \
  -H "Content-Type: application/json" \
  -d '{ "status": "approved" }'

# Reject a file
curl -X PATCH https://lyra-content-agent.vercel.app/files/69f.../status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "moderationReason": "Content violates community guidelines"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "69f...",
    "name": "product-launch.png",
    "status": "approved",
    "moderationReason": null,
    "updatedAt": "2026-04-30T10:00:00.000Z"
  }
}
```

**Errors:**
- `404 NOT_FOUND` — File ID does not exist
- `400 VALIDATION_ERROR` — Missing `moderationReason` when status is `rejected`, or invalid status value

---

## AI Module

### Generate Post

Generates social media post content from a user prompt using LLM (OpenRouter / OpenAI GPT-OSS-120B).

```
POST https://lyra-content-agent.vercel.app/ai/generate-post
```

**Request body:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | Yes | — | Content description (minimum 10 characters) |
| `tone` | string | No | `professional` | One of: `professional`, `casual`, `excited` |
| `variations` | number | No | `3` | Number of variations to generate (max 5) |

**Examples:**

```bash
curl -X POST https://lyra-content-agent.vercel.app/ai/generate-post \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a post about our new AI-powered product launch for small businesses",
    "tone": "professional",
    "variations": 2
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "primary": "We're excited to introduce our new AI-powered platform designed specifically for small businesses...",
    "variations": [
      "Meet the future of small business growth: our AI-driven tool automates routine tasks...",
      "Unlock your business potential with our latest AI-powered solution..."
    ],
    "hashtags": [
      "#AIforBusiness",
      "#SmallBizTech",
      "#Innovation",
      "#GrowthTools"
    ]
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` — Prompt is too short (less than 10 characters)
- `503 AI_UNAVAILABLE` — AI service is temporarily unavailable
- `504 AI_TIMEOUT` — The request took too long (default 15s timeout)

---

### Suggest Hashtags

Generates hashtag suggestions from existing post content.

```
POST https://lyra-content-agent.vercel.app/ai/suggest-hashtags
```

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `postContent` | string | Yes | The post text to extract hashtags from |

**Examples:**

```bash
curl -X POST https://lyra-content-agent.vercel.app/ai/suggest-hashtags \
  -H "Content-Type: application/json" \
  -d '{
    "postContent": "We are launching a revolutionary new cloud platform that helps teams collaborate in real-time with AI-powered insights"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "hashtags": [
      "#CloudPlatform",
      "#AICollaboration",
      "#RealTimeTeamwork",
      "#TechInnovation",
      "#FutureOfWork",
      "#AIInsights",
      "#CollaborationTools",
      "#CloudComputing"
    ]
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` — `postContent` is empty
- `503 AI_UNAVAILABLE` — AI service is temporarily unavailable
- `504 AI_TIMEOUT` — The request took too long

---

### Recommend Media

Returns a ranked list of approved media files relevant to a given post. Uses keyword matching between post content and file names/tags.

```
POST https://lyra-content-agent.vercel.app/ai/recommend-media
```

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `postContent` | string | Yes | The post content to match against (minimum 10 characters) |

**Examples:**

```bash
curl -X POST https://lyra-content-agent.vercel.app/ai/recommend-media \
  -H "Content-Type: application/json" \
  -d '{
    "postContent": "Product launch marketing campaign announcement"
  }'
```

**Response (200) — Matched files:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "file": {
          "id": "69f...",
          "name": "product-launch-campaign.png",
          "type": "image",
          "size": 204800,
          "url": "https://s3.example.com/files/product-launch-campaign.png",
          "tags": ["product", "launch", "marketing", "campaign"],
          "uploadDate": "2026-04-30T10:00:00.000Z",
          "status": "approved",
          "moderationReason": null,
          "createdAt": "...",
          "updatedAt": "..."
        },
        "score": 4,
        "matchReason": "File tags/name match post keywords: product, launch, marketing, campaign"
      }
    ],
    "totalMatched": 1
  }
}
```

**Response (200) — No approved files:**
```json
{
  "success": true,
  "data": {
    "recommendations": [],
    "message": "No approved media files are available in the library."
  }
}
```

**Response (200) — No relevant matches:**
```json
{
  "success": true,
  "data": {
    "recommendations": [],
    "message": "No files matched the content of this post."
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` — `postContent` is too short (less than 10 characters)

**Note:** Only `approved` files are ever returned in recommendations. Rejected and pending files are excluded.

---

## Error Reference

| HTTP Code | Error Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid or missing request data |
| 404 | `NOT_FOUND` | Resource does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 500 | `DB_ERROR` | Database operation failed |
| 503 | `AI_UNAVAILABLE` | AI service temporarily unavailable |
| 504 | `AI_TIMEOUT` | AI request exceeded timeout |

---

## File Moderation States

| Status | Visible to user | Eligible for recommendations |
|---|---|---|
| `upload_initiated` | No | No |
| `scan_in_progress` | No | No |
| `approved` | Yes | Yes |
| `rejected` | No | No |

The moderation workflow is one-directional:

```
upload_initiated → scan_in_progress → approved
                                     → rejected
```

---

## Endpoint Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/files` | Create file record |
| `GET` | `/files` | List files (approved only by default) |
| `PATCH` | `/files/:id/status` | Update file moderation status |
| `POST` | `/ai/generate-post` | Generate AI post content |
| `POST` | `/ai/suggest-hashtags` | Suggest hashtags from content |
| `POST` | `/ai/recommend-media` | Recommend media for post |
| `POST` | `/agent/generate/:fileId` | Ask the content agent to draft a package for a file |
| `GET` | `/agent/proposals` | List content proposals (filter by `status`, `userId`) |
| `GET` | `/agent/proposals/:id` | Fetch a single content proposal |
| `POST` | `/agent/proposals/:id/approve` | Approve a pending proposal |
| `POST` | `/agent/proposals/:id/reject` | Reject a proposal (optional `feedback`) |
| `POST` | `/agent/proposals/:id/regenerate` | Ask the agent to redraft with optional `instructions` |

---

## Autonomous Content Agent Module

When media is uploaded, the only things a creator provides are the asset, a description and tags.
Once the file passes moderation (status `approved`), the content agent **initiates on its own** and
drafts a complete content package: a narrative **angle**, a short **caption**, the full **write-up**,
**hashtags**, and a one-line **preview** for a human reviewer. The creator previews the package and
**approves or rejects** it — no manual prompt engineering needed.

### POST /agent/generate/:fileId

Ask the agent to draft (or redraft) a content package for a specific media file.

```bash
curl -X POST http://localhost:3000/agent/generate/<fileId> \
  -H "Content-Type: application/json" \
  -d '{ "userId": "web-user", "instructions": "Keep it playful" }'
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "proposal-id",
    "fileId": "file-id",
    "angle": "Behind-the-scenes culture story",
    "caption": "The people behind the product, in 30 seconds.",
    "writeUp": "We talk a lot about product. Today we are talking about the team...",
    "hashtags": ["#BehindTheScenes", "#Culture", "#TeamLife"],
    "previewText": "A culture-focused video post showing the team behind the product.",
    "status": "pending",
    "modelUsed": "openai/gpt-oss-120b:free",
    "generationSource": "ai"
  }
}
```

### GET /agent/proposals

```bash
curl "http://localhost:3000/agent/proposals?status=pending"
```

### POST /agent/proposals/:id/approve

Marks the proposal `approved` and stamps `reviewedAt`.

### POST /agent/proposals/:id/reject

```bash
curl -X POST http://localhost:3000/agent/proposals/<id>/reject \
  -H "Content-Type: application/json" \
  -d '{ "feedback": "Too formal for our audience" }'
```

### POST /agent/proposals/:id/regenerate

```bash
curl -X POST http://localhost:3000/agent/proposals/<id>/regenerate \
  -H "Content-Type: application/json" \
  -d '{ "instructions": "Focus on the launch date" }'
```

### Auto‑kickoff

Approved media automatically triggers an agent run when `AUTO_AGENT_ENABLED=true` (skipped in
`NODE_ENV=test`). The event is scheduled asynchronously so the upload/moderation response is never blocked.
The agent uses the model router with the same 3‑stage fallback (primary → fallback model → deterministic
template) and every call is written to the `AiLog` collection (`requestType: "agent"`).

### Lifecycle

```
upload → moderation (approved) → agent drafts package → pending
  → approve → ready to publish
  → reject  → (optional feedback) → regenerate → pending
```
