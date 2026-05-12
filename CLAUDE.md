# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Server (Express backend)
cd server && npm run dev          # Dev server with hot reload (tsx watch) on :3001
cd server && npm run build        # Compile TypeScript to dist/
cd server && npx tsc --noEmit     # Type-check only

# Client (React frontend)
cd client && npm run dev          # Vite dev server on :5173 (proxies /api to :3001)
cd client && npm run build        # Type-check + Vite production build
cd client && npx tsc --noEmit     # Type-check only
```

Both must run simultaneously for development. The Vite dev server proxies `/api` requests to the Express backend (configured in `client/vite.config.ts`).

## Architecture

**Monorepo with two independent packages** — `client/` and `server/` — each with their own `package.json` and `tsconfig.json`. No shared package; types are duplicated in `client/src/types/index.ts` and `server/src/types/index.ts`.

### Generation Pipeline

1. User submits `CampaignBrief` + uploaded `AssetUpload[]` + `MissingAsset[]` text descriptions
2. `POST /api/generate` route orchestrates per-product:
   - **Missing assets first:** For each `MissingAsset`, generate a standalone image via GPT-Image-1 → save to S3 under `missing-assets/`
   - **Hero images:** Generate 3 aspect ratios (1:1, 9:16, 16:9) using the brief prompt + all uploaded/generated assets as input references
3. Generation logs saved to S3 as `generation-log.json` alongside images and to `server/logs/generation.log` locally

### Key Service Files

- `server/src/services/openai.ts` — GPT-Image-1 via Responses API (not chat completions). Uses message-based input with `role: 'user'` containing `input_image` + `input_text` content parts. Size mapping: 1:1→1024x1024, 9:16→1024x1536, 16:9→1536x1024.
- `server/src/services/promptBuilder.ts` — Converts `CampaignBrief` into image generation prompts. Includes instructions for brand logo + campaign message overlay at bottom.
- `server/src/services/s3.ts` — S3 key structure: `generated/{brand}/{product}/{timestamp}/{ratio}/image.png`. Brand/product names sanitized (lowercase, hyphens, no special chars).

### Frontend State

All state lives in `App.tsx` via `useState` — no Redux or Context. The flow is: `BriefForm` → `App.handleGenerate` → API call → `ImagePreview` renders results → `ImageEditor` modal for regeneration.

### Custom Tailwind Components

Defined in `client/src/index.css` as `@layer components`: `.card`, `.input-field`, `.textarea-field`, `.select-field`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.label`, `.section-title`. Use these instead of inline Tailwind for form elements.

## Environment

Server requires `server/.env` (see `server/.env.example`): `OPENAI_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `PORT`.

Both packages use ES Modules and TypeScript strict mode. Server imports use `.js` extensions (required for ESM).
