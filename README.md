# GharBazaar — Kolkata property marketplace

An original property marketplace for Kolkata, built around one loop:

**Buy/Rent → Search → Property → Contact → Lead.**

> **GharBazaar is a temporary working name.** The client will approve the final
> name later. Brand-dependent values live in `lib/brand.ts`.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Plan and architecture | complete |
| 1 | Design system and application foundation | complete |
| 2 | Homepage and discovery | complete |
| 3 | Search, filters and results | complete |
| 4 | Property detail page | complete for development-fixture scope |
| 5 | Property gallery and media system | complete |
| 6 | Email OTP and Google authentication | implemented; live provider setup pending |
| 7 | Buyer profile and account area | deployed; real-account verification pending |
| 8 | Save and shortlist | implemented; real-account verification pending |
| 9 | Enquiry and lead system | implemented; real seller assignment pending |
| 10 | Phone OTP | postponed by client decision |
| 11 | Post property entry | complete and deployed |
| 12 | Property information form | implemented |
| 13 | Property location form | complete and deployed |
| 14 | Property pricing form | Implemented; review pending |
| E | 99acres interface redesign from client screenshots | Implemented and verified locally; publication pending |
| Workspace addon | Compact admin and property-owner interface, selected concept 1 | Implemented and verified; see [specification and evidence](docs/phases/ADDON-WORKSPACE-interface.md) |
| UI track | UI modernization UI-01 … UI-14, outside the 75-phase numbering | UI-01 audit, UI-02 foundation, UI-03 design-system cleanup, UI-04 animation system, UI-05 core components, UI-06 search & cards, UI-07 auth UI, UI-08 special interactions, UI-09 seller workspace, UI-10 seller analytics, UI-11 admin workspace and UI-12 buyer forms complete; see [docs/ui-modernization](docs/ui-modernization/) |

The authoritative 75-phase roadmap is [Phases.txt](Phases.txt). Acceptance
criteria are in [the Phase 4 spec](docs/phases/PHASE-04-property-detail.md)
and [the Phase 5 spec](docs/phases/PHASE-05-media-gallery.md). Phase 6's
requirements and live-readiness checklist are in
[the auth spec](docs/phases/PHASE-06-authentication.md).
The [Phase 7 account spec](docs/phases/PHASE-07-user-account.md) covers the
profile and its live-readiness checks.
The [Phase 8 shortlist spec](docs/phases/PHASE-08-save-shortlist.md) records
save behavior, ownership and verification.
The [Phase 9 lead spec](docs/phases/PHASE-09-enquiry-leads.md) records enquiry
persistence, buyer history and seller inbox readiness.

Phase 13 collects locality, sub-locality, seller-stated society name, address and optional coordinates. Its [spec and verification record](docs/phases/PHASE-13-property-location-form.md) document location validation and the combined review. Phase 14 adds sale/rental pricing, deposit, maintenance, negotiability and carpet-area rates; see its [spec](docs/phases/PHASE-14-property-pricing-form.md). Draft saving remains Phase 16.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run verify` | **lint + typecheck + test** — run before every commit |
| `npm run python-check` | Python import, local job and description-worker tests; requires Python 3.12+ |
| `npm run moderation-db-check` | Phase 22 decisions, roles, RLS, retry fencing and correction recovery against PGlite |
| `npm run moderation-check` | Private staff review and seller recovery against an isolated browser simulator |
| `npm run shots -- /` | Render routes at 320/360/375/390/412/430/768/1280 once streamed content has arrived; fail on horizontal overflow or a bottom bar outside the viewport |
| `npm run style-diff -- capture <file>` / `compare <a> <b> [report]` | Computed styles of every element on 26 screens (signed-in ones against a fixture simulator); compare two builds and list each difference |
| `npm run bundle-report` | First-load client JavaScript per route; `-- --compare docs/ui-modernization/bundle-baseline.json` for the change since UI-01 |
| `npm run light-check` | Check theme surfaces under a dark-mode browser |
| `npm run search-check` | Browser assertions for search |
| `npm run property-check` | Browser assertions for the property page, including a 360px stress width |
| `npm run saved-check` | Browser assertions for save, reload, removal and buyer isolation with a simulated provider |
| `npm run lead-check` | Browser assertions for guest enquiries, repeat leads, buyer history and seller notifications |
| `npm run media-check` | Browser assertions for gallery navigation, touch, image loading and fallbacks |
| `npm run auth-check` | Browser assertions using a local Auth API simulator (requires the environment below) |
| `npm run login-check` | Login screen: layout at four widths, controls reachable on phones, layout stability, the scene's story beats and reduced-motion picture; with the Auth API simulator environment below, every real sign-in state, the whole flow without JavaScript and by keyboard alone, a lost connection, duplicate presses, the Google button's busy state, and 44px targets at eight widths |
| `npm run post-check` | Browser assertions for the seller posting flow |
| `npm run notfound-check` | The animated 404: status codes, both actions, keyboard focus, motion and reduced motion |
| `npm run motion-check` | The motion layer: Sheet enter/exit, focus and Escape (nested too), header panels, lightbox, card touch and hover, skeleton and photo fade, the search results and chip entrance, gallery photo changes and direction, the thumbnail strip, the posting progress fill, no-JS pages, and all of it under reduced motion |
| `npm run ui-check` | Shared components: the Buy / Rent tabs at eight widths, by keyboard and touch; 44px touch targets by hit-testing; the migrated Buttons; search without JavaScript (results, chip removal, sort, pagination) and one result card per listing at eight widths |
| `npm run motion-perf` | Frame intervals and long tasks for each animation at 390px on a 4× throttled CPU (`CPU=`, `RUNS=`, `OUT=`); a measurement to compare builds, not a gate |

The browser checks need a server running (`npm run build && npm start -- -p 3100`).
Set `CHROME_PATH` if Chromium is installed elsewhere. `shots` uses `BASE`;
the other browser checks use `BASE_URL`.
It is the responsive check the plan requires at the end of every phase, and it
measures `scrollWidth` rather than relying on eyeballing a screenshot — an
earlier headless run *looked* broken at 390px when nothing was actually wrong.

## Phase 6 authentication setup

Copy `.env.example` to `.env.local` and supply your **project URL** and
**publishable key** for the intended Supabase Auth project. Never use a
service-role key. Enable email sign-in and configure the email template with
`{{ .Token }}` to deliver a six-digit OTP instead of a magic link. Set up
production SMTP, your deployment domain, and appropriate provider rate
limits. Apply `docs/migrations/006-auth-identities.sql` in that project.

To enable **Continue with Google**, also set `AUTH_SITE_URL` to the exact
origin of the deployed app (for example `https://homes.example`), enable
Google in Supabase Auth, and create a Google OAuth web client. Add your
Supabase project's callback URL (shown on its Google provider page) to
Google Cloud's authorized redirect URIs; put the Google client ID and secret
in Supabase's provider settings, never in this app. Allowlist
`https://homes.example/api/auth/google/callback` in Supabase's redirect URLs.
For local development also allowlist
`http://localhost:3000/api/auth/google/callback` and set `AUTH_SITE_URL`
to `http://localhost:3000`.

On the deployed site, verify real email delivery, invalid and expired codes,
return to `/account`, refresh and logout, plus Google consent and account
return, before considering Phase 6 complete.
Until configured, `/login` explains that sign-in is unavailable and creates
no local test account. To exercise the browser flow without a live project:

```bash
SUPABASE_URL=http://127.0.0.1:3300 SUPABASE_PUBLISHABLE_KEY=test-public-key AUTH_SITE_URL=http://localhost:3100 npm start -- -p 3100
# In another terminal, with CHROME_PATH set if needed:
npm run auth-check
BASE_URL=http://localhost:3100 npm run login-check
```

## Phase 7 buyer profiles

The account editor stores buyer details and preferences in
`public.buyer_profiles`, keyed to the Supabase Auth user. Apply
`supabase/migrations/20260924032910_phase_07_buyer_profiles.sql` to the
same project as Phase 6. The migration grants authenticated users access
to their own row through RLS; anonymous users cannot read profiles. The
contact number is optional and unverified. Once deployed, sign in with a
real account, save details, reload, and confirm persistence before marking
the live account flow complete.

## Phase 8 saved properties

Signed-in buyers save listings from the property page and cards and find them
at `/account/saved`. Apply
`supabase/migrations/20260924083858_phase_08_saved_properties.sql` to the
same Supabase project as Auth. Row policies and table grants limit saved
properties to their owner. Search still uses development listings; saved
IDs remain available for removal if a listing disappears. Browser checks use
a simulated provider; confirm a real-account save, reload and remove before
marking the live flow complete.

## Phase 9 enquiries and leads

`/account/enquiries` shows enquiries sent while signed in.
`/dashboard/enquiries` provides an inbox for sellers assigned to listings,
with notifications and lead status. Guest enquiries are stored securely but
cannot be attached to a later buyer account. Apply both Phase 9 migrations
in `supabase/migrations/` in order. Existing fixture listings have no seller
account assignment, so their enquiries are retained but nobody is notified
until a trusted operator links an actual seller to a listing. Email and
phone delivery are not enabled. The simulated browser suite passed 15/15
lead checks; the current repo suite passed 173/173 tests.

## Phase 23: users and sellers

`/admin/users` is an ADMIN-only account directory with literal name/email search,
exact account-ID lookup, seller-role/status filters and URL pagination. Account
pages show the subject's profile, submitted listings, sent/received lead activity
and immutable admin change history. Other people's lead contact details and
messages are excluded. Accounts without a saved profile are included.

Admins may assign OWNER/AGENT/BUILDER classifications or suspend/restore ordinary
marketplace accounts with a reason and explicit confirmation. Classification is
not verification or staff access; listing seller types remain unchanged. Own and
staff accounts are protected and remain operator-managed. Suspension blocks
protected actions immediately, even with existing tokens, while existing public
listings and provider sign-in remain available. `/account/access` explains the
restriction and supports checking access again or signing out.

Phase 23 is deployed at `4a7bd08` on
[the production site](https://gharbazaar-topaz.vercel.app). The migration
`supabase/migrations/20261015062324_phase_23_user_seller_management.sql` was
applied before release (recorded live by name at version `20261015071931`).
For another environment, apply it before deploying this version: access checks
deliberately fail closed if it is missing. The user explicitly identified the
first ADMIN, who was granted access and signed in for real browser verification.
Account search, seller classification, suspension/restoration, same-session
access changes and immutable history passed against a disposable test account.
Its sessions were revoked and its sign-in disabled afterward, with history kept.
Phase 24 has not started.

`npm run users-db-check` tests PostgreSQL access, RLS, histories, atomic versioned
changes, retry safety and immediate suspension/restoration. `npm run users-check`
tests the browser flow against the local Auth/REST simulator used by other phase
checks. Both are included in CI. The Phase 22 database regression also applies
the Phase 23 migration to protect correction/re-submit and moderator behavior.
`scripts/users-live-check.sql` provides rollback-only operator checks against a
real database; configure `phase23.acceptance_admin` with an explicitly authorised
existing admin ID before running it. It does not change real accounts.

## Architecture

Python handles specific tasks alongside the main backend. The read-only import
audit and automatic local inbox worker need no credentials, dependencies or hosted
service. See [python/README.md](python/README.md#local-automatic-import-checks) for
Windows and Linux commands. Python verification runs separately in CI. The optional
private AI description worker is described below; paid generation remains disabled
by the client's no-spending decision.

One Next.js application, modular inside, single deployable.

```
app/          routes, layouts, server actions
components/
  ui/         no domain knowledge — Button, Badge, StatusBadge, SmoothTabs, EmptyState, ErrorState, Skeleton
  property/   cards, gallery, price, area and property details
  navigation/ AppHeader, BottomNav, Wordmark
  layout/     PageShell
lib/
  brand.ts    brand + launch geography — single source of truth
  format/     price and area formatting (unit-tested)
  cn.ts
scripts/      shot.mjs — responsive verification harness
docs/         research, design system, specs, phase plan
```

Three rules that keep the layering honest:

1. `components/ui/` knows nothing about property. Domain folders compose it.
2. No component imports the database. Data arrives as props or via a server action.
3. `PriceDisplay` and `AreaDisplay` are components, not helpers — every price
   and every area in the product renders through them.

## Decisions worth knowing before you edit

**Typography.** Archivo (display + prices) and IBM Plex Sans (UI). Archivo
carries `U+20B9` ₹ **only in its `latin-ext` subset**, so `app/fonts.ts` must
request `['latin', 'latin-ext']` — dropping it silently falls the rupee sign
back to another font on every price. Neither face ships a usable `tnum`;
IBM Plex Sans has uniform 600-unit digit advances, which is why it replaced
the reference design system's Instrument Sans (which has no ₹ glyph at all).

**Tokens.** `app/globals.css` is the single source. Tailwind v4's `@theme`
emits each token as both a CSS custom property and a utility, so there is no
second config file to drift. Dark theme re-declares the same properties.

**TypeScript is pinned to 5.x.** TypeScript 7 builds fine but
`typescript-eslint` does not support it yet, so linting breaks.

**Area.** Carpet, built-up and super built-up are stored and displayed
separately. Never collapse them into one "area" field.

**Animation and classes (UI-02).** Motion (`motion`, pinned) is the React
animation library: `import * as m from 'motion/react-m'` inside a small client leaf
wrapped in `<MotionFeatures>`, with timings from `lib/motion/tokens.ts`
(mirrored as `--duration-*` / `--ease-*` in `globals.css`). `MotionProvider`
in the root layout applies the reduced-motion preference to every Motion
component. ESLint rejects `framer-motion`, bare `motion`, `motion.*`
components and Anime.js (approved, but installed only with the first feature
that needs a timeline). `cn()` merges conflicting Tailwind classes with a
configuration that knows the custom type, shadow and font tokens — extend it
when you add a token, or its tests fail. Default-palette and literal colours
in TS/TSX fail `lib/design/raw-colour.test.ts`. Details:
[UI-02 foundation](docs/ui-modernization/UI-02-foundation.md).

**Motion layer (UI-04).** Radix dialogs, `hidden` panels, skeletons and
photos animate in CSS (the "Motion layer" section of `globals.css`): keyframes
named `motion-*`, transform and opacity only, durations and curves from the
tokens by role — `enter` arriving, `exit` (shorter) leaving, `standard` moving.
`lib/design/motion-css.test.ts` enforces it. Motion is for content React
mounts from its own state: use `PRESETS` and `<Presence>` (no consumer yet;
the first one pays Motion's cost on its route — run `bundle-report`). Hover
effects that move things go under `@media (hover: hover) and (pointer:
fine)`. Browser checks that read the page right after a dialog opens or
closes must wait for its animation or unmount. Details:
[UI-04 animation system](docs/ui-modernization/UI-04-animation-system.md).

**No "Verified" badge.** The platform performs no verification in V0, and an
unearned trust badge is the one thing here that could do real harm.

## Documentation

- `docs/PROJECT-CONTEXT.md` — current implementation and boundaries
- `docs/PHASE-0-PLAN.md` — initial architecture and screen map
- `Phases.txt` — authoritative 75-phase roadmap
- `docs/kolkata-marketplace-screen-spec.md` — screen-by-screen behaviour
- `docs/design-system/` — tokens, brand book, component guidelines
- `docs/ui-modernization/` — the UI modernization track: audit, stage specifications, bundle baseline
- `docs/99acres-reverse-engineering-and-marketplace-spec.md` — the research

## Phase 15: private property photos

Pricing review now links to `/post/photos`. Signed-in sellers can upload up to
20 JPEG/PNG/WebP photos per collection, compress them, choose a cover, reorder,
retry failed transfers and remove photos. Originals are limited to 20 MB;
uploads and stored JPEGs are limited to 2 MB. Metadata is stripped. Collections
and previews are private; the page link retains the collection ID across refresh.
This does not save the property answers as a draft or publish a listing.

Migration `supabase/migrations/20261003062359_phase_15_private_property_photos.sql`
was applied to the existing Auth project after restoring it. It creates
`media_assets`, the private `property-photos` bucket, owner policies, quotas and
an atomic reorder function. Live PostgreSQL checks verified owner isolation for
metadata and storage objects; all test records were rolled back. The bucket is
private, JPEG-only and limited to 2 MB. The app uses the existing publishable key
and the seller's verified cookie token; no service-role secret is required.

Phase 15 was pushed and deployed at `10ae47b`; CI passed. A real-account browser
upload/delete check against production remains outstanding.
Local browser verification uses real image bytes with simulated Auth/Storage.

`npm run media-db-check` applies the migration to an ephemeral PGlite database
and exercises actual PostgreSQL row policies and quotas. `npm run photo-check`
exercises browser → API → image processing → simulated Auth/Storage, including
failures and retries. It needs an app at port 3101 with
`SUPABASE_URL=http://127.0.0.1:3300 SUPABASE_PUBLISHABLE_KEY=test-public-key`;
the script owns the simulator on port 3300. Both checks are included in CI.

## Phase 16: private drafts and autosave

Choose **Save as draft** from posting to create a private account-owned draft.
After creation, partial edits autosave, with explicit saving/error/retry states.
**My drafts** at `/post/drafts` resumes saved answers and the linked private photo
collection on another signed-in device. Unsent changes can be recovered from the
same tab after refresh; only confirmed saves are available across devices.
Revision checks reject conflicting edits from another tab/device.

Drafts have their own identity, owner, photo collection, revision and timestamps.
Partial answer fields are individual text columns, not published property facts.
Fifty drafts per account; no public access or publishing. This phase does not add
draft deletion or automatic retention cleanup.

`npm run draft-db-check` verifies actual PostgreSQL policies and revisions.
`npm run draft-check` uses the same local Auth simulator settings and Chromium
setup as `photo-check`. Phase 16 was deployed at `7738dca`; full CI passed,
including draft/photo browser checks. Its migration and live owner/revision
checks passed. Real-account production draft verification remains outstanding.

## Phase 17: private property preview

**Preview property** in the draft editor saves pending answers before opening
`/post/drafts/[id]/preview`. My drafts also links to the saved preview. The page
uses the buyer gallery, price, details, area and seller components, with private
photo delivery and explicit missing-information warnings. No email, phone,
public sharing, contact action or publishing action is added.

A valid preview with completed seller name and photos can be confirmed after an
explicit acknowledgement. The review record is bound to the draft revision,
photo records/order and display name; changes require another review. This is
an accuracy acknowledgement, never a verification badge or permission to skip
Phase 18 publishing validation. Phase 18 must revalidate stored image bytes.

Migration `20261006151400_phase_17_draft_reviews.sql` is applied live; rollback-only live access and revision checks passed. `preview-db-check` checks PostgreSQL policies; `preview-check`
uses the existing port 3101/3300 simulator setup and is included in CI. Local
browser execution remains blocked by the environment's network-interface
restriction. Phase 17 was pushed and deployed at `d62a534`; full CI passed on 2026-10-07 (run 37643769146). Real-account production verification remains pending.


### Phase 18 — publishing & lifecycle

The reviewed working draft can be submitted from **Publishing status**. Submission
pins typed property facts and separately validated photo copies. Owners can inspect
the submitted copy independently of the working draft. It stays private
as **Under review** until a trusted operator decision. Owners can withdraw, see
rejection reasons, re-submit expired/rejected listings, or acknowledge permanent
listing removal. Draft edits never change submitted facts/photos. Active listings
have a shareable `/listing/:id` buyer page; existing demo search inventory has not
been replaced. Seller dashboards (19) and admin review UI (21/22) remain separate.

Publishing requires a server-only `SUPABASE_SERVICE_ROLE_KEY`. Missing configuration
shows an unavailable state. Configure it directly in deployment settings; never
paste it into chat, commit it, or add a `NEXT_PUBLIC_` prefix. Apply the Phase 18
migration before releasing. Both lifecycle and hourly expiry migrations are now applied live. The publishing
credential is awaiting secure dashboard sign-in (CAPTCHA). Public reads use publishable credentials and RLS, never the
privileged key. Copies use the private `listing-photos` bucket with access gated
on the current active, unexpired submission.

Trusted operators use `moderate_property_listing(listing_id, expected_version,
'ACTIVE' | 'REJECTED', rejection_reason, expires_at)` with the service role or SQL
editor. Rejection needs a reason; approval defaults to 90 days (maximum 180).
No browser user can invoke moderation. The hourly trusted job for `expire_property_listings()` is configured live. Public access expires at the timestamp even
before the maintenance job records the Expired event. Keep unused private staged
copies after an uncertain commit so retries cannot destroy committed media;
operators can remove unreferenced copies after checking submission manifests.

`npm run listing-db-check` exercises lifecycle transitions and actual PostgreSQL
permissions. `npm run listing-check` uses the existing 3101/3300 simulator setup
with `SUPABASE_SERVICE_ROLE_KEY=test-service-key` (test value only), and is added
to CI. See [the phase specification](docs/phases/PHASE-18-property-publishing-lifecycle.md)
for actual verification and release prerequisites.

### Phase 19 — seller dashboard

`/dashboard` (**My properties**) shows one card per property: a working
draft and, once submitted, its listing. Status filters, sort and page live in
the URL. **Withdrawn** is derived from status history, because Phase 18
withdrawal returns a listing to Draft. Removed listings sit in a collapsed
group and are excluded from every count. Active listings within 7 days of
expiry are flagged. Withdraw uses the Phase 18 lifecycle endpoint;
submitting and removing stay on the publishing page.

Active public listings at `/listing/:id` now take enquiries.
`submit_listing_enquiry` checks inside the database that the listing is
active and unexpired. It also takes the seller from the listing owner and
refuses an enquiry from the owner. Each listing's enquiry count comes from
`seller_listing_enquiry_counts()` and links to
`/dashboard/enquiries?listing=<id>`.

Apply `supabase/migrations/20261013192641_phase_19_listing_enquiries.sql`
before relying on listing enquiries. Until it is applied, the inbox falls
back to its Phase 9 columns, and enquiry counts and the listing form say
they are unavailable. Remove that fallback in `lib/enquiry/queries.ts` once
the migration is live. `npm run enquiry-db-check` exercises the migration in
PGlite. `npm run dashboard-check` uses the 3101/3300 simulator setup. See
[the phase specification](docs/phases/PHASE-19-seller-dashboard.md).

### Phase 20 — seller listing analytics

`/dashboard/performance` shows every submitted listing's views, enquiries
and current saves for the last 7, 30 or 90 days. `?listing=<id>` adds daily
charts, the previous period as plain figures, and an enquiry rate once the
period has at least 20 views. The period and listing live in the URL.

**What counts as a view:** one browser opening a listing's public page on
one India day.
- Only while the listing is public.
- Never the owner's own visits, and never known crawlers.
- The browser is identified by a random first-party `gb-visitor` cookie,
  issued with the listing page. The database stores only a hash of that id,
  the listing and the day, purged after a day.
- Recording goes through the service-only `record_listing_view`, so it
  needs `SUPABASE_SERVICE_ROLE_KEY`.
- Days before counting began read "not tracked", never zero.

**Saving real listings:** buyers can now save them (`saved_listings`,
through `save_listing`). Sellers see how many buyers currently have each
listing saved, never who.

**Contact reveals** are not measured: Phase 10 is postponed, so no reveal
exists.

Apply `supabase/migrations/20261014032608_phase_20_listing_analytics.sql`
after the Phase 19 migration. Until it is applied:
- the performance page says data is not available yet;
- saving a real listing reports that it is unavailable;
- demo saves are unaffected.

Checks: `npm run analytics-db-check` (PGlite) and `npm run
performance-check` (the 3101/3300 simulator). See
[the phase specification](docs/phases/PHASE-20-seller-listing-analytics.md).

### Phase 21 — admin dashboard

`/admin` is a read-only control centre for platform staff:
- **Overview:** listings by status, the review queue, and lead and user
  counts. These are aggregates only; no one's contact details are shown.
- **Listings** and **Moderation:** the queue oldest first, with waits over
  48 hours flagged.
- **System status:** server settings (present or missing, never values),
  the sign-in provider, database response time, recorded migrations,
  the expiry job and backlog, and the review queue. Anything that cannot be
  checked reads "Unknown", never OK.

Staff are rows in `staff_members` (role `ADMIN`), granted only by a
trusted operator. A signed-in account that is not staff gets the ordinary
404. Every admin database function checks staff membership again itself.
Approving and rejecting arrive in Phase 22, user management in Phase 23,
and reports in Phase 24.

Apply `supabase/migrations/20261014044042_phase_21_admin_console.sql`
after the Phase 19 and 20 migrations. Then grant the first admin in the
SQL editor:

```sql
insert into public.staff_members (user_id, role) values ('<auth user uuid>', 'ADMIN');
```

`npm run admin-db-check` (PGlite) and `npm run admin-check` (3101/3300
simulator) cover the staff gate, figures and system checks. See
[the phase specification](docs/phases/PHASE-21-admin-dashboard.md).

## Python AI description addon

Saved property previews support optional seller descriptions and an AI suggestion
workflow backed by private Python queue jobs. Sellers review and save suggestions
explicitly; publication still follows the existing preview and approval flow.
AI generation stays disabled until provider/model and finite spending controls
are configured. See [the worker setup](python/README.md#private-ai-description-worker)
and [the acceptance scope](docs/phases/ADDON-PYTHON-AI-descriptions.md).

## Phase 22: listing moderation

Active ADMIN and MODERATOR accounts can open `/admin/moderation`, inspect the
immutable submitted copy and private photos, and explicitly approve, reject or
request corrections. Moderators can use moderation only; other admin sections are
restricted to ADMIN. No account can review its own listing.

Every decision records the staff account, submitted copy, reason, expiry and
listing versions. Identical request retries are safe; stale versions or copies
must refresh. Approval makes the copy public for the chosen 1–180 days. Rejection
and corrections keep it private and clear the previous preview confirmation.
Sellers see a separate “Corrections requested” status and must review/confirm
before re-submitting.

`supabase/migrations/20261014142159_phase_22_listing_moderation.sql` introduces the
workflow and was applied live. The client-designated first ADMIN was granted
through the existing `staff_members` entity during Phase 23 production acceptance.
Further staff grants remain a trusted operator's task. Never put a staff-grant
endpoint in the public app. Real-account listing approval and seller correction /
re-submit remain a separate Phase 22 acceptance item.

See [Phase 22](docs/phases/PHASE-22-listing-moderation.md) for scope and verification.
The optional `scripts/moderation-live-check.sql` is a trusted SQL-operator check
that uses synthetic records and always rolls them back. It never assigns a real
staff account or publishes real inventory. Paid AI remains disabled.
