# Workspace interface — selected concept 1

Status: implemented and verified on 15 October 2026. The client selected Workspace after reviewing three design concepts. This is an interface add-on; Phase 24 is not started. Deployment history is recorded in the release pull request.

## 1. Scope
Redesign existing admin and property-owner workspaces using the selected light, compact layout: dedicated navigation, a slim header, consistent toolbars, structured property/account/listing rows and clear detail sections. Cover admin overview, listings, moderation, users, account details and system checks; owner properties, enquiries and performance. Keep all existing workflows. Public discovery, posting steps, buyer account pages, backend authority and new product domains are outside scope.

## 2. UX requirements
Use the existing GharBazaar logo and green identity. Give admin, moderator and owner the correct navigation. Replace large vertical gaps and repeated explanatory panels with a compact hierarchy. Keep status and next action visible. Desktop collections use aligned rows; phones use readable stacked rows. Sensitive actions keep their reason, confirmation and recovery. Every summary reflects actual loaded data; unavailable values are not zero. Mockup-only statistics, global search, notifications and activity tracking are not features to invent.

## 3. Technical requirements
Create a shared server-rendered workspace frame with small role wrappers, reusable styles scoped to the workspace and existing inline icons. Preserve data access seams, URL filters, pagination, server actions and API contracts. Do not introduce a component framework or redesign global public styles. Use existing role checks before data reads. Keep privileged controls and user contact data within their existing boundaries.

## 4. Data requirements
No migration or new entity is needed. Existing query results supply all live values. Property photos in the visual concept are not permission to fabricate thumbnails: use actual accessible photos if safely available through the existing seam, otherwise a truthful property icon/placeholder. Do not expose draft/private media in public or unauthorized contexts.

## 5. Edge cases
Empty collections, long names/emails/IDs, all property states, many filters, large counts, missing photos, unavailable metrics, loading/read errors, stale mutations, moderator-only accounts, protected staff/self accounts, pagination and keyboard back/refresh. Preserve removed listings and histories without giving unavailable actions.

## 6. Accessibility requirements
One h1 per screen, labelled landmarks and controls, current navigation, native forms and details, visible focus, meaningful status text, screen-reader labels for row actions, at least 44px interactive targets and accessible contrast. Keep information and controls reachable with the keyboard; compact cannot mean clipped content or hover-only actions.

## 7. Responsive requirements
Verify 390, 412, 768 and 1280px. Desktop has approximately 216px sidebar, 64px top bar and 24–25px title. Mobile keeps role navigation readily reachable and gives content full width. No page horizontal overflow, lost actions or fixed chrome covering the last row.

## 8. Verification
Run lint, strict types, all application tests and production build. Run required responsive screenshots, light theme and search checks plus affected admin, users, moderation, owner dashboard and performance browser flows. Add a focused workspace layout check if existing flows do not measure navigation, responsive rows or density. Capture actual implemented admin and owner pages. Review TSX changes for React quality and preserve meaningful behavioral assertions.

## 9. Production readiness
Ship only after the affected flows and required checks pass. Review the implemented interface against concept 1 at desktop and phone widths. Verify the release commit and deployed routing if published. Record evidence and any remaining limitations here. Do not claim mocked photos/counts or simulator checks are real production account activity.

### Verification record — 15 October 2026

- `npm run verify`: lint, strict types and all 551 tests across 55 files passed. On this Windows host, test transforms use a dedicated writable `TEMP`/`TMP` directory.
- `npm run build`: production build passed. Existing Google font downloads required normal network access.
- `npm run shots`: public routes had no horizontal overflow at 390, 412, 768 and 1280px. `light-check` passed under a dark-mode browser; `search-check` passed all 64 assertions.
- Local isolated API simulators: `admin-check` 124, `users-check` 92, `moderation-check` 34, `dashboard-check` 72 and `performance-check` 102 assertions passed. These include existing permissions, mutations, failure/recovery behavior and data checks; they are not real production account activity.
- Added shared measurements for the 216px rail, slim header, title density, phone navigation, ordinary row heights, one main/title/current role destination, overflow, 44px chrome controls, header pointer hits, the account link's accessible name and visible keyboard focus. All four required widths passed. Explicit focus reveal fixes a partially clipped final navigation item in Chromium.
- Actual admin and owner screens were visually reviewed at desktop and phone widths. Review fixed mobile header stacking, a hidden account-link name, summary styles affecting explanatory performance notes and missing mobile review affordances. React review found no remaining actionable issues.
- The first full CI run exposed an existing login-scene assertion that compared absolute clocks across a changing set of finished and paused effects. The test now retains each effect, verifies every clock holds offscreen and checks resumed elapsed time with finite end-time capping. Production animation code is unchanged. Public sign-in checks passed 117 assertions; configured sign-in passed 138. A temporary negative control injected 200ms into one infinite effect and was rejected by the unchanged <20ms drift limit.

The existing summaries do not carry safely accessible property thumbnails; the interface uses a building glyph. No backend, migration, authority boundary or production account data was changed. Existing delayed/error semantics remain covered by the domain suites; no new loading/error boundary was introduced.
