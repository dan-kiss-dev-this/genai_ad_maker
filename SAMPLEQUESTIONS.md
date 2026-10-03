# GenAI Ad Maker — Technical Interview & Presentation Questions

## Server Questions

### 1. Why did you choose a two-phase generation pipeline, and how does it work?

```typescript
// server/src/routes/generate.ts
for (const product of brief.products) {
  // Phase 1: Generate missing assets first (standalone)
  const missingResult = await generateMissingAssetImages(
    productMissingAssets, brief.brandName, product.name, timestamp
  );
  missingAssetImageUrls = missingResult.images.map((i) => i.url);

  // Phase 2: Generate hero images using ALL assets (uploaded + generated)
  const heroResult = await generateHeroImages(
    brief, assets || [], missingAssetImageUrls, product.name, timestamp
  );
}
```

**Talking points:** Missing assets must exist before hero generation so they can be used as input references. This ensures the hero images incorporate all brand elements even when the user didn't upload them.

**Answer:** The generation pipeline is split into two phases because there's a data dependency between them. In Phase 1, we generate any assets the user described but didn't upload — for example, if they wrote "a red running shoe on white background" instead of uploading a product photo. These are generated as standalone 1024x1024 images using `openai.images.generate()` with a clean product photography prompt. Once those images exist and are stored in S3, their URLs are collected into `missingAssetImageUrls`. In Phase 2, we generate the final hero ad images across three aspect ratios (1:1, 9:16, 16:9). Critically, the hero generation uses `openai.images.edit()`, which accepts reference images as input — we pass in both the user's uploaded assets AND the freshly generated missing asset images. This means the AI model can see the actual product photos, logos, and reference images when composing the final advertisement, resulting in much more accurate and brand-consistent hero images. If we tried to do both phases in parallel, the hero images wouldn't have access to the generated missing assets and would have to imagine what the products look like based on text alone.

---

### 2. How does your OpenAI service decide between `images.generate()` and `images.edit()`?

```typescript
// server/src/services/openai.ts
async function generateImage(prompt, size, inputImages?) {
  if (inputImages && inputImages.length > 0) {
    const imageFiles = await Promise.all(
      inputImages.map(async (img, i) => {
        const res = await fetch(img.url);
        const buffer = Buffer.from(await res.arrayBuffer());
        return toFile(buffer, `image-${i}.png`, { type: 'image/png' });
      })
    );
    const response = await openai.images.edit({
      model: 'gpt-image-1', prompt, image: imageFiles, size, quality: 'high',
    });
    return Buffer.from(response.data?.[0]?.b64_json, 'base64');
  } else {
    const response = await openai.images.generate({
      model: 'gpt-image-1', prompt, size, quality: 'high',
    });
    return Buffer.from(response.data?.[0]?.b64_json, 'base64');
  }
}
```

**Talking points:** `images.edit()` accepts reference images so the model can compose them into the output. `images.generate()` is used for standalone generation (missing assets). Input images must be downloaded from S3 signed URLs and converted to File objects via OpenAI's `toFile()` utility.

**Answer:** The `generateImage` function acts as a unified interface that routes to one of two OpenAI API methods depending on whether reference images are provided. When `inputImages` is empty or undefined — which happens when generating missing assets — we call `openai.images.generate()`. This creates an image purely from the text prompt. When `inputImages` are provided — which happens for hero ad images where we want the AI to incorporate uploaded logos, product photos, and reference images — we call `openai.images.edit()`. The edit endpoint requires images to be passed as File objects, not URLs, so we first download each image from its S3 presigned URL using `fetch()`, convert the response to a `Buffer`, and then use OpenAI's `toFile()` helper to create a proper File object with a `.png` extension and MIME type. Both endpoints return the generated image as base64 JSON (`b64_json`), which we decode into a Buffer for S3 upload. We chose GPT-Image-1 specifically because it supports this multi-image edit workflow and produces high-quality commercial imagery. The `quality: 'high'` flag ensures maximum output resolution and detail.

---

### 3. How do you handle parallelism in your generation pipeline, and what are the tradeoffs?

```typescript
// server/src/services/openai.ts — hero images: 3 ratios in parallel
const results = await Promise.all(
  ASPECT_RATIOS.map(async (aspectRatio) => {
    const imageBuffer = await generateImage(prompt, size, inputImages);
    await uploadToS3(s3Key, imageBuffer);
    return { image, log: logEntry };
  })
);

// Missing assets also in parallel
const results = await Promise.all(
  missingAssets.map(async (asset) => {
    const imageBuffer = await generateImage(prompt, '1024x1024');
    // ...
  })
);
```

**Talking points:** `Promise.all` for independent operations (aspect ratios, missing assets). BUT products are processed sequentially in a `for...of` loop because each product's missing assets must be generated before its hero images. Tradeoff: if one ratio fails, `Promise.all` rejects everything — could use `Promise.allSettled` for partial success.

**Answer:** The pipeline uses a mixed concurrency strategy based on data dependencies. At the top level, products are processed sequentially using a `for...of` loop — this is intentional because each product's missing assets must be fully generated before its hero images can reference them. Within each product, however, we maximize parallelism. All missing assets for a given product are generated concurrently via `Promise.all`, since they're independent of each other. Similarly, the three hero image aspect ratios (1:1, 9:16, 16:9) are generated in parallel since they share the same input references but produce independent outputs. Each parallel branch also handles its own S3 upload, so image generation and storage happen concurrently across ratios. The main tradeoff is with `Promise.all`'s all-or-nothing behavior — if the 9:16 ratio fails but 1:1 and 16:9 succeed, we lose all three results. An improvement would be using `Promise.allSettled` to return partial results and let the user retry only the failed ratios. Another consideration is API rate limiting — firing 3 concurrent GPT-Image-1 requests per product could hit OpenAI's rate limits for accounts with lower tiers, so in production you might want a concurrency limiter like `p-limit`.

---

### 4. Explain your S3 key structure and why you sanitize inputs.

```typescript
// server/src/services/s3.ts
export function sanitizeForS3Key(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

export function buildS3Key(parts) {
  const brand = sanitizeForS3Key(parts.brandName);
  const product = sanitizeForS3Key(parts.productName);
  const segments = ['generated', brand, product, parts.timestamp];
  if (parts.subfolder) segments.push(parts.subfolder);
  segments.push(parts.filename);
  return segments.join('/');
}
// Result: generated/nike/air-max-90/2024-01-15T10-30-00-000Z/1x1/image.png
```

**Talking points:** Sanitization prevents path traversal attacks and invalid S3 keys. Timestamp-based folders enable versioning without overwrites. The structure is browsable in S3 console by brand → product → session → ratio.

**Answer:** The S3 key structure follows the pattern `generated/{brand}/{product}/{timestamp}/{subfolder}/{filename}` — for example, `generated/nike/air-max-90/2024-01-15T10-30-00-000Z/1x1/image.png`. This hierarchical structure serves several purposes. First, it's human-browsable in the S3 console or CLI — you can navigate by brand, then product, then generation session. Second, the ISO timestamp ensures every generation session creates a unique folder, so we never overwrite previous results. This gives us free versioning — you can compare outputs across sessions. The `sanitizeForS3Key` function is critical for security and reliability. It lowercases the input, replaces whitespace with hyphens, and strips all non-alphanumeric characters. This prevents path traversal attacks (e.g., a brand name like `../../etc/passwd` would become `etcpasswd`), avoids S3 key encoding issues with special characters, and produces consistent, predictable paths. The subfolder segment distinguishes between aspect ratios (`1x1`, `9x16`, `16x9`) and missing assets (`missing-assets`). We also store a `generation-log.json` file in the same timestamp folder, keeping the full audit trail — prompt, input references, timing, errors — co-located with the generated images.

---

### 5. How do you handle presigned URLs, and what happens when they expire?

```typescript
// server/src/services/s3.ts
export async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

// server/src/routes/images.ts — refresh endpoint
router.get('/*', async (req, res) => {
  const key = (req.params as unknown as Record<number, string>)[0];
  const url = await getSignedDownloadUrl(key);
  res.json({ url });
});
```

**Talking points:** Presigned URLs expire after 1 hour. The `/api/images/:key` endpoint exists specifically so the client can request fresh URLs. This avoids storing long-lived public URLs while keeping images accessible.

**Answer:** S3 objects in this project are private — there are no public bucket policies. To give the client access to images, we generate presigned URLs using AWS SDK v3's `getSignedUrl()` function with a `GetObjectCommand`. Each URL contains a cryptographic signature that grants temporary read access to that specific S3 object, and it expires after 3600 seconds (1 hour) by default. When images are first generated or uploaded, the server returns presigned URLs in the API response. But if the user's browser session lasts longer than an hour, those URLs will return 403 errors. That's why the `/api/images/*` endpoint exists — it's a lightweight refresh mechanism. The client can pass any S3 key to this endpoint and get back a fresh presigned URL. The wildcard route (`/*`) captures the full S3 key path including slashes. This approach is more secure than making the bucket public or using long-lived URLs, since each URL is scoped to a single object and time-limited. The tradeoff is an extra API call when URLs expire, but in practice most users complete their workflow well within the 1-hour window.

---

### 6. How does your prompt engineering approach work for hero images vs. missing assets?

```typescript
// server/src/services/promptBuilder.ts
export function buildMissingAssetPrompt(missingAsset) {
  return `Generate a high-quality, professional product photograph...
  Item description: ${missingAsset.description}
  Style: Clean product photography, studio lighting, no text or watermarks.`;
}

export function buildHeroImagePrompt(brief, aspectRatio) {
  return `Create a stunning, professional social media advertisement...
  Campaign Goal: ${brief.campaignGoal}
  Tone & Style: ${brief.toneStyle}
  Products featured:\n${productsList}
  IMPORTANT LAYOUT INSTRUCTIONS:
  - At the BOTTOM of the image, include a semi-transparent dark bar...
  - Display the brand logo on the left and campaign message "${brief.campaignMessage}"...`;
}
```

**Talking points:** Missing assets use minimal prompts for clean product shots (used as inputs later). Hero prompts are comprehensive — they incorporate all brief fields and include explicit layout instructions for consistent brand messaging. The bottom-bar pattern ensures logo/CTA placement is predictable.

**Answer:** The two prompt types serve fundamentally different purposes, so they're engineered differently. Missing asset prompts are intentionally minimal — they ask for "a high-quality, professional product photograph on a clean, neutral background" with "studio lighting, no text or watermarks." The goal is to produce a clean, isolated product image that looks like a real photo. We explicitly exclude text and watermarks because these images will be fed as input references to the hero image generation, and any artifacts would carry through. Hero image prompts are much more comprehensive because they're generating the final deliverable — a complete social media advertisement. The prompt dynamically incorporates every field from the `CampaignBrief`: brand name, campaign goal, target audience, region, tone/style, products with descriptions, campaign message, CTA text, color palette, brand guidelines, and competitor references. Conditional sections are only included when the user provided values (e.g., `colorInfo` is empty string if no colors were specified). The most important part is the "IMPORTANT LAYOUT INSTRUCTIONS" section — this tells the model to place a semi-transparent dark banner at the bottom with the brand logo on the left and campaign message in large white text, with the CTA as a button. This structured layout instruction is critical because without it, the AI model would place text randomly, leading to inconsistent and often unreadable results. The aspect ratio dimensions are also included so the model can optimize the composition for each format (square feed post, vertical story, horizontal carousel).

---

### 7. How does your logging strategy help with debugging and auditing?

```typescript
// server/src/services/logger.ts
export const appLogger = winston.createLogger({ /* Console only */ });
export const generationLogger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'logs/generation.log' }),
    new winston.transports.Console(),
  ],
});

// server/src/types/index.ts — structured log entry
interface GenerationLogEntry {
  timestamp: string;
  type: 'missing-asset' | 'hero-image';
  aspectRatio?: AspectRatio;
  prompt: string;
  inputImageRefs: string[];        // all reference image URLs
  requestedDimensions: { width: number; height: number };
  status: 'success' | 'error';
  error?: string;
  durationMs: number;              // performance tracking
}
```

**Talking points:** Two loggers — general app logs (console) vs. generation-specific logs (file + console). Generation logs are also saved to S3 as JSON alongside images for full auditability. Each entry tracks the exact prompt, input references, dimensions, timing, and errors.

**Answer:** The logging strategy operates at three levels. First, the `appLogger` handles general server events — route hits, upload completions, error summaries. It's console-only because these are transient operational logs useful during development and monitoring. Second, the `generationLogger` is specifically for image generation events and writes to both the console and a persistent file at `server/logs/generation.log`. This separation means you can `tail -f` the generation log to monitor AI generation activity without noise from upload or health check requests. Third — and most importantly for auditability — structured `GenerationLogEntry` objects are saved to S3 as `generation-log.json` alongside the generated images. Each entry captures the exact prompt sent to the AI, all input image reference URLs, the requested dimensions, whether it succeeded or failed, the error message if it failed, and the duration in milliseconds. This means for any generated image, you can trace back to exactly what inputs and prompt produced it. The `durationMs` field is particularly useful for identifying performance bottlenecks — for example, discovering that 9:16 images consistently take longer than 1:1 images. The structured JSON format also makes these logs programmatically queryable if you later want to build analytics dashboards or cost tracking.

---

### 8. Why did you use in-memory storage for Multer instead of disk storage?

```typescript
// server/src/middleware/multer.ts
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  fileFilter,  // JPEG, PNG, WebP, GIF only
  limits: { fileSize: 10 * 1024 * 1024, files: 16 },
});
```

**Talking points:** Files go directly to S3 — writing to disk first would be wasteful I/O. Memory storage gives us a Buffer we can upload directly. The 10MB limit and file type filter protect against abuse. Tradeoff: large uploads consume server memory, but the 10MB x 16 file limit caps it at ~160MB worst case.

**Answer:** Multer's `memoryStorage()` keeps uploaded files as Buffers in Node.js process memory rather than writing them to the filesystem. I chose this because the files are immediately forwarded to S3 — writing to disk first would add unnecessary I/O latency (write to disk, read from disk, upload to S3, delete from disk). With memory storage, the flow is: receive file as Buffer → upload Buffer directly to S3 via `PutObjectCommand`. The `fileFilter` function acts as a security whitelist, only allowing `image/jpeg`, `image/png`, `image/webp`, and `image/gif` MIME types. Any other file type (e.g., `.exe`, `.pdf`, `.svg`) is rejected with a descriptive error message before it even enters memory. The `limits` object provides two additional safety rails: `fileSize: 10 * 1024 * 1024` (10MB per file) prevents users from uploading massive images that would consume excessive memory, and `files: 16` caps the number of files per request. In the worst case, a single request could hold 160MB in memory (16 files x 10MB), which is acceptable for a single-user or low-traffic tool. If this were a high-traffic production service, I'd switch to `diskStorage` or streaming uploads directly to S3 using multipart upload to avoid memory pressure.

---

## Client Questions

### 9. Why did you choose `useState` in App.tsx over Redux or Context for state management?

```typescript
// client/src/App.tsx
const [assets, setAssets] = useState<UploadedAsset[]>([]);
const [missingAssets, setMissingAssets] = useState<MissingAsset[]>([]);
const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
const [currentBrief, setCurrentBrief] = useState<CampaignBrief | null>(null);
const [generatedPreviews, setGeneratedPreviews] = useState<Record<string, GeneratedImage>>({});
```

**Talking points:** The app has a linear flow (form → generate → preview → edit), not deeply nested consumers. Prop drilling works fine with ~3 levels of components. Adding Redux/Context would be over-engineering for this scope. If the app grew (e.g., multi-page, auth, caching), Context or Zustand would be the next step.

**Answer:** I chose plain `useState` hooks in `App.tsx` as the single source of truth because the application's complexity doesn't warrant a state management library. The app follows a linear, wizard-like flow: fill out the brief form → generate images → preview results → optionally edit and regenerate. There are no deeply nested components that need to access the same state — the component tree is only about 3 levels deep (App → BriefForm → ProductForm). Prop drilling at this depth is straightforward and has the benefit of being explicit — you can trace exactly where data flows by reading the JSX props. Redux would add significant boilerplate (actions, reducers, selectors, store configuration) for no real benefit in this case. Context API would be a middle ground, but it introduces the risk of unnecessary re-renders if not carefully memoized, and the state shape here is simple enough that `useState` handles it cleanly. The state is organized by concern: `assets` and `missingAssets` track user inputs, `generatedImages` and `missingAssetImages` track outputs, `editingImage` controls the modal, and `generatedPreviews` manages the preview workflow. If the app needed to grow — for example, adding user authentication, generation history, saved campaigns, or multi-page routing — I'd likely migrate to Zustand for its minimal API and built-in selector memoization, or use React Context for auth/theme state that truly needs to be globally accessible.

---

### 10. How does the missing asset preview workflow function from the user's perspective?

```typescript
// client/src/App.tsx
const handleGeneratePreview = async (slotKey: string, missingAsset: MissingAsset) => {
  setGeneratingPreview(slotKey);
  const result = await api.generateMissingAsset(missingAsset, brief.brandName);
  setGeneratedPreviews(prev => ({ ...prev, [slotKey]: result.image }));
  setGeneratingPreview(null);
};

const handleAcceptPreview = (slotKey: string, slot: { type; productIndex? }) => {
  const preview = generatedPreviews[slotKey];
  // Add generated image to assets array
  setAssets(prev => [...prev, { type: slot.type, productIndex: slot.productIndex,
    url: preview.url, key: preview.s3Key }]);
  // Remove from missing assets
  setMissingAssets(prev => prev.filter(a => /* matching logic */));
  // Clean up preview
  setGeneratedPreviews(prev => { const next = { ...prev }; delete next[slotKey]; return next; });
};
```

**Talking points:** This is a three-step UX pattern: describe → preview → accept/reject. It gives users confidence before committing to full generation. The preview uses the same GPT-Image-1 API but through a lightweight endpoint. Accepted previews become real assets in the pipeline.

**Answer:** The missing asset preview workflow solves a real UX problem: users shouldn't have to wait for the full generation pipeline (which generates 3+ images) just to see if their text description produces a good product photo. The flow works in three steps. First, the user types a description into the missing asset textarea — for example, "a sleek black wireless headphone on a white background." They click "Generate Preview," which triggers `handleGeneratePreview`. This calls the lightweight `POST /api/generate/missing-asset` endpoint, which generates a single 1024x1024 image and returns it. The preview state is tracked per-slot using a `Record<string, GeneratedImage>` keyed by `slotKey` (e.g., `"product-0"` or `"logo"`), and a separate `generatingPreview` string tracks which slot is currently loading to show a spinner. Once the preview appears, the user has two choices. They can dismiss it (which removes it from `generatedPreviews` and lets them edit the description and try again) or accept it. Accepting triggers `handleAcceptPreview`, which does three state updates atomically: it adds the generated image to the `assets` array (converting it from a "missing" asset to a real uploaded asset), removes the corresponding entry from `missingAssets`, and cleans up the preview from `generatedPreviews`. From that point forward, the accepted image is treated identically to a user-uploaded file — it will be passed as an input reference during hero image generation. This pattern gives users iterative control over each individual asset before committing to the expensive full generation.

---

### 11. How does your image download implementation work in the browser?

```typescript
// client/src/components/ImagePreview.tsx
const downloadImage = async (image: GeneratedImage) => {
  const response = await fetch(image.url);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = image.s3Key.split('/').pop() || 'image.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

**Talking points:** Can't just use `<a href>` because S3 presigned URLs open in a new tab instead of downloading. This fetches the image as a blob, creates a temporary object URL, programmatically clicks a download link, then cleans up. `revokeObjectURL` prevents memory leaks.

**Answer:** Downloading images from S3 presigned URLs in the browser is trickier than it seems. A naive approach would be `<a href={presignedUrl} download>`, but this doesn't work because the `download` attribute is ignored for cross-origin URLs — the browser opens the image in a new tab instead. Since S3 presigned URLs point to a different domain than our app, they're always cross-origin. The solution is a four-step process. First, we `fetch()` the image URL, which returns the raw image data. Second, we call `response.blob()` to convert it to a Blob object (a file-like chunk of binary data). Third, we call `URL.createObjectURL(blob)` to create a temporary `blob:` URL — this URL points to data already in the browser's memory, so it's same-origin and the `download` attribute will work. Fourth, we programmatically create an `<a>` element, set its `href` to the blob URL, set `download` to the filename extracted from the S3 key (e.g., `image.png`), append it to the DOM, click it, and immediately remove it. The final step — `URL.revokeObjectURL(url)` — is important for memory management. Without it, the browser keeps the blob data in memory for the lifetime of the page, which could add up significantly if the user downloads many high-resolution images. Revoking tells the browser it can garbage-collect that blob data.

---

### 12. How does the Vite proxy work, and why is it necessary?

```typescript
// client/vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

// client/src/services/api.ts
const api = axios.create({ baseURL: '/api' });
```

**Talking points:** In development, the React app runs on `:5173` and the Express server on `:3001` — different origins. Without the proxy, API calls would hit CORS issues or need absolute URLs. The proxy lets the client use relative paths (`/api/generate`) which Vite forwards to Express. In production, you'd serve both from the same origin or configure CORS properly.

**Answer:** During development, the React frontend and Express backend run as separate processes on different ports — Vite's dev server on `:5173` and Express on `:3001`. These are different origins (`localhost:5173` vs `localhost:3001`), so any API call from the frontend would be a cross-origin request subject to the browser's Same-Origin Policy. While the server does enable CORS via the `cors()` middleware, relying on CORS in development means the client code would need hardcoded absolute URLs like `http://localhost:3001/api/generate`, which would break in production. The Vite proxy solves both problems elegantly. When the client makes a request to `/api/generate`, Vite's dev server intercepts it (because it matches the `/api` prefix), and forwards it to `http://localhost:3001/api/generate` server-side. Since this proxy happens on the server side (Node.js, not the browser), there are no CORS restrictions. The `changeOrigin: true` option rewrites the `Host` header to match the target, which prevents issues with servers that check the Host header. The client code uses Axios with `baseURL: '/api'`, so all API calls use relative paths. This means the exact same client code works in production — when both the frontend and backend are served from the same origin (e.g., behind a reverse proxy like Nginx), the relative paths resolve naturally without any proxy needed.

---

### 13. How did you approach the component architecture, and how do the components communicate?

```
App.tsx (all state)
├── BriefForm (form state + callbacks up)
│   ├── AssetUploader (slot-based upload pattern)
│   └── ProductForm[] (per-product assets + description)
├── ImagePreview (display results)
│   └── ImageCard[] (download + edit triggers)
└── ImageEditor (modal, prompt editing)
```

```typescript
// App.tsx passes callbacks down
<BriefForm
  onSubmit={handleGenerate}
  assets={assets}
  onAssetsChange={setAssets}
  missingAssets={missingAssets}
  onMissingAssetsChange={setMissingAssets}
  onGeneratePreview={handleGeneratePreview}
  onAcceptPreview={handleAcceptPreview}
/>
```

**Talking points:** Unidirectional data flow — state lives in App, flows down as props, mutations flow up as callbacks. Each component has a single responsibility. The "slot" pattern (`slotKey = 'type-productIndex'`) lets us track which asset slot is uploading/previewing without complex state.

**Answer:** The component architecture follows React's unidirectional data flow principle. `App.tsx` owns all shared state and passes it down as props, while child components communicate upward through callback functions. Each component has a clear, single responsibility. `BriefForm` owns the form-level local state for the campaign brief and handles form validation — it only calls `onSubmit` when the brief is complete and valid. `AssetUploader` manages the logo and reference image upload slots using a "slot" pattern — each slot is defined as an object with `{ type, label, maxFiles }`, and a `slotKey` string (like `"logo"` or `"product-0"`) uniquely identifies each slot for tracking upload progress and preview state. `ProductForm` is a reusable card component rendered once per product, handling product-specific fields and images. `ImagePreview` is a pure display component — it receives generated images and renders them in a grid with download and edit actions. `ImageEditor` is a modal component that receives a single image and its prompt, lets the user edit the prompt, and calls `onRegenerate` with the new prompt. The key architectural decision was keeping `BriefForm` and `ImagePreview` as siblings under `App` rather than nesting them. This means the generation results don't depend on the form being mounted — the user could theoretically navigate away from the form and still see results. The step indicator in the UI (Step 1: Create Brief, Step 2: Review) reflects this sibling relationship visually.

---

### 14. How do your custom Tailwind components enforce design consistency?

```css
/* client/src/index.css */
@layer components {
  .input-field {
    @apply w-full bg-surface-100 border border-surface-300 rounded-xl px-4 py-3
           text-gray-100 placeholder-gray-500 focus:border-brand-500
           focus:ring-1 focus:ring-brand-500 transition-colors duration-200;
  }
  .btn-primary {
    @apply w-full py-3.5 px-6 rounded-xl font-semibold text-white
           transition-all duration-200 disabled:opacity-50;
    background: linear-gradient(135deg, #ec1000 0%, #f97316 100%);
    box-shadow: 0 10px 15px -3px rgba(236, 16, 0, 0.25);
  }
  .card {
    @apply bg-surface-200 border border-surface-300 rounded-2xl p-6
           hover:border-surface-400 transition-all duration-200;
  }
}
```

**Talking points:** Extracting repeated patterns into `.card`, `.input-field`, `.btn-primary` etc. prevents inconsistency across components. Uses custom `surface-*` and `brand-*` color tokens from Tailwind config for a dark theme. The `@layer components` directive ensures proper specificity ordering with utility classes.

**Answer:** Instead of repeating the same 8-10 Tailwind utility classes on every input field across the app, I extracted common patterns into semantic CSS classes using Tailwind's `@layer components` directive. For example, every text input in the app needs the same dark background (`bg-surface-100`), border styling, rounded corners, padding, text color, placeholder color, focus ring, and transition — that's 10+ utilities. Writing `.input-field` once means every `<input className="input-field">` is guaranteed to look identical. The same applies to `.btn-primary` (gradient background with box shadow), `.btn-secondary` (subtle dark button), `.card` (the container component with border and hover effect), and `.textarea-field`. The `@layer components` placement is important — it tells Tailwind to insert these styles at the components layer, which sits between the base layer and utilities layer in specificity. This means you can still override any property with a utility class (e.g., `className="input-field mt-4"` works because `mt-4` is in the utilities layer and wins). The custom color tokens (`surface-50` through `surface-500` and `brand-50` through `brand-900`) are defined in `tailwind.config.js` and provide a consistent dark theme palette. `surface-*` covers background shades from near-black to mid-gray, while `brand-*` provides the red accent color ramp. This token system means if the brand color ever changes, updating one config file updates the entire app.

---

### 15. What would you improve or change if you had more time?

**Good answers to discuss:**

- **Error resilience**: Use `Promise.allSettled` instead of `Promise.all` so one failed aspect ratio doesn't kill the entire generation
- **Caching**: Cache generated images in browser state to avoid re-fetching expired presigned URLs
- **State management**: Migrate to Zustand or React Context if adding features like history/undo or multi-session support
- **Queue system**: Move generation to a background job queue (Bull/BullMQ) with WebSocket progress updates instead of blocking the HTTP request
- **Type sharing**: Create a shared types package instead of duplicating types between client and server
- **Testing**: Add unit tests for prompt builder, integration tests for the generation pipeline

**Answer:** There are several improvements I'd prioritize. First, **error resilience** — right now `Promise.all` means if one aspect ratio fails, the entire generation for that product fails and the user gets nothing. Switching to `Promise.allSettled` would let us return partial results (e.g., 2 out of 3 ratios succeeded) and show the user which ones failed with a retry option. Second, **background job processing** — the current architecture blocks the HTTP request for the entire generation pipeline, which can take 30-60+ seconds. If the server restarts or the connection drops mid-generation, all progress is lost. Moving to a job queue like BullMQ with Redis would let us accept the request immediately (returning a job ID), process it in the background, and push progress updates to the client via WebSocket or Server-Sent Events. The user would see a real-time progress bar instead of a spinner. Third, **type sharing** — the `CampaignBrief`, `GeneratedImage`, and other interfaces are copy-pasted between `client/src/types/index.ts` and `server/src/types/index.ts`. If one changes and the other doesn't, we get runtime errors that TypeScript can't catch. Creating a shared `packages/types` directory in the monorepo (or using a tool like Turborepo) would give us a single source of truth. Fourth, **testing** — the prompt builder functions are pure functions that are easy to unit test (given a brief, assert the prompt contains the right fields). The S3 service could be integration-tested with LocalStack. The generation pipeline could use mocked OpenAI responses to test the orchestration logic without making real API calls. Fifth, **caching and URL management** — the client could store S3 keys alongside URLs and proactively refresh URLs before they expire, or use a service worker to intercept failed image loads and auto-refresh. Finally, **rate limiting and cost controls** — adding middleware to limit generations per user/session would prevent runaway API costs, and showing estimated costs before generation would improve transparency.
