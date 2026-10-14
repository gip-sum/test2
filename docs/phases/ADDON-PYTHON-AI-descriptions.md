# Python addon — AI property descriptions and background jobs

## 1. Scope
Add an owner-only description editor to the saved property preview, optional descriptions in immutable submissions/public listings, and durable Python AI generation jobs. Next.js remains the main backend. Generation is seller initiated; queue delivery, bounded retries and status updates run automatically. No autonomous publication, price predictions, photo analysis, moderation decisions or new roadmap phase.

## 2. UX requirements
Manual editing works without AI credentials. Generate uses complete saved property facts, with an explicit disclosure that coarse facts go to the configured AI provider. Output is an editable suggestion, never automatically saved. Saving increments the draft revision and requires a fresh preview confirmation. Queued/running/failed/finished states persist across refresh. A result from an older revision cannot be saved without reviewing the current draft. Provider failures show honest errors, never simulated AI output.

## 3. Technical requirements
Data access stays in `lib/descriptions/queries.ts` and the Python worker adapter. Owner requests use verified sessions and same-origin mutations. Owner reads use their JWT under RLS. Privileged creation/worker mutations are narrowly scoped RPCs executable only by service_role. Queue messages contain a job UUID only. Vercel Services hosts the Next.js frontend and private Python service; native Python Queues subscribers handle delivery. Both products are beta and deployment support must be verified. The worker calls the documented AI Gateway chat-completions REST API; model is explicit configuration, not a guessed default. Dependency versions are pinned.

## 4. Data requirements
Nullable bounded plain-text descriptions on drafts and submission snapshots. A new `property_description_jobs` table records owner/draft/revision/signature, validated coarse facts, model, lifecycle, lease token, attempts, generated output and safe failure code. Unique draft signature/model prevents duplicate logical jobs. Owner-only SELECT; no anonymous access or owner direct writes. Database quotas: 5 new jobs per owner per UTC day, 100 globally; maximum 3 provider attempts per job. Leases fence stale workers. Facts exclude name, email, phone, street address, coordinates, photos and existing prose. Test fixtures are synthetic and never inserted into production.

## 5. Edge cases
Missing configuration disables generation but permits manual descriptions. Reject incomplete/foreign drafts, stale revision/signature, oversized bodies and invalid text. Duplicate delivery cannot claim a valid live lease. An expired lease can be reclaimed; stale completion cannot overwrite output. Transient provider failures retry, permanent failures stop. A final bounded attempt becomes failed. Uncertain dispatch can be retried with the same queue idempotency key. Enqueue success alone does not mean completion. At-least-once delivery cannot guarantee at-most-once provider billing after a crash; the quota reserves all bounded attempts. Expired queued jobs display a failure rather than indefinite progress. Database outages remain errors, not empty results.

## 6. Accessibility requirements
Labelled textarea, visible character count and provider disclosure. Controls at least 44px high, status/error messages announced, keyboard-accessible actions and sequential section headings. Generated text renders as text, never HTML. Focus remains in the editor during progress updates.

## 7. Responsive requirements
Stacked controls on phones; wrapping text and no page overflow at 390, 412, 768 and 1280. Existing bottom-navigation clearance and green brand tokens are retained.

## 8. Verification
Unit tests cover validation, privacy projection, configuration, ownership/version conflicts and failed queue dispatch. Python tests cover bounded prompts, provider responses/failures, duplicate leases, fencing and retry outcomes using fake adapters (no paid calls). PGlite checks owner/foreign/guest privileges, quotas, idempotency, lease/retry/fencing, saved revision and immutable submission persistence. Browser checks cover manual save, refresh, confirmation reset, queued/finished/failed states, inaccessible foreign/guest data and all four widths. Existing verify/build/layout/theme/search and lifecycle checks remain required. Loading and failures are provoked with simulator responses, not production fault injection.

## 9. Production readiness
Apply tested additive migration, verify security advisors, deploy both services and verify private subscriber registration. Enable AI only after the operator explicitly configures a supported model, Gateway access and a finite Gateway spending limit; no live paid inference or budget changes during implementation. `AI_DESCRIPTION_ENABLED=true`, `AI_GATEWAY_MODEL` and `SUPABASE_SERVICE_ROLE_KEY` are required. Vercel OIDC is preferred on deployment; a private `AI_GATEWAY_API_KEY` may be used outside Vercel. Queue region is fixed to iad1. Activation needs an actual owner test through generate → review/edit → save → confirm → submit, plus queue retry verification. Until then, report implementation/test status separately from live activation. Do not publish or approve a listing on the seller's behalf.

### Implementation verification record

- `verify`: lint/typecheck and 503 TypeScript tests passed.
- `build`: production Next.js build passed.
- Python: 34 tests passed; the installed queue SDK registers the private subscriber.
- Database: 27 description checks and 41 lifecycle checks passed; existing media, draft, preview, enquiry, analytics and admin SQL checks passed.
- The additive migration was applied live. Owner/foreign/guest access, lease fencing and description revision were checked in a rollback-only transaction; all seeded rows were removed by rollback. Security advisors reported no new notices for this addon.
- Local Chromium download returned an invalid archive. Full CI verification passed on code commit `afe831e8a32025d84afd85780d53809e5a8a3a6c`: [run 38549638850](https://github.com/gip-sum/test2/actions/runs/38549638850). The description browser check and all existing browser/layout/theme/search checks passed. The simulator provoked queued, running, successful, stale, failed-save and polling-error states.
- Live inference, actual queue delivery and real seller publication remain activation checks. Generation is disabled until model/access and the operator's spending allowance are configured.
