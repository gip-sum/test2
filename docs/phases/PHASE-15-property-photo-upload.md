# Phase 15 — Property photo upload

## 1. Scope
Authenticated sellers upload multiple property photos after pricing review. Includes private storage, previews, compression, validation, progress, retry, deletion and keyboard-accessible ordering. This is a media collection, not a saved property draft. Phase 16 owns property autosave/resume; Phase 17 buyer preview; Phase 18 publishing.

## 2. UX
Show a sign-in link preserving the posting URL for guests. Accept JPEG, PNG and WebP, up to 20 photos, 20 MB per original and 40 megapixels. Compress sequentially in the browser to JPEG, at most 1920 pixels on the long edge and 2 MB; show preparation, upload percentage, server processing, success and actionable errors separately. First photo is the cover. Move earlier/later controls and make-cover work without dragging. Failed uploads retain their local preview and can be retried or removed. Uploaded images stay private. Explicitly state that photos are stored but listing answers are not yet saved or published.

## 3. Technical
Media adapters isolate Supabase REST/Storage. Cookie tokens remain server-only. Authenticated same-origin mutation endpoints reject oversized bodies before buffering, decode and re-encode images server-side, remove metadata and validate dimensions. UUID paths never use original filenames. Uploads are idempotent by client-generated photo ID; retries reconcile a completed upload. No fake progress: XHR measures transfer, then processing is indeterminate. Storage errors do not become empty success. Object URLs are revoked on removal/unmount. No service-role key in the browser or application.

## 4. Data
Introduce media_assets: UUID ID, owner, collection ID, original filename, SHA-256, status, bytes, dimensions, ordering and timestamps. Storage bucket is private and JPEG-only with 2 MB limit. Owner RLS applies to metadata and matching storage paths. Serialized per-owner insertion enforces 100 private assets per account and 20 per collection, including pending reservations. Reordering uses an atomic invoker RPC with complete-set validation. Deletion removes the object before its metadata. Collections are scoped to the current posting URL; the media collection ID accompanies the existing posting answers in the URL, never photo bytes, tokens or signed URLs.

## 5. Edge cases
Reject corrupt, animated, SVG, HEIC, empty, excessive-pixel and oversized images. Handle unavailable storage, lost authentication, network failure, duplicate content, partial batches, refresh during upload and stale reorder requests. Pending records can be deleted; metadata remains available for retry if storage deletion fails. Bounded upstream timeouts. No uploads before authentication. Offline errors preserve retryable items while the page stays open.

## 6. Accessibility
Label file picker, status live region, progress per file, preview names, cover label, and movement/removal actions. Controls at least 44px. One page h1. Visible focus. Disable conflicting mutations during a batch/order change. No drag-only interaction. Announce results without announcing every percentage tick. JavaScript-disabled state explains that photo upload needs JavaScript.

## 7. Responsive
Verify 390, 412, 768 and 1280px. One/two/three-column cards with wrapping filenames. Preserve green primary colour, logo, posting-flow header and mobile clearance and light theme.

## 8. Verification
Completed on 2026-10-03:
- `npm run verify`: lint, typecheck and 335 tests across 22 suites passed.
- `npm run build -- --webpack`: production build passed.
- `npm run media-db-check`: 11 PostgreSQL checks passed, covering owner isolation, anonymous denial, immutable identity, complete-set ordering and quotas.
- `npm run photo-check`: 31 browser/API checks passed with real image bytes and simulated Auth/Storage, including compression, metadata removal, progress, retry, lost responses, private previews, ownership, reorder, delete and provider failure.
- Existing shots/light checks passed; search 64, posting 87 and pricing 46 checks passed.
- Chromium 153 verification covered 390, 412, 768 and 1280px without horizontal overflow. Mobile screenshots were visually reviewed. Safari and Firefox were not tested.
- Live Supabase owner-isolation checks passed for metadata and storage objects, including foreign read/delete/upload rejection and owner reordering. Temporary test records were rolled back. Confirmed RLS enabled and private JPEG-only 2 MB bucket.

## 9. Production readiness
The existing Supabase project was restored and migration `20261003062359_phase_15_private_property_photos.sql` applied successfully. Security advisors reported no new media-policy warnings; the existing Auth leaked-password-protection warning remains unchanged.

Application changes are verified locally and await push/deployment. A real-account browser upload/delete check against production remains outstanding; local simulated-provider tests and live SQL policy checks do not establish that full production flow.

Property publishing remains Phase 18. Owner-editable metadata is never proof of a publishable asset: the publishing phase must revalidate stored bytes. Account quota bounds abandoned uploads; automated expiry is deferred until draft lifecycle retention is defined. Phase 16 autosave/resume has not been started.
