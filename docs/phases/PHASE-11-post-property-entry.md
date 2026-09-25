# Phase 11 — Post property entry flow

**Status:** Implemented; production browser verification pending.

## 1. Scope

Build the beginning of the seller journey at `/post`: choose whether the poster is an owner, agent or builder; whether the property is for sale or rent; and its property type. End with a clear review of these choices and a path back to edit each one. This is the first part of the guided posting workflow. Phase 12 collects property facts, Phase 13 collects location, Phase 14 price, Phase 15 photos, Phase 16 creates resumable saved drafts, and Phase 18 publishes. No listing or account role is created in this phase.

## 2. UX requirements

All existing Post property entry points open a useful page. Show one decision at a time, three labelled stages, immediate selection, and a clear Back link. Each choice explains what the seller is selecting, and the review screen displays all three. A signed-out visitor can explore the steps. Explain plainly that choices live in the page link and are not saved to an account. The final screen offers a return to editing, and explains that the following property-details stage is being prepared; do not imply a listing has been submitted or stored.

## 3. Technical requirements

Server-render `/post` with the Next.js App Router and normal links, so the entire flow works without JavaScript. Put parsing and canonical URL construction in `lib/posting/entry.ts`, independent of presentation. Keep the three values in query parameters (`role`, `intent`, `type`) and derive the current stage from the first missing value. Changing an earlier answer discards later answers, which may no longer apply. Do not rely on browser memory or a client-only wizard. Continue to use the shared `PageShell` and the existing Post navigation.

## 4. Data requirements

Use the existing `SellerType`, `Intent`, `PropertyTypeCode`, and property-type labels. The entry values are transient and contain no private information, so they may live in the URL. Do not add a Supabase table or migration: `listing_draft` belongs to Phase 16, and claiming that a URL represents a saved draft would be misleading. No sample property is created and no seller is assigned to any fixture listing.

## 5. Edge cases

Treat unknown, empty, duplicated, or excessively long parameter values as invalid; reset to the first affected step and remove later choices. Remove unrelated query parameters from canonical links. Back/forward, refresh, and a copied review link must reproduce the same stage. All property types currently supported by the search model must be selectable for each seller role and intent. Missing images are irrelevant because this flow needs no property media.

## 6. Accessibility requirements

One `h1` per state, proper navigation labels, ordered progress with `aria-current="step"`, selectable options implemented as links with descriptive text, and a visible focus ring. Targets must be at least 44 px high. The current step is conveyed by both number and text. Color cannot be the sole progress or selected indicator. Reduced-motion and reduced-transparency rules in the shared stylesheet apply.

## 7. Responsive requirements

At 390 and 412 px, stack cards and keep back navigation, the step indicator and complete choices visible without sideways scrolling. At 768 px allow a two-column selection grid; at 1280 px show a balanced content column with a supplementary guide. The footer and bottom navigation must not obscure actions on phones.

## 8. Verification

Run `npm run verify`, `npm run build`, `npm run shots`, `npm run light-check`, and `npm run search-check`. Add one focused browser flow that clicks Owner → Sell → Flat/Apartment, checks URL, review, edit/back behavior, keyboard access, invalid deep-link recovery, reload, and widths 390/412/768/1280. Check the deployed `/post` page after pushing `main`.

## 9. Production readiness

The entry flow is honest about its current limits and functional without authentication or JavaScript. Phase 11 is complete when navigation and state behavior pass browser assertions, the production build succeeds, and the main deployment serves `/post`. Future stages remain separate phases under `Phases.txt`.

### Verification in progress

- `npm run verify`: lint, typecheck, and 176 tests pass (12 suites).
- `npm run build`: passed with `/post` rendered as a dynamic route.
- HTTP route tests: all 4 entry states, a single `h1`, invalid-link canonicalisation and duplicate rejection pass.
- Local browser checks temporarily unavailable: the workspace Chromium executable was truncated; the standard Playwright download endpoint returned an invalid archive. Production browser checks remain to be run against the deployment.
