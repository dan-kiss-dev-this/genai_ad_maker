# GenAI Ad Creation System — Implementation Plan

## Context
Build a GenAI-powered social media ad creation tool. Users submit a marketing campaign brief with uploaded assets (logos, product images, reference images), and the system generates hero images for Instagram and Facebook using OpenAI's GPT-Image-1 model. Generated images are stored in AWS S3. No auth or database — lightweight tool focused on generation and download. The frontend should have a fashionable, modern, user-friendly design.

---

## Tech Stack
- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Express + TypeScript
- **AI:** OpenAI API — `gpt-image-1` (Responses API)
- **Storage:** AWS S3 (generated images + uploaded assets)
- **Styling:** Tailwind CSS — modern, clean, fashionable UI with smooth transitions, card-based layouts, and polished visual hierarchy

---

## Project Structure
```
genai_ad_maker/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── BriefForm.tsx          # Campaign brief input form
│   │   │   ├── ProductForm.tsx        # Individual product fields (reusable)
│   │   │   ├── AssetUploader.tsx      # Drag-and-drop file uploads
│   │   │   ├── ImagePreview.tsx       # Generated image gallery
│   │   │   ├── ImageEditor.tsx        # Edit prompt & regenerate
│   │   │   └── Layout.tsx             # App shell
│   │   ├── services/
│   │   │   └── api.ts                 # API client
│   │   ├── types/
│   │   │   └── index.ts              # Shared types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
├── server/                  # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── generate.ts           # POST /api/generate — image generation
│   │   │   ├── upload.ts             # POST /api/upload — asset uploads
│   │   │   └── images.ts             # GET /api/images — retrieve generated images
│   │   ├── services/
│   │   │   ├── openai.ts             # OpenAI GPT-Image-1 integration
│   │   │   ├── s3.ts                 # AWS S3 upload/retrieval
│   │   │   ├── promptBuilder.ts      # Construct image prompts from brief
│   │   │   └── logger.ts             # Generation request/response logging
│   │   ├── middleware/
│   │   │   └── multer.ts             # File upload handling
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts                  # Express app entry
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Implementation Steps

### Step 1: Project Scaffolding
- Initialize monorepo with `client/` and `server/` directories
- Set up Vite + React + TypeScript for frontend
- Set up Express + TypeScript for backend with `tsx` for dev
- Configure shared TypeScript types
- Add `.env` files for OpenAI API key and AWS credentials

### Step 2: Campaign Brief Form (Frontend)
Build `BriefForm.tsx` with these fields:
- **Brand name** (text)
- **Campaign message** (textarea — the key marketing message for the campaign)
- **Campaign goal** (dropdown: awareness, conversion, engagement)
- **Target audience** (text)
- **Target region/market** (text — e.g., "US West Coast", "UK", "APAC")
- **Tone/style** (dropdown: professional, playful, bold, elegant, minimal, edgy)
- **CTA text** (text — e.g., "Shop Now", "Learn More")
- **Color palette** (color picker or hex input, multiple colors)
- **Brand guidelines** (textarea — free-form notes)
- **Competitor references** (textarea — URLs or descriptions)

**Products section (multi-product support):**
- Each product entry includes:
  - **Product name** (text)
  - **Product description** (textarea)
- "Add Another Product" button to add additional product entries
- Each product can be removed individually
- At least one product is required

### Step 3: Asset Upload (Frontend + Backend)
- `AssetUploader.tsx` — drag-and-drop + file picker for:
  - **Brand logo** (1 file)
  - **Product images** (up to 5 per product)
  - **Reference/mood board images** (up to 5)
- **Missing asset handling:**
  - Each asset slot has an optional **text description field** that appears if no file is uploaded
  - If the user doesn't upload an asset (e.g., no product image), they can describe it in the text field (e.g., "A sleek silver smartwatch with a round face and leather strap")
  - The description is passed to the prompt builder in Step 5 to generate the missing asset as part of the hero image
  - Generated images for missing assets include `missing-asset` in the filename when saved to S3
- Backend `POST /api/upload` — accepts multipart uploads via Multer
- Upload files to S3 and return URLs
- Show uploaded asset thumbnails in the UI

### Step 4: Auto-Generate All Aspect Ratios (Instagram Feed Post)
Images are automatically generated in **3 aspect ratios** for Instagram Feed Post format — no manual platform selection needed:

| Aspect Ratio | Dimensions  | Use Case                    |
|-------------|-------------|------------------------------|
| 1:1         | 1080x1080   | Standard feed post           |
| 9:16        | 1080x1920   | Stories / Reels              |
| 16:9        | 1920x1080   | Landscape / carousel cover   |

All three are generated for every request automatically.

### Step 5: Prompt Builder (Backend)
`promptBuilder.ts` — converts brief + asset context into an effective image prompt:
- Incorporates brand name, product name(s), product description(s), audience, tone, target region/market
- References color palette and brand guidelines
- Specifies the campaign message
- **Brand logo + campaign message overlay:** Instructs the model to place the brand logo and the campaign message text at the bottom of the image in a highly readable way (e.g., on a semi-transparent bar or with contrasting text, ensuring legibility over any background)
- Adds CTA text overlay instructions
- Specifies dimensions for each of the 3 aspect ratios
- Uses reference images as style guidance (via GPT-Image-1 image input)
- **Missing asset generation:** If any asset was not uploaded and a text description was provided:
  1. **Separate standalone image:** First, generate a dedicated image of just the missing asset based on the text description (e.g., if the user described "A sleek silver smartwatch with a round face", generate a standalone product image of that smartwatch). This image is saved separately to S3 with `missing-asset` and a sanitized version of the text description in the filename.
  2. **Incorporated into hero image:** The generated missing asset image is then used as an input reference image for the main hero image generation, so the final ad includes a visual of the described asset.

### Step 6: OpenAI Image Generation (Backend)
`openai.ts` — calls GPT-Image-1 via the Responses API:
- Sends constructed prompt + uploaded reference images as input
- **Missing asset generation (separate step):** Before generating hero images, generate a standalone image for each missing asset using its text description. Save these separately to S3 with filename format: `missing-asset-{sanitized-description}.png` (e.g., `missing-asset-sleek-silver-smartwatch-round-face.png`). These generated asset images are then fed as input references into the hero image generation.
- Generates hero images for all 3 aspect ratios (1:1, 9:16, 16:9)
- Returns base64 or URL of generated images (both missing asset images and hero images)
- Handles rate limiting and errors gracefully
- **Logging:** Log the full request payload sent to OpenAI for each generation call, including:
  - The constructed prompt text
  - List of input image URLs/references
  - Requested dimensions/aspect ratio
  - Timestamp
  - Response status and any errors
  - Logs are written to `server/logs/generation.log` (structured JSON format)

### Step 7: S3 Storage (Backend)
`s3.ts` — saves generated images with organized folder structure:
- **S3 key structure:** `generated/{brandName}/{productName}/{timestamp}/{aspectRatio}/image.png`
  - Example: `generated/Nike/AirMax2026/2026-05-12T14-30-00Z/1x1/image.png`
  - Example: `generated/Nike/AirMax2026/2026-05-12T14-30-00Z/9x16/image.png`
  - Example: `generated/Nike/AirMax2026/2026-05-12T14-30-00Z/16x9/image.png`
  - For missing asset standalone images: `generated/Nike/AirMax2026/2026-05-12T14-30-00Z/missing-assets/missing-asset-sleek-silver-smartwatch-round-face.png`
- **Generation log upload:** Also save the generation log (prompt, parameters, OpenAI request/response metadata) as a JSON file alongside the images:
  - `generated/{brandName}/{productName}/{timestamp}/generation-log.json`
- Return signed URLs for frontend preview/download
- Sanitize brand/product names for use as S3 keys (lowercase, replace spaces with hyphens, strip special chars)

### Step 8: Image Preview & Download (Frontend)
`ImagePreview.tsx`:
- Display generated images in a grid/gallery organized by aspect ratio
- Show aspect ratio label on each image (1:1, 9:16, 16:9)
- Download button per image (direct S3 link)
- "Download All" button (zip or individual)
- Modern card-based layout with hover effects and smooth transitions

### Step 9: Edit & Regenerate (Frontend + Backend)
`ImageEditor.tsx`:
- Show the prompt that was used to generate each image
- Allow users to edit/tweak the prompt text
- "Regenerate" button sends modified prompt back to `POST /api/generate`
- Replace or append new variations alongside originals
- Regenerated images follow the same S3 folder structure with a new timestamp

---

## API Endpoints

| Method | Path              | Description                          |
|--------|-------------------|--------------------------------------|
| POST   | `/api/upload`     | Upload brand assets (logo, product, reference images) |
| POST   | `/api/generate`   | Submit brief + generate images (all 3 aspect ratios) |
| GET    | `/api/images/:id` | Retrieve generated image set by session ID |

---

## Key Dependencies

**Client:**
- `react`, `react-dom`, `react-router-dom`
- `tailwindcss` (styling)
- `axios` (API calls)
- `react-dropzone` (file uploads)

**Server:**
- `express`, `cors`, `dotenv`
- `openai` (OpenAI SDK)
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- `multer` (file upload handling)
- `uuid` (session IDs)
- `winston` (structured logging)

---

## Environment Variables
```
OPENAI_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
```

---

## Frontend Design Direction
- **Modern & fashionable:** Clean white/light backgrounds with subtle gradients, rounded corners, generous whitespace
- **Card-based layouts:** Each section (brief, assets, preview) in elevated cards with soft shadows
- **Smooth transitions:** Fade-in animations for generated images, hover effects on interactive elements
- **Typography:** Clean sans-serif font hierarchy (Inter or similar)
- **Color accents:** Subtle brand accent color (e.g., indigo/violet) for CTAs and focus states
- **Responsive:** Works well on desktop and tablet
- **Progress indicators:** Loading spinners/skeleton screens during image generation

---

## Verification / Testing
1. Start backend (`npm run dev` in `server/`)
2. Start frontend (`npm run dev` in `client/`)
3. Fill out campaign brief form with test data including multiple products
4. Upload a logo and product image; leave one product image blank and add a text description
5. Click Generate — verify 3 images (1:1, 9:16, 16:9) appear in preview
6. Verify brand logo and campaign message appear at the bottom of generated images
7. Verify missing-asset images have `missing-asset` in the S3 filename
8. Download an image — verify it matches expected dimensions
9. Edit prompt and regenerate — verify new image appears
10. Check S3 bucket — verify folder structure: `generated/{brand}/{product}/{timestamp}/{ratio}/`
11. Check S3 for `generation-log.json` alongside images
12. Check `server/logs/generation.log` for structured request/response logs
