# 02: Client test harness for BriefForm

**What to build:** A developer can run `cd client && npm test` and get Vitest component tests running in jsdom with React Testing Library, user-event and jest-dom matchers. A smoke test renders `BriefForm` with stub props. The production build is unaffected. The ticket adds no feature behavior. It sets up the harness that tickets 03 and 04 add test cases to.

Source: `docs/prd-other-guidelines-field.md` (Testing Decisions, Task 3).

**Blocked by:** None (can start immediately; can run in parallel with 01)

**Status:** done

- [x] `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` and `@testing-library/jest-dom` are dev dependencies of the client package, and `npm test` runs `vitest run`
- [x] Tests run in the `jsdom` environment with jest-dom matchers available
- [x] Test files (`*.test.tsx`, next to the component they test, importing from `vitest` explicitly) type-check under the client's TypeScript config
- [x] Smoke test: rendering `BriefForm` with stub props shows the "Guidelines & References" heading
- [x] `cd client && npm test`, `cd client && npx tsc --noEmit` and `cd client && npm run build` pass
