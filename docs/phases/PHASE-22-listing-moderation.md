# Phase 22 — Listing moderation

## 1. Scope
Build the human moderation workflow: oldest-first queue, a private immutable
submission/photo review page, approval, rejection, correction requests and recorded
decision history. ADMIN and a new operator-granted MODERATOR role can review.
Moderators can access moderation only; administration stays ADMIN-only.
Add a distinct CHANGES_REQUESTED listing state with seller edit/review/re-submit
recovery. Keep the main backend in TypeScript and paid AI disabled.

Out: user management, staff self-service grants, reports, automatic moderation,
bulk decisions, changing submitted facts, paid features and the wider Phase 27
audit-log system. No new credentials, paid service or AI requests.

## 2. UX requirements
Each queued listing opens `/admin/moderation/:id`. Show saved facts, description,
private submitted photographs, seller type/name, submission time, current status
and recent decisions. Approval explains that the copy becomes public, with a
1–180-day validity (default 90). Rejection and correction require a 5–2,000-character
reason shown to the seller in full. Every decision requires explicit confirmation.
Staff cannot decide their own listing. Completed reviews remain readable; decision
controls appear only while UNDER_REVIEW. Refresh after a decision; keep retryable
input on outages. An empty queue is honest; failed reads are errors, never zero.
Queue pagination lives in the URL. Sellers see “Corrections requested”, the reason,
and the existing edit → preview → confirm → re-submit flow.

## 3. Technical requirements
Persistence/storage access only in `lib/moderation/queries.ts`; pure validation in
`lib/moderation/model.ts`. Verified sessions, staff checks, same-origin bounded POST
and private/no-store responses. PostgreSQL repeats live role/revocation checks.
Public RPC wrappers are SECURITY INVOKER; narrowly scoped private implementations
are SECURITY DEFINER with empty search paths and explicit caller gates. No client
table-write privileges. Photo reads use the reviewer JWT and a staff-scoped storage
policy, never a public URL or service-key bypass. Decisions lock staff membership
and the listing, bind version plus submission ID, and use a UUID request ID for
identical retries. Changed payloads cannot reuse an earlier request ID.

## 4. Data requirements
Add append-only `moderation_actions`: request ID, listing/submission identity,
reviewer identity, action (APPROVE/REJECT/REQUEST_CORRECTION), reason, approval days,
expiry, before/after versions and timestamp. Composite FKs bind the saved copy to
its listing. RLS exposes only a seller's own history and active reviewers' history;
anon has no grant, and no client may insert/update/delete. Decision and existing
listing-status event commit together. Introduce CHANGES_REQUESTED in the existing
listing status constraints, submit eligibility and seller/admin display models.
Historical Phase 18 operator events remain historical events, not invented new
moderation records. Seeded tests are labelled and contain no real contact data.

## 5. Edge cases
Guest, ordinary buyer/seller, revoked staff, moderator versus admin, own listing,
missing/removed listing, concurrent reviews, withdrawn/re-submitted listing,
lost response/retry, mismatched request ID, missing or invalid expiry/reason,
Unicode and control characters, long content, corrupt/missing photo, database or
storage outage, absent migration. A stale decision never affects a newer copy.
Correction requests are private; public access stops for every non-active state.
Rejection/correction clears the earlier preview confirmation atomically. The
seller must confirm a fresh preview before re-submitting.

## 6. Accessibility requirements
Ordered h1/h2/h3 headings, native radio/textarea/number/checkbox/button controls,
labels and reasons in words, 44px targets, keyboard-only review/confirmation,
announced busy/result/error states and focusable recovery. Current navigation is
marked. Photos have labelled alternatives and the existing keyboard gallery.

## 7. Responsive requirements
Verify at 390, 412, 768 and 1280. Review facts and actions stack on phones; reasons,
addresses and titles wrap. No page overflow; preserve the green theme/logo. Admin
pages retain their existing hidden phone bottom bar. Seller pages retain clearance.

## 8. Verification
Unit tests cover validation, state eligibility, API bounds/access/origin, query
projection and errors. PGlite tests cover roles, owner isolation, immutable actions,
three decisions, correction re-submit, revocation, request idempotency, stale
versions/submissions and photo RLS. A browser simulator proves private review,
photos, all three decisions, stale/outage recovery, URL pagination, seller recovery,
keyboard/44px targets and all four widths. Provoke slow/error states in the
simulator. Run verify, Python checks, build and all retained browser/database gates.

## 9. Production readiness
Apply the additive migration after local database checks; inspect live schema and
advisors, run rollback-only security/decision tests, then push main and confirm the
production deployment and full CI. Do not duplicate older migrations that were
applied outside the migration register. An operator must grant the intended real
staff account; do not infer or elevate an account from its email. Real-account
approval and seller correction/re-submit remain separate from simulated tests
until an authorised staff account exists. No migration test may publish real data.

### Verification and release record — 14 October 2026

- Application verify: lint, TypeScript and 520 tests across 50 suites passed.
  Python: 55 tests passed. The production webpack build passed.
  The default production build uses Webpack after CI caught a Turbopack Google-font
  import-map resolver failure; the typography and all verification gates remain.
- PGlite: 49 moderation checks passed, including concurrent decisions, independent
  reviewers, moderator/admin boundaries, private photographs, append-only audit,
  three outcomes, identical retries, stale copies, immediate revocation and fresh
  preview confirmation before correction re-submission. Existing admin (38) and
  listing-lifecycle (41) database gates also passed.
- Migration `phase_22_listing_moderation` was created through Supabase CLI 2.120.0
  and applied to the existing production project. Live rollback-only tests in
  `scripts/moderation-live-check.sql` passed; all synthetic data was rolled back.
  Security advisor findings are unchanged from the pre-migration baseline.
- The browser simulator provokes saving, outage, lost-response and read-error
  states, and is added to the existing full CI workflow. Local Chromium is absent;
  remote CI is the browser release gate, without a claim of local screenshots.
- React review: only IDs/version reach the client decision form; facts and history
  remain server-rendered. Confirmation resets on edits, identical retries keep the
  request UUID, controls are native/labelled, and client pending states prevent
  repeated submissions. Staff checks precede reads and repeat in PostgreSQL.
- Production currently has zero active staff accounts. No account was elevated.
  A trusted operator must grant the intended account ADMIN or MODERATOR before
  real-account moderation can be verified. Paid AI remains disabled.
