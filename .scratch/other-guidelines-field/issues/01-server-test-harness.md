# 01: Server test harness for the generate endpoint

**What to build:** A developer can run `cd server && npm test` and get Vitest + supertest tests that exercise the real Express app (actual routes, middleware, validation and prompt builder) with OpenAI and S3 faked, so no credentials, network or cost are involved. Running the server for real (`npm run dev` / `npm start`) behaves exactly as before. The ticket adds no feature behavior. It sets up the harness that tickets 03 and 04 add test cases to, and pins down how `POST /api/generate` behaves today.

Source: `docs/prd-other-guidelines-field.md` (Testing Decisions, Task 1–2).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `vitest`, `supertest` and `@types/supertest` are dev dependencies of the server package, and `npm test` runs `vitest run`
- [x] Express app construction (middleware and routers) lives in its own module that exports the app. The entry point imports it and calls `listen()`, and does nothing else new
- [x] `npm run dev` and `npm start` still serve the API on the configured port with no behavior change
- [x] Test files (`*.test.ts`, next to the code they test, importing from `vitest` explicitly) are excluded from the production build output
- [x] The `openai` SDK (`images.generate` / `images.edit` return a tiny base64 PNG), `@aws-sdk/client-s3` (`S3Client.send` resolves) and `@aws-sdk/s3-request-presigner` (`getSignedUrl` returns a fake URL) are mocked at the module boundary
- [x] Smoke test: `GET /api/health` returns 200 with `{ status: 'ok' }`
- [x] Baseline test: a valid brief with no assets returns 200 with three images, each with a `prompt` containing the brand name
- [x] Baseline test: a brief missing `brandName` returns 400
- [x] `cd server && npm test`, `cd server && npx tsc --noEmit` and `cd server && npm run build` pass
