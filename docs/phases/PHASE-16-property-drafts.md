# Phase 16 — Property draft and autosave

## 1. Scope
Private account-owned drafts with creation, partial answers, automatic saving, refresh recovery, cross-device resume and a draft list. Photos remain in their existing private collection, linked to the draft. No publishing or buyer preview.

## 2. UX
Start a saved draft from posting, or save the current answers and photo collection. Sign in is required. Once a draft is created, changes save after 700ms idle and before step navigation. Show unsaved/saving/saved/error states, explicit retry and a link to My drafts. Resume opens the last saved screen, including incomplete form fields. Failed saves never claim success. Recovery of unsent changes is offered from tab-local storage, scoped to owner and draft, after refresh. Cross-device access includes confirmed server saves only.

## 3. Technical
Reuse the existing server posting renderer inside a draft editor. The draft URL identifies the entity; ordinary posting URLs remain supported. Data adapters isolate REST access. Mutations require a verified account, same-origin request, bounded bodies and strict snapshot shape. Serial saves coalesce changes. Optimistic revisions reject concurrent stale writes; matching retries are idempotent. Do not overwrite another tab's changes silently. No service-role key.

## 4. Data
Introduce property_drafts with UUID identity, immutable owner and photo collection, revision, timestamps, page path and individually typed text columns for partial posting answers. Partial strings are not validated as a publishable property. Owner RLS protects reads, creates and updates; no public access. Fifty drafts per account. Collection ownership is scoped by owner, consistent with existing photo paths. Creation UUID makes retries safe. No delete UI in this phase; deletion and abandoned-photo expiry need an explicit retention policy.

## 5. Edge cases
Provider failure, expired sessions, duplicate create, lost response, two tabs/devices, rapid edits during a save, partial numeric input, blanking fields, unknown input, refresh while dirty, browser storage unavailable, old standalone photo collections. Server-side flow validation still gates later screens. Offline work is not reported as saved to the account. Recovery storage is tab-local, not a cross-device guarantee.

## 6. Accessibility
Visible live save status, explicit retry and recovery buttons, labelled draft list and resume links, existing 44px form controls and keyboard step navigation. No reliance on dragging, colour or toast-only errors. JavaScript-disabled editor explains autosave is unavailable.

## 7. Responsive
Keep green primary colour and logo. Verify 390/412/768/1280px without horizontal overflow. Draft toolbar and cards wrap at mobile widths.

## 8. Verification
Unit tests for partial snapshot validation and conversion; real PostgreSQL tests for isolation, immutable identity, revision conflict and quota; browser tests for create, typing autosave, refresh, resume in another context, navigation, blank values, failure/retry, recovery and conflict. Existing verify/build/shots/light/search gates remain required. Record actual results before completion.

## 9. Production readiness
Migration and live owner-policy checks required before release. App deployment is separate from local completion. Real-account production end-to-end verification must be reported separately from provider-simulator tests. Phase 17 is not started.

### Verification record — 2026-10-04
- Lint, TypeScript and 346 unit tests (24 suites): passed.
- Production webpack build: passed.
- Ten real PostgreSQL checks using PGlite: passed, including owner isolation, immutable identity, partial/blank values, stale revision rejection and 50-draft quota.
- Browser suite added to CI, but not executed successfully here: Chromium socket creation is denied and Next's server network-interface call is denied. The environment approval policy rejects requests for elevated access. Existing shots/light/search and the new draft browser checks therefore remain pending, not passed.
- Migration `20261004045655_phase_16_property_drafts.sql` is applied to the live database. Live owner isolation and revision checks passed in a rollback-only transaction. Browser CI and application deployment verification are pending.

### Interaction contract
Choose **Save as draft** once to create the private draft (sign-in required). From that point, partial changes autosave. Ordinary URL-only posting remains available and does not claim to be account-saved. The draft list is available from the posting toolbar; **Save & exit** waits for confirmed persistence.

### Release verification — 2026-10-04
Deployed at `7738dcad7ae5f4c11cdc37f1dcc3b3b746c52662`.
GitHub Actions run `37178550353` passed every step, including draft-check,
photo-check and existing browser gates. Live migration owner/revision checks
passed with all test rows rolled back. Production posting page and guest API
protection passed smoke checks. Real-account production draft flow remains
unverified. This supersedes the earlier local-browser block for this release.
