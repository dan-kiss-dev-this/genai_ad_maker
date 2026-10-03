# PRD: "Other Guidelines" Field

## Problem Statement

When filling out a campaign brief, users often have instructions for the generated ad that don't belong in any existing field. Examples: "no people in the shot", "avoid the color red", "include a 'Limited Time' badge". Today the Guidelines & References card has only **Brand Guidelines** and **Competitor References**. Users either cram these instructions into Brand Guidelines, where they get mixed up with brand rules, or leave them out, and the hero images don't reflect them.

## Solution

Add an optional **Other Guidelines** textarea as the last field in the Guidelines & References card. It is a catch-all for any extra instruction the ad should follow and holds up to 300 characters. A live counter shows how many have been used. When the field has content, the hero image prompt for every aspect ratio (1:1, 9:16, 16:9) gets an extra `Additional guidelines: …` line. The fixed layout instructions stay authoritative: the bottom banner, logo, campaign message and CTA. The server enforces the same 300-character limit, so requests that don't come from the form follow the same rule.

## User Stories

1. As a campaign creator, I want an "Other Guidelines" field in the Guidelines & References card, so that I have a clear place to enter instructions that don't fit the other fields.
2. As a campaign creator, I want the field to appear after Competitor References, so that the existing fields stay where I expect them and "Other" reads as the final catch-all.
3. As a campaign creator, I want placeholder text with concrete examples, so that I understand what kind of instructions belong there.
4. As a campaign creator, I want the field to be optional, so that I can generate ads without filling it in.
5. As a campaign creator, I want the field to look and behave like the other textareas in the card, so that the form feels consistent.
6. As a campaign creator, I want a live character counter (e.g. `142/300`), so that I know how much room I have left.
7. As a campaign creator, I want typing to stop at 300 characters, so that I can never submit text that will be rejected.
8. As a campaign creator, I want pasting text longer than 300 characters to be cut off at the limit, so that pasting can't push me past it either.
9. As a campaign creator, I want my other guidelines included in the prompt for every hero image aspect ratio, so that all three formats follow the same instructions.
10. As a campaign creator, I want leading and trailing whitespace ignored, so that stray spaces or blank lines don't change my prompt or count against me on the server.
11. As a campaign creator, I want a field that contains only whitespace to count as empty, so that no blank "Additional guidelines" line ends up in the prompt.
12. As a campaign creator, I want the ad's standard layout (bottom banner, logo, campaign message, CTA) kept even if my other guidelines seem to contradict it, so that every generated ad keeps a consistent, on-brand structure.
13. As a campaign creator, I want my other guidelines saved in the generation log with the rest of the brief, so that I can later see what instructions produced an image.
14. As a campaign creator, I want regenerating an image in the image editor to work exactly as before, so that the new field doesn't change editing behavior.
15. As a campaign creator, I want missing-asset generation to work exactly as before, so that standalone product and logo images aren't affected by ad-level instructions.
16. As a campaign creator, I want to see a clear error message if the server rejects my brief, so that I know what to fix.
17. As an API caller (scripts, curl, older clients), I want requests without `otherGuidelines` to still succeed, so that existing integrations don't break.
18. As an API caller, I want a 400 response with a clear message when `otherGuidelines` is over 300 characters after trimming, so that I find out right away that my input is invalid.
19. As an API caller, I want a value padded with whitespace to be accepted as long as its trimmed length is 300 characters or fewer, so that the server and client apply the same rule.
20. As an API caller, I want an over-limit request rejected before any image generation starts, so that no OpenAI or S3 cost is spent on an invalid brief.
21. As a maintainer, I want the field in both copies of `CampaignBrief` (client and server), so that the duplicated types stay in sync.
22. As a maintainer, I want automated tests for the generate endpoint covering validation and prompt contents, so that future prompt changes can't silently drop or misplace the new line.
23. As a maintainer, I want automated tests for the brief form covering the new field's rendering, counter, limit and submitted value, so that UI regressions are caught.
24. As a maintainer, I want the README's list of brief fields to include other guidelines, so that the docs match the product.

## Implementation Decisions

- **Brief shape.** `CampaignBrief` gains a free-text `otherGuidelines` field.
  - Client type: `otherGuidelines: string`, initialized to `''` in the form's initial brief state, like `brandGuidelines`.
  - Server type: `otherGuidelines?: string`. It is optional so requests that omit it remain valid (story 17).
- **Form UI (BriefForm, Guidelines & References card).**
  - A third textarea, placed after Competitor References.
  - It uses the existing `.label` and `.textarea-field` component classes, with 3 rows, matching its siblings.
  - Label: `Other Guidelines`. No required marker.
  - Placeholder: `Anything else the ad should follow - e.g. no people in the shot, avoid the color red, include a 'Limited Time' badge`.
  - Native `maxLength` of 300.
  - Under the textarea, a right-aligned, muted counter in the form `<length>/300`. It shows the untrimmed length, which is what `maxLength` limits. No counter exists in the app yet, so this is a new, small UI pattern.
  - The Generate button's disabled condition doesn't change, because the field is optional.
- **Server validation (generate route).**
  - Runs in the same up-front check as the existing `brandName` / products validation, before a session ID is created and before any OpenAI or S3 call.
  - If `otherGuidelines` is present and its trimmed length is greater than 300, the route responds `400` with `{ error: "Invalid brief: otherGuidelines must be 300 characters or fewer" }`.
  - Missing, empty and whitespace-only values are accepted.
- **Prompt (buildHeroImagePrompt only).**
  - If the trimmed `otherGuidelines` is non-empty, the prompt gets a line `Additional guidelines: <trimmed text>`.
  - The line goes in the same group as the brand guidelines and competitor reference lines, after them and before the image dimensions line and the `IMPORTANT LAYOUT INSTRUCTIONS` block.
  - It is not framed as overriding the layout instructions. If they conflict, the layout instructions win.
  - The trimming happens in the prompt builder, so whitespace-only input produces no line.
- **Unchanged.** The missing-asset prompt (`buildMissingAssetPrompt`) and the image-editor regeneration flow don't use the brief and are not modified.
- **Logging.** No change. The whole `brief` is already written to `generation-log.json` in S3, so the new field is logged automatically.
- **Server app/startup split (enabler for testing).** The Express server's entry point currently builds the app and calls `listen()` in one module.
  - Split it into an app module that builds and exports the configured Express app (middleware and routers), and an entry point that imports it and calls `listen()`.
  - Behavior when running `npm run dev` / `npm start` must not change.
- **Docs.** Add "other guidelines" to the Campaign Brief Form field list in the README.

## Testing Decisions

- **Framework: Vitest in both packages.** The repo currently has no test framework, test files, CI workflows or lint config, so setting it up is the first set of tasks.
  - **Server:** Vitest, plus `supertest` (and `@types/supertest`) for HTTP-level tests. Run with `cd server && npm test` (`vitest run`).
  - **Client:** Vitest with the `jsdom` environment, `@testing-library/react`, `@testing-library/user-event` and `@testing-library/jest-dom`. Run with `cd client && npm test` (`vitest run`).
  - Test files are named `*.test.ts` / `*.test.tsx`, sit next to the code they test, and import test functions explicitly from `vitest` (no globals).
  - Server test files must be excluded from the server's production TypeScript build output.
- **What makes a good test here.** Test only external behavior:
  - Server: the HTTP status, the response body, and the prompt text returned in the response.
  - Client: what the user sees and what `onSubmit` receives.
  - Don't assert on internal function calls, component state or private helpers.
- **Server seam: one, at the HTTP level (`POST /api/generate`).**
  - Tests import the Express app from the new app module and drive it with supertest.
  - External services are mocked at the SDK boundary so the real route, validation and prompt builder all run:
    - the `openai` package's `images.generate` / `images.edit` return a small base64 PNG;
    - `@aws-sdk/client-s3`'s `S3Client.send` resolves;
    - `@aws-sdk/s3-request-presigner`'s `getSignedUrl` returns a fake URL.
  - Requests send no uploaded assets, so no image download is triggered.
  - Prompt assertions read the `prompt` on each image in the response.
  - Cases:
    - a valid brief without the field → 200, three images, no `Additional guidelines` line;
    - a field with content → the line appears trimmed in all three prompts and comes before `IMPORTANT LAYOUT INSTRUCTIONS`;
    - empty and whitespace-only values → no line;
    - exactly 300 characters → 200;
    - 301 characters → 400 with the exact error message and no OpenAI call;
    - whitespace-padded text whose raw length is over 300 but trimmed length is 300 or less → 200;
    - the existing missing-`brandName` check still returns 400.
- **Client seam: one, the `BriefForm` component.**
  - Render it with stub props.
  - Cases:
    - the "Other Guidelines" label and placeholder render;
    - the textarea has `maxLength` 300;
    - the counter shows `0/300` and updates as the user types;
    - the field comes after Competitor References in DOM order;
    - after filling the required fields (brand name, campaign message, first product name) and submitting, `onSubmit` receives a brief whose `otherGuidelines` is the typed value.
- **Prior art.** None. These are the repo's first tests, so they set the conventions above.
- **Other automated checks that must pass.**
  - `cd server && npx tsc --noEmit`
  - `cd server && npm run build`
  - `cd client && npx tsc --noEmit`
  - `cd client && npm run build` (type-check plus Vite build)

## Out of Scope

- Using other guidelines in the missing-asset prompt or the image-editor regeneration prompt.
- Letting other guidelines override the fixed layout instructions (banner, logo, campaign message, CTA).
- Structured or multi-entry input (a list of separate guidelines). It is a single free-text field.
- Character limits or counters on Brand Guidelines, Competitor References or any other existing field.
- Changes to how the client displays server errors. The existing error display is reused as is.
- CI workflows, linting or test coverage thresholds. Only local test commands are added.
- Tests for parts of the app that this feature doesn't touch.

## Further Notes

- The 300-character limit exists to keep prompts focused and stop one free-text instruction from drowning out the layout instructions.
- `CampaignBrief` is duplicated in client and server with no shared package. Both copies must be updated in the same change.
- The client counter is the first character counter in the app. If more fields later need one, consider making it a reusable piece then, not now.
- The automated tests run against mocked OpenAI and S3. After implementation, do one manual end-to-end check with real credentials: run both dev servers, fill in the field, generate, and confirm the `Additional guidelines` line appears in the returned prompts and in `generation-log.json`.

## Tasks

- [ ] 1. Set up Vitest and supertest in the server package. Add `vitest`, `supertest` and `@types/supertest` as dev dependencies and a `test` script (`vitest run`), and exclude `*.test.ts` files from the production build output. Split the Express app construction into its own module that exports the app, and keep `listen()` in the entry point with no behavior change. Add a smoke test: `GET /api/health` returns 200 with `{ status: 'ok' }`.
  - Verify: `cd server && npm test`, `cd server && npx tsc --noEmit` and `cd server && npm run build` pass
- [ ] 2. Add the generate-endpoint test harness. Mock the `openai` SDK (`images.generate` / `images.edit` return a tiny base64 PNG), `@aws-sdk/client-s3` (`S3Client.send` resolves) and `@aws-sdk/s3-request-presigner` (`getSignedUrl` returns a fake URL). Add baseline tests for current behavior: a valid brief with no assets returns 200 with three images whose prompts contain the brand name, and a brief missing `brandName` returns 400.
  - Verify: `cd server && npm test` passes
- [ ] 3. Set up Vitest and React Testing Library in the client package. Add `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` and `@testing-library/jest-dom` as dev dependencies, configure the `jsdom` test environment with jest-dom matchers, and add a `test` script (`vitest run`). Add a smoke test: rendering `BriefForm` with stub props shows the "Guidelines & References" heading.
  - Verify: `cd client && npm test`, `cd client && npx tsc --noEmit` and `cd client && npm run build` pass
- [ ] 4. Server validation. Add `otherGuidelines?: string` to the server `CampaignBrief`. In the generate route's up-front validation, return 400 with `Invalid brief: otherGuidelines must be 300 characters or fewer` when the trimmed value is longer than 300 characters. Add HTTP tests: exactly 300 → 200; 301 → 400 with the exact message and no OpenAI call; whitespace-padded text over 300 raw but 300 or less trimmed → 200; field omitted → 200.
  - Verify: `cd server && npm test` and `cd server && npx tsc --noEmit` pass
- [ ] 5. Server prompt. In `buildHeroImagePrompt`, when the trimmed `otherGuidelines` is non-empty, add `Additional guidelines: <trimmed text>` after the brand guidelines and competitor reference lines. Add HTTP tests: with content, the trimmed line appears in all three image prompts and before `IMPORTANT LAYOUT INSTRUCTIONS`; when omitted, empty or whitespace-only, no `Additional guidelines` line appears.
  - Verify: `cd server && npm test` and `cd server && npx tsc --noEmit` pass
- [ ] 6. Client field. Add `otherGuidelines: string` to the client `CampaignBrief` and `''` to the form's initial brief. Add the "Other Guidelines" textarea as the last field in the Guidelines & References card: `.textarea-field`, 3 rows, the agreed placeholder, `maxLength` 300, and a right-aligned muted `<length>/300` counter. Add component tests: label and placeholder render; `maxLength` is 300; the counter shows `0/300` and updates as the user types; the field comes after Competitor References; submitting a valid form passes the typed `otherGuidelines` to `onSubmit`.
  - Verify: `cd client && npm test`, `cd client && npx tsc --noEmit` and `cd client && npm run build` pass
- [ ] 7. Docs. Add "other guidelines" to the Campaign Brief Form field list in README.md.
  - Verify: `grep -n "other guidelines" README.md` prints a match
- [ ] 8. Full check run across both packages.
  - Verify: `cd server && npm test && npx tsc --noEmit && npm run build` and `cd client && npm test && npx tsc --noEmit && npm run build` all pass

**Done when:** every box above is checked and the final full check run passes.
