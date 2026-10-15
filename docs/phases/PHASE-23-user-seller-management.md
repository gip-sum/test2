# Phase 23 — User & seller management

**Status: Complete and deployed.** Production release and real-account acceptance
verified on 15 October 2026; see the release record below.

## 1. Scope
Admin-only account search and detail pages, seller role assignment, reversible
marketplace suspension, submitted listing history, lead activity, and an immutable
record of account changes. Search includes accounts without a buyer profile.
Seller roles are OWNER, AGENT and BUILDER; an unset role is shown as unassigned.
They do not confer staff access or assert verification.

Out: staff grants/revocation, account deletion, impersonation, editing contact
details, bulk changes, exports, reports (24), professional profiles (41/43) and
the general audit system (27). Existing staff remain operator-managed.

## 2. UX requirements
Add Users & sellers to the admin navigation. `/admin/users` searches by name,
email or exact account ID, with status/role filters and pagination in the URL.
`/admin/users/:id` shows provider identity, buyer profile details (phone explicitly
unverified), dates, current marketplace status/role, submitted listings and lead
activity. Each history has independent URL pagination and totals; missing data
is stated, failed reads never become empty lists. Lead activity shows direction,
listing, status and date without exposing other people's contact details/messages.
Suspension blocks protected account actions, including existing tokens, but does
not unpublish approved listings or ban provider sign-in. Explain these effects.
Changes require a reason and explicit confirmation. Keep input on outage, permit
identical retries, and ask for refresh on stale versions. No self-management or
management of staff accounts. No account is automatically promoted or suspended.

## 3. Technical requirements
Use `lib/users/queries.ts` for persistence, pure validation/types in `model.ts`,
server-rendered pages and one client change form. Verified user + live ADMIN
membership precede reads/writes; PostgreSQL repeats gates. Public RPCs are
SECURITY INVOKER over private narrowly scoped SECURITY DEFINER implementations
with empty search paths and explicit grants. Use bounded same-origin POST,
no-store responses, UUID request IDs, optimistic versions and locked account rows.
Suspension checks are live database state, never user-editable metadata or cached
JWT claims. Restrictive RLS fences private tables/storage; privileged entry points
also check status, including service-role listing operations on behalf of a user.
Marketplace access checks fail closed during an outage, with a recovery message.

## 4. Data requirements
Add account management rows keyed to auth.users: ACTIVE/SUSPENDED, nullable seller
role, version and timestamps. Absent row means active/unassigned/version 0; do not
infer seller roles from a historical listing. Add append-only account actions:
UUID request, subject, actor, reason, old/new status and role, versions, timestamp.
No client table writes; admin reads through explicit projections. Never expose
passwords, tokens, provider metadata or unrelated buyer contact details. Search
uses literal case-insensitive substrings, bounded 100-character input, stable
ordering and 25-row pages. Index account filters and history foreign keys. Literal
substring name/email search needs measured query plans before a larger inventory;
a B-tree expression index would not accelerate an arbitrary substring.
Role assignment classifies the account; per-listing seller types and immutable
submitted snapshots remain factual choices, not proof of professional status.
Suspended accounts can sign out and read their own access
status so the interface can explain why protected actions are unavailable.

## 5. Edge cases
Guests, buyers, moderators, revoked/suspended admins, missing profiles/users,
Unicode, wildcard characters, duplicate query parameters, excessive offsets,
missing migrations, provider outages, lost save responses, simultaneous admins,
changed retry payloads, invalid/no-op changes, self/any staff target and deleted
accounts. Suspension/restoration must work without token renewal. Existing public
listings stay public; historical lead and listing counts remain truthful.

## 6. Accessibility requirements
Native labelled search/select/textarea/checkbox/button controls, visible focus,
44px targets, one h1, ordered headings, current navigation, text status badges,
announced saving/saved/error states and refresh recovery. Keyboard-only search,
detail and confirmed change flow must pass. Reasons wrap and preserve line breaks.

## 7. Responsive requirements
390/412/768/1280: stacked account cards and histories on phones, wider grouped
details at desktop, wrapping UUID/email/reasons, no page horizontal overflow.
Retain admin bottom-bar rules and the green theme/logo.

## 8. Verification
Unit tests: parsing, validation, explicit projections, API auth/origin/body bounds,
errors and conflicts. PGlite: all access boundaries, account search including no
profile, literal wildcards, pagination, histories/totals, role/status changes,
immutability, idempotency, version conflicts, staff/self protection, immediate
suspension across RLS/storage/privileged RPCs and restoration. Browser simulator:
search/filters/reload, detail/history, confirmation, saving/outage/stale/retry,
empty/error/missing states, keyboard/targets, four widths and suspended recovery.
Run verify/build, new database/browser gates and retained phase regression gates.

## 9. Production readiness
Do not claim completion until the standard gates and Phase 23 checks pass. Record
local versus simulated versus live evidence separately. The additive migration
must be verified before production application. A trusted operator still grants
the first real staff account; no automatic elevation. Real-account search/change
verification requires an authorised ADMIN and a designated test account. End at
Phase 23, with Phase 24 proposed separately.

### Local verification record — 15 October 2026

- `npm run verify`: lint, strict TypeScript and 551 tests in 55 suites passed.
- `npm run build`: production Webpack build passed with all new dynamic routes.
- `npm run users-db-check`: 78 PostgreSQL checks passed, including direct API/RLS
  bypass attempts, private storage, existing tokens, restoration, staff protection,
  immutable history, independent histories and concurrent optimistic versions.
- `npm run users-check`: 52 browser checks passed, including forced saving, storage
  outage, lost response, identical retry, stale version and access-check outage.
  Native keyboard controls, 44px targets and overflow were checked at all four
  widths. Full-page captures were inspected; long names and emails wrap.
- Standard shots, light-check and search-check passed (64 search assertions).
  All eight retained database suites passed. Admin, moderation, authentication,
  shortlist, enquiries, drafts, photos, preview, publishing, seller performance
  and description browser regressions passed. Seller dashboard: 47 checks passed
  using installed Chrome; the downloaded headless shell lacks system clipboard
  support, so its clipboard assertion is not a product failure.
- The unchanged Python addon suite has Windows-specific filesystem assumptions:
  55 discovered, 5 failures, 1 error and 3 skipped on the bundled Windows Python.
  Unix permission bits and file identity/snapshot behavior cause these failures.
  Python code is unchanged. Linux CI remains the full Python release gate.
- At the end of local verification, production activation remained pending. The
  production release and real-account evidence are recorded separately below.

### Verification report: account management

**Story:** An ADMIN finds an account, reviews its activity, confirms a reasoned
status/role change, and sees the recorded result; the subject's existing session
immediately observes a suspension or restoration.

| Boundary | Status | Evidence |
|---|---|---|
| UI renders | Passed | Directory/details and long-content screenshots at 390/412/768/1280; labelled controls and 44px targets |
| Client → API | Passed | Browser asserts confirmed POST, same request ID after lost response, 409 refresh recovery; API tests cover origin/identity/body bounds |
| API → data | Passed | 78 PGlite checks, production rollback-only checks and real signed-in admin changes through the deployed app |
| Data → response | Passed | Exact UUID/version confirmation, explicit projection, truthful independent history totals; no unrelated lead contacts |
| Response → UI | Passed | Browser confirms change history, immediate suspension recovery and restoration with the same token |
| Environment | Local and production | Local simulator plus deployed production app, live database, designated admin and disposable authenticated subject |

The source review checked native controls, server-rendered identity/history,
minimal client props, independent server work, confirmation reset on edits,
retained retry IDs and refresh recovery. No new runtime or paid service is needed.

### Production release and real-account acceptance — 15 October 2026

- PR [#5](https://github.com/gip-sum/test2/pull/5) merged as `4a7bd08` after
  [full CI passed](https://github.com/gip-sum/test2/actions/runs/38694792782).
  This includes 551 application tests, 55 Python tests, 78 account database
  checks, 52 account browser checks and every retained regression gate.
- The production migration was applied first, recorded as
  `20261015071931_phase_23_user_seller_management`. Matching by name is expected:
  the migration tool assigned its application timestamp. Earlier externally
  applied migrations were not duplicated.
- Vercel production deployment `dpl_5W9DY5EKgbope5NbqintYVGRzCpv` is READY,
  serves the merged release commit and is assigned to
  [gharbazaar-topaz.vercel.app](https://gharbazaar-topaz.vercel.app).
- The [merged release workflow](https://github.com/gip-sum/test2/actions/runs/38698179137)
  also passed in full. Final visual acceptance found the Services deployment's
  `/_next/image` endpoint returning frontend HTML 404s while source assets were
  available. Follow-up [#6](https://github.com/gip-sum/test2/pull/6) declares the
  public deployment image settings, matching Next.js sizes/formats and quality 75.
  Its deployed preview returned 200 `image/png`, a resized 160px logo (2,899 bytes,
  versus the 69,735-byte source). Image optimization remains enabled, and the
  processor remains private. Local lint, type checking, 551 tests and build pass.
- A real existing user, explicitly designated by the client, was granted ADMIN.
  The client signed into the production browser. That session searched for the
  labelled test account, opened its details, assigned AGENT and suspended it,
  then restored ACTIVE and cleared the test classification. Both confirmed
  actions appeared in immutable history with that admin as actor, versions 1/2.
- A separate, explicitly authorised synthetic account used a real provider login
  and the same access/refresh tokens throughout: before suspension `/account`
  returned 200, access was true and its profile was readable; while suspended
  `/account` redirected 307 to `/account/access`, the protected state API returned
  403, access was false and profile RLS returned zero rows; restoration returned
  200/true/one owned profile again without sign-in or token renewal.
- The test session was globally signed out, zero remaining sessions confirmed,
  its sign-in disabled and its generated credential replaced. Temporary local
  credentials/session were removed. The labelled test row and two audit entries
  remain intentionally; no real buyer/seller was suspended or reclassified.
- `scripts/users-live-check.sql` passed in production with all synthetic fixtures
  rolled back: ordinary-account denial, live admin role/search, history totals,
  idempotent retry, changed/stale request rejection, self protection, immediate
  suspension/restoration, RLS, privileged mutation denial and audit immutability.
- Security advisors introduced no new WARN findings. The three earlier public
  admin-definer warnings and Auth password setting remain the recorded baseline.
  The new `account_actions` INFO has no direct client grant/policy deliberately:
  approved admin reads and writes go through checked private RPC implementations.
  See [RLS advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
  and [definer guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Phase 23 has no remaining release or real-account acceptance tasks. Phase 24
(report property/user) is the next proposed phase and requires separate approval.
