# 04: Enforce the 300-character limit in the form and the API

**What to build:** In the form, typing or pasting into Other Guidelines stops at 300 characters, and a live right-aligned muted counter (`<length>/300`, the first character counter in the app) shows how much room is left. On the server, `POST /api/generate` rejects a brief whose trimmed `otherGuidelines` is over 300 characters with a 400 and a clear message, before any session is created or any OpenAI/S3 call is made. Missing, empty, whitespace-only, and whitespace-padded values whose trimmed length is 300 or less are all accepted, so server and client apply the same rule. The client shows the error using the existing error display, with no changes.

Source: `docs/prd-other-guidelines-field.md` (Implementation Decisions, Tasks 4, 6, 8).

**Blocked by:** 03 (Other Guidelines flows from the form into the hero prompts)

**Status:** done

- [x] The Other Guidelines textarea has a native `maxLength` of 300
- [x] A right-aligned, muted `<length>/300` counter sits under the textarea and shows the raw (untrimmed) length
- [x] The generate route's up-front validation (alongside the existing `brandName` / products check) returns 400 with `{ error: "Invalid brief: otherGuidelines must be 300 characters or fewer" }` when the trimmed value is longer than 300
- [x] HTTP test: exactly 300 characters → 200
- [x] HTTP test: 301 characters → 400 with the exact message, and the OpenAI mock is never called
- [x] HTTP test: whitespace-padded text with raw length over 300 but trimmed length of 300 or less → 200
- [x] HTTP test: field omitted → 200
- [x] Component tests: `maxLength` is 300. The counter shows `0/300` initially and updates as the user types
- [x] Full check run passes: `cd server && npm test && npx tsc --noEmit && npm run build` and `cd client && npm test && npx tsc --noEmit && npm run build`
