# Spark the GenAI Ad Maker — Technical Overview

## What It Does

Spark the GenAI Ad Maker is an AI-powered tool that generates social media ad images from a campaign brief. Give it your brand details, product info, and assets — it produces ready-to-use ads in three formats: Feed (1:1), Stories/Reels (9:16), and Landscape (16:9).

---

## Server (Node.js + Express)

The backend orchestrates the entire generation pipeline.

### API Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/upload` | Upload brand logos, product images, or reference images |
| `POST /api/generate` | Run the full image generation pipeline |
| `GET /api/images/:key` | Get a signed download URL for any generated image |

### Generation Pipeline

When a user hits "Generate," the server runs a two-stage process **per product**:

**Stage 1 — Fill Missing Assets**
If the user described a product image in text instead of uploading one (e.g., *"a red sneaker on white background"*), the system generates that image first using OpenAI's GPT-Image-1 model.

**Stage 2 — Generate Hero Ads**
Using all uploaded + generated assets as visual references, the system creates 3 ad images per product:
- **1:1** (1024×1024) — Instagram/Facebook feed
- **9:16** (1024×1536) — Stories & Reels
- **16:9** (1536×1024) — YouTube/landscape placements

Each ad includes the product centered in the frame, with a branded bar at the bottom containing the logo, campaign message, and CTA.

### Key Services

- **OpenAI Service** — Calls GPT-Image-1 for image generation and editing. Uses reference images as visual context when available.
- **Prompt Builder** — Converts the campaign brief (brand, audience, tone, colors, guidelines) into detailed image generation prompts.
- **S3 Service** — Stores all generated images in AWS S3 with organized keys: `generated/{brand}/{product}/{timestamp}/{ratio}/image.png`. Returns signed URLs for secure access.

### Logging

Every generation is logged with full details (prompts, timing, errors) both to S3 (`generation-log.json`) and locally (`server/logs/generation.log`).

---

## Client (React + TypeScript + Vite)

A single-page app with a guided workflow.

### User Flow

1. **Campaign Brief** — Enter brand name, campaign message, goal, target audience, tone, and color palette
2. **Upload Assets** — Upload brand logo and reference images; upload or describe product images
3. **Generate** — One click kicks off the full pipeline
4. **Review** — View all generated ads in a grid with download options
5. **Edit & Regenerate** — Click any image to tweak the prompt and regenerate

### Architecture

- All state managed in `App.tsx` via React `useState` — no external state library
- Components: `BriefForm` → `AssetUploader` → `ProductForm` → `ImagePreview` → `ImageEditor`
- Custom Tailwind component classes (`.card`, `.btn-primary`, `.input-field`, etc.) for consistent dark-themed UI
- Vite dev server proxies `/api` requests to the Express backend

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express, TypeScript |
| AI Model | OpenAI GPT-Image-1 (Responses API) |
| Storage | AWS S3 (signed URLs) |
| Dev | ESM modules, strict TypeScript, hot reload |

---

## Key Differentiators

- **Missing asset generation** — Don't have a product photo? Just describe it.
- **Three ad formats in one click** — Feed, Stories, and Landscape generated simultaneously.
- **Visual reference conditioning** — Uploaded assets influence the AI output for brand consistency.
- **Edit loop** — Tweak prompts and regenerate individual images without restarting.
