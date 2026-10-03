# 03: Other Guidelines flows from the form into the hero prompts

**What to build:** A campaign creator sees a new optional **Other Guidelines** textarea as the last field in the Guidelines & References card, types extra instructions (e.g. "no people in the shot"), and generates. All three hero image prompts (1:1, 9:16, 16:9) then include `Additional guidelines: <trimmed text>`, placed after the brand guidelines and competitor reference lines and before the `IMPORTANT LAYOUT INSTRUCTIONS` block. The layout instructions stay authoritative. Empty or whitespace-only input adds no line. Requests that omit the field still work. The missing-asset prompt and image-editor regeneration are unchanged. The full brief, including the new field, is already saved to `generation-log.json`, so no logging change is needed.

The 300-character limit is ticket 04's job, not this one's.

Source: `docs/prd-other-guidelines-field.md` (Implementation Decisions, Tasks 5–7).

**Blocked by:** 01 (Server test harness), 02 (Client test harness)

**Status:** ready-for-agent

- [ ] Client `CampaignBrief` has `otherGuidelines: string`, initialized to `''` in the form's initial brief state
- [ ] Server `CampaignBrief` has `otherGuidelines?: string` (optional, so older requests stay valid)
- [ ] The textarea is the last field in the Guidelines & References card, labelled `Other Guidelines`, using `.label` / `.textarea-field` with 3 rows, no required marker, and the placeholder `Anything else the ad should follow - e.g. no people in the shot, avoid the color red, include a 'Limited Time' badge`
- [ ] The Generate button's enabled/disabled rule is unchanged
- [ ] The hero prompt builder trims the value and, if non-empty, adds `Additional guidelines: <trimmed text>` in the agreed position. It does not frame the line as overriding the layout instructions
- [ ] HTTP test: a brief with padded text produces the trimmed line in all three image prompts, before `IMPORTANT LAYOUT INSTRUCTIONS`
- [ ] HTTP tests: field omitted, empty string and whitespace-only each produce no `Additional guidelines` line
- [ ] Component tests: label and placeholder render. The field comes after Competitor References in DOM order. After filling the required fields (brand name, campaign message, first product name) and submitting, `onSubmit` receives a brief whose `otherGuidelines` is the typed value
- [ ] README's Campaign Brief Form field list includes "other guidelines"
- [ ] `cd server && npm test`, `cd server && npx tsc --noEmit`, `cd client && npm test`, `cd client && npx tsc --noEmit` and `cd client && npm run build` pass
