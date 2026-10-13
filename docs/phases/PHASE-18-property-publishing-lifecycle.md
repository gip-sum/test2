# Phase 18 — Property publishing & lifecycle

## 1. Scope
Listing identity, immutable submissions and photo copies, status history, submit/re-submit, withdrawal, approval/rejection, expiry and soft deletion. Owner controls live alongside the existing draft; an active submission has a public buyer page. Draft remains editable independently of submitted content. Admin dashboard/review queue (21/22), seller dashboard (19), analytics (20) and replacing the existing demo discovery inventory are outside this phase. Active listing links are shareable; no claim that existing demo searches contain them.

## 2. UX requirements
A confirmed current preview can be submitted explicitly. Submission shows Under review and stays private. Owners can inspect their immutable submitted copy, withdraw to Draft, remove a listing after a separate acknowledgement, see rejection reasons and dated history, and edit/review/re-submit rejected or expired listings. Only trusted approval makes a listing Active. Default approval lasts 90 days; an operator can choose a future expiry up to 180 days. At expiry public detail and photo access stop even if expiry maintenance has not run. Deleted is terminal. Listing removal does not erase the working draft or history.

## 3. Technical requirements
All persistence behind lib/listings/queries.ts. Verified session and same-origin bounded mutations; ownership checked before privileged work. Server-only service credential for immutable copies and transactions: an unavailable credential gives an honest unavailable state. No seller-accessible moderation endpoint. Security-invoker RPCs granted only to service_role; state transitions lock rows and use expected versions. A server-derived UUID bound to owner/draft/preview hash/listing version makes submission retries idempotent without resetting subsequent status. Revalidate stored JPEG bytes, hash, dimensions and length; re-read preview after copying to catch edits. Snapshot publication never serves working draft images. Copy failures remain private and retryable; no automatic activation. Public reads use publishable credentials and RLS, never service bypass. Public routes are dynamic/no-store.

## 4. Data requirements
property_listings identity/owner/draft/current submission/status/version/dates/reason; property_listing_submissions immutable typed property facts/pricing/location/seller fields with draft revision and preview hash; property_listing_photos manifest of immutable stored copies; property_listing_events append-only status history with owner ID or operator/system provenance. Private listing-photos bucket, only service writes; public storage read requires the current active unexpired submission. Owner SELECT policies only, no client INSERT/UPDATE/DELETE grants. Service-only submit and transition RPCs atomically append history. Scheduled expiry RPC is service-only, plus time-based public read policies prevent delayed expiry visibility.

## 5. Edge cases
Incomplete, unconfirmed, stale draft/name/media, mismatched/corrupt bytes, lost response, concurrent submissions/moderation, concurrent requests for the same reviewed version, hidden foreign rows, outages and missing server configuration. Rejection requires a reason. Deleted cannot revive. Withdrawal/expiration immediately deny public metadata/photos. Original draft changes do not mutate submitted facts or imagery. Zero deposit, unknown maintenance and original area units stay intact. History contains no profile phone/email.

## 6. Accessibility requirements
Native buttons/checkboxes with 44px targets; destructive acknowledgement; busy/disabled state; status and errors announced; named history list; gallery keyboard controls retained. Status and reasons expressed in text, not colour alone. Reload and edit links available on failures.

## 7. Responsive requirements
390/412/768/1280: cards/history/actions wrap; long reasons/title/address break; no horizontal overflow; bottom navigation clearance. Buyer photo gallery uses existing responsive Gallery.

## 8. Verification
Model transition/expiry tests; API auth/origin/body size validation; query tests for confirmed freshness, corrupt images, ownership before privilege, safe retries and copy/write failures. PostgreSQL tests exercise all states, version races, terminal delete, grants/RLS, immutable content and public expiry. Browser simulator checks submission/withdrawal/re-submission/deletion, buyer visibility/gallery and four widths. Run verify, production build and existing browser gates where executable. Record blocked checks without claiming success.

## 9. Production readiness
Apply reviewed migration, configure SUPABASE_SERVICE_ROLE_KEY server-side, run advisors and live rollback-only policy tests, configure an operator expiry schedule calling expire_property_listings, verify real account submit and review/public/withdraw flows. Operator moderate_property_listing RPC is service-only; no moderator user role or public admin endpoint is introduced before Phase 21/22. Push/deploy/live migration require release authorization for this phase. No Phase 19 work.

### Verification record — 2026-10-13
- `npm run verify`: lint, TypeScript and 401 tests across 32 suites passed.
- `npm run listing-db-check`: 40 PostgreSQL checks passed in PGlite, including every lifecycle state, terminal deletion, owner/operator boundaries, immutable snapshots/history, public expiry and photo access.
- `npm run build -- --webpack`: production build passed.
- `listing-check.mjs` is syntax checked and added to CI. It covers review-to-submit, copy failure/retry, rejection/re-submit, trusted activation, public gallery, immutable draft edits, withdrawal, deletion, guest/foreign/origin boundaries, provider outage and four widths. It has not been executed successfully here: Next.js startup fails at `uv_interface_addresses` because the environment denies network-interface access. Existing shots/light/search gates also remain pending for this implementation. No screenshot visual inspection is claimed.
- React review: async ownership checks precede service use; independent public submission/photo reads run together; server credentials stay behind queries; actions use native labelled controls, disable while pending, and reset on version/preview changes. Supabase modern keys use apikey only, while user sessions and legacy JWT keys use Bearer authentication.
- Migration `20261013175343_phase_18_property_lifecycle.sql` is prepared and locally tested, not applied live. No production credentials or expiry job were configured. No real-account production publishing/moderation flow has been tested. Push/deployment and live release checks remain pending.
- Existing discovery and saved/contact flows still use the labelled demo inventory. Active submissions are available through their public `/listing/:id` link; integrating them into discovery/contact is not claimed by this phase.


### Live release preparation — 2026-10-13
- Applied lifecycle migration as `20261013175343_phase_18_property_lifecycle.sql`.
- Applied expiry scheduler migration as `20261013175718_phase_18_listing_expiry_job.sql`; hourly job settings verified read-only.
- Live rollback-only owner/foreign/moderation/public/deletion checks passed; no test data retained. No new security-advisor findings.
- Manual immediate production expiry invocation was rejected by automatic approval review; no retry or indirect execution was performed. Scheduler verification uses a read-only cron.job query.
- Publishing credential setup is awaiting secure Supabase dashboard sign-in, which currently presents a CAPTCHA. No credential value was exposed or committed. Missing credential keeps submission honestly unavailable.
- Push/deployment and CI checks are in progress; real-account production publishing flow remains unverified.
