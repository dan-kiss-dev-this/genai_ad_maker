# Spark the GenAI Ad Maker

AI-powered social media ad creation tool. Submit a marketing campaign brief with brand assets, and generate hero images for Instagram and Facebook using OpenAI's GPT-Image-1 model. Generated images are stored in AWS S3.

## Features

- **Campaign Brief Form** — Brand name, campaign message, target audience, region, tone/style, CTA, color palette, brand guidelines, competitor references
- **Multi-Product Support** — Add multiple products per campaign, each with name and description
- **Asset Upload** — Drag-and-drop upload for logos, product images, and reference/mood board images
- **Missing Asset Generation** — Describe a missing asset in text and the system generates a standalone image, then incorporates it into the final ad
- **Auto Aspect Ratios** — Every request generates 3 images: 1:1 (feed), 9:16 (stories/reels), 16:9 (landscape)
- **Brand Overlay** — Brand logo and campaign message rendered at the bottom of each image
- **Edit & Regenerate** — View the prompt used, tweak it, and regenerate any image
- **S3 Storage** — Organized folder structure: `generated/{brand}/{product}/{timestamp}/{ratio}/`
- **Generation Logging** — Full request/response logs saved to S3 and local log files

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend  | Node.js, Express, TypeScript        |
| AI       | OpenAI GPT-Image-1 (Responses API) |
| Storage  | AWS S3                              |
| Logging  | Winston                             |

## Project Structure

```
genai_ad_maker/
├── client/                     # React frontend
│   └── src/
│       ├── components/         # BriefForm, AssetUploader, ImagePreview, ImageEditor, Layout
│       ├── services/api.ts     # API client (axios)
│       └── types/index.ts      # Shared TypeScript types
├── server/                     # Express backend
│   └── src/
│       ├── routes/             # /api/upload, /api/generate, /api/images
│       ├── services/           # openai, s3, promptBuilder, logger
│       ├── middleware/multer.ts # File upload handling
│       └── types/index.ts      # Shared TypeScript types
└── planningpart1.md            # Implementation plan
```

## Setup

### Prerequisites

- Node.js 18+
- OpenAI API key with GPT-Image-1 access
- AWS account with an S3 bucket

### 1. Clone and install

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your credentials:

```
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
PORT=3001
```

### 3. Run

Start both in separate terminals:

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open http://localhost:5173 in your browser.

## API Endpoints

| Method | Path             | Description                                    |
|--------|------------------|------------------------------------------------|
| POST   | `/api/upload`    | Upload brand assets (logo, product, reference)  |
| POST   | `/api/generate`  | Submit brief and generate images (all 3 ratios) |
| GET    | `/api/images/*`  | Get a signed S3 download URL for an image       |
| GET    | `/api/health`    | Health check                                    |

## S3 Folder Structure

```
generated/
└── {brand-name}/
    └── {product-name}/
        └── {timestamp}/
            ├── 1x1/image.png
            ├── 9x16/image.png
            ├── 16x9/image.png
            ├── missing-assets/missing-asset-{description}.png
            └── generation-log.json
```
