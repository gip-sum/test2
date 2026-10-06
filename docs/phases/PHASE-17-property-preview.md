# Phase 17 — Property preview

## 1. Scope
Owner-only buyer-style preview of a saved draft, warnings, uploaded image gallery, pricing, seller information and final review confirmation. No publication, public listing URL or buyer contact actions. Phase 18 remains separate.

## 2. UX
Preview from the draft editor first saves pending answers. My drafts also links directly to saved previews. Incomplete drafts still show valid sections with specific missing/invalid warnings and edit links. Confirmation requires valid entry/details/location/pricing, at least one ready photo, no pending photos and a seller display name. Unknown maintenance stays unknown; zero deposit remains zero. Confirmation explicitly says nothing is published.

## 3. Technical
Pure preview model validates saved fields using existing posting validators. Server queries remain behind lib/preview/queries.ts. Gallery, price, detail, area and seller components are reused. Authenticated photo URLs bypass the public image optimizer. A server-generated SHA-256 covers draft revision, saved content, ordered photo records and seller display name. Confirmation re-reads sources and compares the displayed signature to reject stale views. Store the confirmed revision/signature privately; later changes invalidate its displayed status. Publishing must independently revalidate stored bytes and current content.

## 4. Data
Introduce property_draft_reviews: draft identity, owner, confirmed draft revision, content signature and confirmation time. One review per draft; owner RLS and owned-draft predicate on writes. No changes to draft or media data. Profile data used for display name only; email and phone never appear in preview or client payloads.

## 5. Edge cases
Incomplete/invalid fields, zero deposit, unknown maintenance, studios, area conversions, no/failed/pending photos, expired auth, foreign draft, unavailable profile/media/review provider, stale revision, reordered/replaced photos, name changes and repeated confirmation. Provider errors are not empty data or successful confirmation. A confirmation is a review acknowledgement, not property verification or publication.

## 6. Accessibility
Existing keyboard/swipe/full-screen gallery, clear warning headings, labelled sections, live confirmation status and 44px controls. One page h1. Checkbox explicitly confirms accuracy before submission; error feedback stays visible. Link back to edit and profile.

## 7. Responsive
Preserve green theme/logo and buyer-page section order. Mobile single column and desktop sidebar. Verify 390/412/768/1280px and long names/addresses.

## 8. Verification
Pure-model tests for missing fields and sale/rental/studio conversion. API tests for auth/origin/validation/stale signatures. PostgreSQL RLS checks for reviews. Browser checks for saving before preview, private gallery, warnings, confirmation, changed-content invalidation and foreign/guest access. Existing verify/build/shots/light/search and draft/photo checks remain gates.

## 9. Production readiness
Apply review migration and check live policies before deployment. Record tests actually run. Real-account production verification is distinct from simulator checks. No Phase 18 work is authorized by this phase.

### Verification record — 2026-10-06
- `npm run verify`: lint, TypeScript and 372 tests across 28 suites passed.
- `npm run build -- --webpack`: production build passed.
- `npm run preview-db-check`: eight real PostgreSQL policy/revision checks passed in PGlite.
- Model/API/query/render tests cover incomplete data, rental zero deposit, unknown maintenance, area conversion, private gallery URLs, omitted unknown facts, stale draft/photo/name signatures, provider failure and confirmation persistence.
- `preview-check` is added to CI with guest/foreign access, saving before preview, gallery, confirmation, changed-content rejection, missing-field warnings and four viewport sizes. It has not run successfully locally: starting the server fails at `uv_interface_addresses` because network-interface access is denied. The existing browser gates also remain pending for this commit. No visual screenshot review is claimed.
- Migration `20261006151400_phase_17_draft_reviews.sql` was applied live on 2026-10-06. Rollback-only live owner, stale/current revision, foreign and anonymous checks passed. No new security-advisor findings. Application push/deployment checks are in progress; real-account production verification remains pending.
