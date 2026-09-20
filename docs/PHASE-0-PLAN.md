# Phase 0 — Product, UX & Technical Plan (V0)

**Date:** 2026-09-20 · **Status:** awaiting sign-off. **No application code written.**
**Inputs inspected:** repository (4 commits, documentation only), the 99acres reverse-engineering research, the Kolkata Marketplace Design System (tokens + 19 components), the screen-by-screen spec, the master roadmap workbook, and the V1 Product Blueprint.

---

## 1. Current state

### 1.1 Repository

Branch `claude/99acres-research-spec-zjmiir`, 4 commits, **documentation only — there is no application code, no `package.json`, no scaffolding.** Phase 1 starts from an empty tree.

| Path | What it is | Verdict |
|---|---|---|
| `docs/99acres-reverse-engineering-and-marketplace-spec.md` | 28-section research. URL grammar, lead model, SEO technique, trust scoping — all confidence-rated | **Authoritative** for *why* |
| `docs/design-system/` | tokens.json, compiled tokens.css, brand book, 19 components with previews | **Authoritative** for visual language — with corrections below |
| `docs/kolkata-marketplace-screen-spec.md` | 26 screens, 50 acceptance criteria | **Authoritative** for screen behaviour — except routes |
| `docs/Property_Marketplace_Master_Roadmap.xlsx` | 213 tasks, 24 phases | Superseded as a build order by §9 here; keep as the project tracker |
| `docs/Kolkata-Marketplace-Design-System.html` | Offline export of the design system | Reference only, generated |

### 1.2 Environment — verified, not assumed

| Check | Result | Consequence |
|---|---|---|
| Node | **v22.22.2** | Fine for Next 16 |
| npm registry | reachable | `npm install` works here |
| Next.js latest | **16.3.5** | App Router, stable |
| Tailwind latest | **4.3.3** | **Major:** v4 is CSS-first. See §4.2 |
| Google Fonts | reachable (HTTP 200) | `next/font/google` can self-host at build time |

Earlier in this project Chromium failed to load Google Fonts — that was a **CA-trust issue in the browser binary, not an egress block**. `curl` and Node reach `fonts.googleapis.com` normally. Font builds will work.

---

## 2. Contradictions found

Twelve. Each needs one answer before code is written, because each one is expensive to change afterwards.

### C1 — Route grammar is incompatible between documents `MUST FIX FIRST`

| Source | Pattern |
|---|---|
| Screen spec | `/kolkata/flats-for-sale`, `/kolkata/new-town/2-bhk-flats-for-sale` |
| **This brief** | `/buy/{city}`, `/rent/{city}`, `/buy/{city}/{locality}` |

These cannot coexist. **Recommendation: adopt the brief's structure.** It is newer, it puts intent first (which matches how the product is modelled — Buy and Rent are different products, not filter values), and it keeps the city segment free to become a real geography dimension later. The screen spec's grammar is retired.

### C2 — The posting wizard has two different step counts

Blueprint §9 and the screen spec specify **6 steps**. This brief specifies **8** (splitting actor and property type, splitting photos from details, and making Publish its own step).

**Recommendation: 6 screens, 8 logical steps.** Actor + property type are one screen (they are two taps), and Publish is a confirmation on the Preview screen, not a screen of its own. Fewer screens is measurably better for completion rate, and the 8-minute target is the binding constraint. The step *indicator* shows 6.

### C3 — Listing lifecycle enum differs

| Source | States |
|---|---|
| Blueprint / screen spec / design system | `DRAFT · UNDER_SCREENING · ACTIVE · REJECTED · EXPIRED · SOLD · RENTED · DELETED · REPORTED` |
| This brief | `draft · under_review · active · rejected · expired · deleted` |

**Recommendation: use the brief's six, renaming `UNDER_SCREENING` → `UNDER_REVIEW`.** Add `SOLD_OR_RENTED` as a seventh, because "mark as sold" is required for catalogue freshness — the single biggest trust problem in this category. `REPORTED` is **not** a lifecycle state; it is a flag plus a `report` row, because a listing can be reported while active. The design system's `StatusPill` README needs updating to match.

### C4 — Launch geography

Blueprint: "Kolkata only". This brief: "Kolkata / West Bengal".

**Recommendation: Kolkata city only for V0 data, with the schema and routes supporting state.** `/buy/kolkata` works on day one; `/buy/howrah` becomes possible without a migration. Seeding locality data for all of West Bengal is a data-acquisition project that would delay launch for inventory we will not have.

### C5 — The body typeface cannot render the rupee sign `BLOCKING`

The brief asked me to validate typography rather than assume it. I inspected the actual font binaries from Google Fonts:

| Font | Subset | Glyphs | `U+20B9` ₹ | `tnum` | Digit widths |
|---|---|---|---|---|---|
| **Instrument Sans** | latin | 208 | **no** | yes | 391–666 (proportional) |
| **Instrument Sans** | latin-ext | 123 | **no** | no | — |
| **Archivo** | latin | 230 | no | yes | 575–577 (near-uniform) |
| **Archivo** | latin-ext | 262 | **yes** | no | — |

Two concrete findings:

1. **Instrument Sans has no ₹ glyph in any subset.** Every price on the site would fall back to a different font for the currency symbol — a visible defect on the most important element in the product. It is not usable as the body face here.
2. **Archivo carries ₹ only in `latin-ext`.** If the build loads only the `latin` subset (which is `next/font/google`'s default), prices break the same way. **The build must request `subsets: ['latin', 'latin-ext']`.**

**Recommendation: keep Archivo for display and prices; replace Instrument Sans with IBM Plex Sans.** Candidates tested, all of which carry ₹:

| Candidate | Digit spread | `tnum` | Note |
|---|---|---|---|
| **IBM Plex Sans** | **600–600 (0%)** | no — unnecessary | Uniform by design; excellent at 13px |
| Source Sans 3 | 472–472 (0%) | no | Also uniform |
| Noto Sans | 572–572 (0%) | yes | Has a true Bengali sibling |
| Inter | 833–1323 (37%) | yes | The AI-default face; works but has no voice |
| Plus Jakarta Sans | 371–732 (49%) | yes | Widest jitter of the set |

IBM Plex Sans wins on the two things this product actually needs: **uniform digits without relying on a font feature**, and clarity at the 13–15px sizes where most of this interface lives. It is sober and engineered-feeling rather than fashionable, which suits a high-value transaction.

**Indic support:** neither Archivo nor Instrument Sans nor IBM Plex Sans supports Bengali. Verified: `Noto Sans Bengali` is the only tested family that does. Multi-language is out of V0 scope, so this is **not a V0 problem** — but the family stack should be authored so Bengali drops in later as a script fallback rather than a replacement.

### C6 — Token vocabulary does not match the brief's list

The brief names tokens the design system does not have. Mapping, with two genuine gaps:

| Brief asks for | Design system | Gap? |
|---|---|---|
| background | `surface-100` | rename only |
| surface | `surface-000` | rename only |
| surface elevated | `surface-raised` | rename only |
| border | `border-subtle` / `border-strong` | ok |
| text primary / secondary / muted | `ink-900` / `ink-700` / `ink-500` | rename only |
| brand / brand hover | `brand-600` / `brand-700` | ok |
| **success** | — `trust-600` doubles as it | **real gap** |
| warning / danger | `warn-600` / `danger-600` | ok |
| supply accent | `supply-600` | ok |
| focus | `focus-ring` | ok |

**Recommendation: keep the design system's names as canonical** (they are more precise — `trust` and `success` are genuinely different meanings) and publish a documented alias layer so the brief's vocabulary resolves. **Add a distinct `success` token** so "Saved" and "Verified" stop sharing a colour. Also: `neutral-600` currently duplicates `ink-500`'s exact value — collapse it.

### C7 — Radius scale is wider than specified

Brief: 4 / 8 / 12 / pill. Design system: 4 / 6 / 8 / 12 / 16 / pill.

**Recommendation: trim to the brief's four.** `radius-sm` (6px) and `radius-xl` (16px) each appear in exactly one component and are not earning their place.

### C8 — PostGIS is specified but V0 has no geographic query

The brief defers map search, radius search and price trends. Locality filtering is a relational join on the location tree, not a spatial query.

**Recommendation: no PostGIS in V0.** Store `latitude` / `longitude` as plain numerics on `property` so the data is being collected from day one, and enable PostGIS in the migration that first needs it. This removes an extension, a set of indexes and a class of local-setup friction for zero lost capability. *This is the single clearest piece of over-engineering carried in from the earlier documents.*

### C9 — The backend framework question is now answered

Decision **D-02** has been open since the research phase. This brief resolves it: Next.js App Router with server actions and route handlers, and a `lib/` layer for domain logic. **No separate backend service.** Recording it as settled.

### C10 — The design system ships a "Verified" badge the product cannot honour

`Badge` includes **"Verified photos"**, and the design system correctly scopes it. But the brief is explicit: *"Do NOT invent verification claims"* — and V0 has **no verification mechanism at all** (guided photo capture is not in the V0 scope).

**Recommendation: no "Verified" badge in V0.** Ship the badge component, but with only the honest V0 values: seller type (Owner / Agent / Builder), "New", and "Price reduced". Verification returns when the platform actually performs a check. Shipping an unearned trust badge is the one thing in this plan that could do real harm.

### C11 — Gallery supports media V0 does not collect

The `Gallery` component has Photos / Video / Floor plan tabs. V0 collects photos only.

**Recommendation: photos only in V0**; the tab strip renders only when more than one media type exists.

### C12 — "Similar properties" — previously conflicting, now settled

The research document contradicted itself (decision **D-14**). The blueprint and this brief both include it. **Settled: in V0**, matched by locality → type → BHK → ±20% price, no ML.

---

## 3. Over-engineering to remove

Carried in from the earlier planning documents, and cut here:

| Carried in | V0 decision |
|---|---|
| 32-table data model | **12 tables** (§8) |
| PostGIS + spatial indexes | Deferred (C8) |
| Transactional outbox | Deferred — it exists to sync a search index we are not building |
| `SAVED_SEARCH`, `SEARCH_EVENT`, `REVIEW`, `LOCALITY_STATS`, `PRICE_HISTORY` | Deferred |
| `PROJECT`, `PROJECT_CONFIGURATION`, `AGENT_PROFILE`, `BUILDER_PROFILE` | Deferred (roles still exist on `user`) |
| `PLAN`, `SUBSCRIPTION`, `PAYMENT`, `PROMOTION`, `QUOTA_LEDGER` | Deferred — nothing is charged in V0 |
| `VERIFICATION_REQUEST` | Deferred (C10) |
| Perceptual image hashing pipeline | **Store the hash column, skip the pipeline.** Cheap to populate later, impossible to backfill if the column never existed |
| Zustand | **Not installed in V0.** URL is the state; nothing else is global yet |
| TanStack Query | **Only from Phase 3**, and only for the search/typeahead surfaces that genuinely re-fetch |
| 19 design-system components | **14 in V0**; `LeadRow`, `StepIndicator` arrive in Phase 5–6, `RangeControl` in Phase 3 |

---

## 4. V0 architecture

### 4.1 Shape

One Next.js application. Modular inside, single deployable.

```
Browser
  │
  ├─ Server Components  → data access via lib/, rendered on the server
  ├─ Route Handlers     → /api/* for typeahead, search count, uploads, webhooks
  └─ Server Actions     → mutations: draft save, publish, enquiry, moderation
            │
            ▼
      lib/  (domain layer — no React, no JSX, unit-testable)
   auth · location · property · search · lead · media · moderation · validation
            │
            ▼
   PostgreSQL (source of truth)   ·   S3-compatible object storage
```

**The rule that keeps this honest:** UI components never import `db`. They call `lib/*`. A component that needs data receives it as props from a server component, or calls a server action. This is what makes the eventual extraction of a service cheap, and it costs nothing now.

### 4.2 Tailwind v4 changes the token story — for the better

Tailwind 4 is CSS-first: `@theme` in CSS generates both the utilities and the CSS custom properties. The brief asks for "CSS variables + Tailwind utilities", and v4 makes that **one system instead of two** — no `tailwind.config.js` duplicating token values, no drift between a JS config and a stylesheet.

```css
@import "tailwindcss";
@theme {
  --color-brand-600: #0b5563;   /* → var(--color-brand-600) AND bg-brand-600 */
  --radius-md: 8px;
  --spacing-4: 16px;
}
```

Dark theme overrides the same custom properties under `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`, exactly as `docs/design-system/tokens.css` already does. **The existing compiled `tokens.css` is the input to this, not a thing to rewrite.**

### 4.3 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript (strict) | SSR is a hard requirement for the SEO model |
| Styling | Tailwind v4 + `@theme` tokens | One token system (§4.2) |
| Database | PostgreSQL 16 | Source of truth. **No PostGIS in V0** |
| Access | Prisma | Typed queries, real migrations; raw SQL for the search query |
| Search | Postgres: B-tree + GIN, `pg_trgm` for typeahead | Per brief. No OpenSearch |
| Forms | React Hook Form + Zod | Zod schemas shared between client and server action |
| Server state | TanStack Query — **Phase 3 onward only** | Typeahead and count endpoints. Not for page data |
| Client state | **None initially.** URL is the source of truth | Zustand only if a real need appears |
| Media | S3-compatible + presigned upload, `sharp` in a route handler | Keeps bytes off the app server |
| Auth | Own phone-OTP + JWT (httpOnly cookie) | Roles and quotas are core domain |
| Fonts | `next/font/google`, **`subsets: ['latin','latin-ext']`** | Self-hosted at build; ₹ requires latin-ext (C5) |
| Testing | Vitest (lib/) + Playwright (3 critical journeys) | Test the domain layer and the loop, not the markup |

**Not installed:** Zustand, OpenSearch, Kafka, Docker orchestration, GraphQL, any UI kit. Radix primitives are added **only** when the first dialog/sheet needs a focus trap — hand-rolling that is where accessibility quietly breaks.

---

## 5. Screen map — V0

**21 screens.** Anything not listed is not built.

| # | Screen | Route | Render | Access | Indexed |
|---|---|---|---|---|---|
| 1 | Home | `/` | SSG + ISR | public | yes |
| 2 | Buy — city | `/buy/kolkata` | SSR | public | yes |
| 3 | Rent — city | `/rent/kolkata` | SSR | public | yes |
| 4 | Buy — locality | `/buy/kolkata/{locality}` | SSR | public | yes, gated |
| 5 | Rent — locality | `/rent/kolkata/{locality}` | SSR | public | yes, gated |
| 6 | Paginated results | `…/page/{n}` | SSR | public | yes |
| 7 | Search (app surface) | `/search?…` | client + API | public | **noindex** |
| 8 | Property detail | `/property/{slug}-p{publicId}` | SSR | public | yes |
| 9 | Property unavailable | same route, **HTTP 410** | SSR | public | 410 |
| 10 | Log in / Register | `/login` | client | public | no |
| 11 | Saved properties | `/account/saved` | SSR | buyer | no |
| 12 | My enquiries | `/account/enquiries` | SSR | buyer | no |
| 13 | Profile | `/account/profile` | SSR | any | no |
| 14–19 | Post property, 6 steps | `/post/{draftId}/{step}` | client + actions | seller | no |
| 20 | My properties | `/dashboard/properties` | SSR | seller | no |
| 21 | Enquiries received | `/dashboard/enquiries` | SSR | seller | no |
| 22 | Admin — listings queue | `/admin/listings` | SSR | admin | no |
| 23 | Admin — review listing | `/admin/listings/{id}` | SSR | admin | no |
| 24 | Admin — users | `/admin/users` | SSR | admin | no |
| 25 | 404 / 500 | — | static | public | no |
| 26 | Terms / Privacy | `/terms`, `/privacy` | static | public | yes |

**Indexation gate:** a locality page is indexable only above a minimum active-listing count (proposed **5**); below it, `noindex` plus a link to the city page. Uncontrolled indexation of near-empty pages is the classic cause of site-wide SEO demotion.

**Deliberately absent:** admin dashboard (the listings queue *is* the dashboard in V0), admin moderation as a separate section (it is the review screen), admin reports (no reporting UI until there is inventory to report), buyer account hub (the three account pages are reachable from the nav directly).

---

## 6. Search state model — the single most important design decision

Both indexable routes and `/search` resolve to **one normalised object**:

```ts
type SearchQuery = {
  intent: 'buy' | 'rent'
  city: string                 // slug
  localities: string[]         // slugs, multi-select
  propertyTypes: PropertyType[]
  priceMin?: number            // rupees, integer
  priceMax?: number
  bedrooms: number[]
  areaMin?: number             // sqft, carpet
  areaMax?: number
  furnishing: Furnishing[]
  availability?: 'ready' | 'under_construction'
  sellerType: SellerType[]
  amenities: string[]
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'newest'
  page: number
}
```

- `parseSearchParams(url) → SearchQuery` and `toSearchParams(q) → string` are **pure functions in `lib/search/`, unit-tested first.** Every route and component uses them; nothing parses query strings inline.
- The pretty route supplies `intent`, `city`, `locality`; the query string supplies the rest.
- **State changes are URL changes.** Refresh, Back/Forward, sharing and returning from a property all work for free because there is no second source of truth to fall out of sync.
- `replaceState` for refining a filter, `pushState` for a real navigation — so Back is predictable.
- Result count comes from a separate cached count query so the Apply button can say **"Show 248 properties"** without waiting for the rows.

---

## 7. Component architecture

```
components/
  ui/            Button Field Select Chip Badge StatusPill Sheet Modal Toast
                 Skeleton EmptyState Pagination        ← no domain knowledge
  property/      PropertyCard PropertyCardHorizontal PriceDisplay AreaDisplay
                 SpecGrid AmenityList Gallery SellerBlock SimilarProperties
  search/        SearchBar IntentTabs LocationTypeahead SortControl
                 ResultGrid ResultCount ActiveFilterChips
  filters/       FilterRail FilterSheet PriceRange AreaRange BedroomFilter
                 PropertyTypeFilter AmenityFilter SellerTypeFilter
  navigation/    AppHeader BottomNav Breadcrumbs Footer
  forms/         FormField PhotoUploader StepIndicator OtpInput
  seller/        DraftCard ListingRow EnquiryRow ListingStats
  admin/         ModerationRow ReviewPanel AuditTrail UserRow
  layout/        PageShell Section StickyBar
```

Three rules:

1. **`ui/` knows nothing about property.** It can be lifted into any product. Domain folders compose it.
2. **Presentational components take data, not queries.** No component imports `lib/db`.
3. **`PriceDisplay` and `AreaDisplay` are components, not helpers.** Every price in this product formats identically (`₹ 62.5 L`, `₹ 42,000 /mo`) and every area carries its basis (`1,240 sqft carpet`). Centralising them is what stops the two most damaging content inconsistencies in Indian property listings.

---

## 8. Data model — V0

**12 tables.** Everything else is deferred (§3).

```
user ──1:N── property ──1:N── property_media
 │              │ N:1
 │              ├──── location (self-referencing tree)
 │              ├──── property_type (ref)
 │              └──M:N─ amenity  (via property_amenity)
 │
 ├──1:N── favorite ──N:1── property
 ├──1:N── inquiry   ──N:1── property        (buyer side: from_user_id)
 ├──1:N── session
 └──1:N── otp_challenge

moderation_event ──N:1── property, user     (append-only)
audit_log        ──N:1── user               (append-only)
```

| Table | V0 purpose | Notes that matter |
|---|---|---|
| `user` | buyer / owner / agent / builder / admin | `roles` is an **array** — one person is often both. One account per phone |
| `session` | refresh tokens | revocable; phone change revokes all |
| `otp_challenge` | code hash, purpose, attempts, expiry | never store the code itself |
| `location` | country → state → city → locality → sub-locality | self-referencing `parent_id` + materialised `path`; `aliases[]` for Bengaluru/Bangalore-class problems; denormalised `active_listing_count` drives the SEO gate |
| `property_type` | reference | drives which fields the wizard shows |
| `property` | the listing | see below |
| `property_media` | photos | `kind` discriminator so video/floor plan need no new table; `phash` column present but unpopulated |
| `amenity` + `property_amenity` | grouped, filterable | `value` column on the join so "Parking: 2" needs no schema change |
| `favorite` | shortlist | PK `(user_id, property_id)` |
| `inquiry` | **the business** | `type: ENQUIRY \| CONTACT_VIEW`, `contact_snapshot` frozen at creation, `dedupe_key` unique |
| `moderation_event` | approve / reject / request-change, with reason | append-only |
| `audit_log` | who did what to which record | append-only |

**Four non-negotiables in `property`:**

1. **Three area columns** — `carpet_area`, `builtup_area`, `super_area`, plus `area_unit`. Never one generic `area`. Carpet is required; the other two optional.
2. **`public_id`** — short, non-sequential, prefixed (`p_8f3c2a`). Internal `id` is a bigint and never appears in a URL. Sequential public IDs leak inventory volume and invite enumeration.
3. **`status`** — the C3 enum, enforced as a state machine in `lib/property/`, not by convention.
4. **`latitude` / `longitude`** — plain numerics, collected from day one, unused in V0 (C8).

**The one thing to get right in `inquiry`:** the row is written **before** a phone number is returned, and `dedupe_key = hash(property_id, from_user_id, type, date)` is `UNIQUE`. Seller contact fields are never serialised into any response before a reveal — enforced at the `lib/property/` selector, not in the component.

---

## 9. Implementation order

Each phase ends with: `lint` → `typecheck` → `test` → responsive check at **390 / 412 / 768 / 1280** → empty, loading and error states verified. No phase starts while the previous one has a known regression.

| Phase | Deliverable | Done when |
|---|---|---|
| **1** | Scaffold, tokens, fonts, app shell | Header + bottom nav render at all four widths; tokens drive every colour; `₹1,25,00,000` renders correctly in both faces |
| **2** | Homepage | A visitor reaches a results URL in one interaction; LCP ≤ 2.0s on throttled mobile |
| **3** | Search + results | `parseSearchParams`/`toSearchParams` round-trip under test; filter and sort changes never lose state, **including on API error**; skeletons match final card height |
| **4** | Property detail | Contact bar reachable at every scroll position; area basis labelled everywhere; CLS ≤ 0.05 with gallery loading |
| **5** | Auth + posting wizard | A real listing is posted from a 390px viewport in under 8 minutes; refresh mid-form loses nothing |
| **6** | Seller dashboard + enquiries | Enquiry reaches the seller; phone reveal writes the inquiry **first**; no contact field in any pre-reveal payload |
| **7** | Admin + moderation | Reject requires a reason; every decision writes one audit row |
| **8** | SEO / performance / a11y | Budgets met on 5 routes; structured data validates; keyboard-only completion of search and enquiry |

**Sequencing note:** Phase 5 (supply) before Phase 6 (the lead loop) and before any seeding, because a marketplace with no listings cannot be tested by buyers. Phases 2–4 can be built against seeded fixture data in parallel with 5 if more than one person is working.

---

## 10. Decisions needed before Phase 1

Six block the first commit. The rest can be answered during the phase that needs them.

| # | Decision | Why it blocks | Recommendation |
|---|---|---|---|
| **1** | **Brand name + domain** | The wordmark, `metadata`, OG images, email sender and every canonical URL depend on it | — |
| **2** | **Route grammar** (C1) | Routing is the first thing built and the most expensive to change after indexing | Adopt this brief's `/buy/{city}/{locality}` |
| **3** | **Body typeface** (C5) | Loaded in the root layout in Phase 1 | Archivo (display, `latin`+`latin-ext`) + **IBM Plex Sans** (UI) |
| **4** | **Drop PostGIS for V0** (C8) | Changes the DB setup and the migration baseline | Yes — keep lat/lng columns |
| **5** | **No "Verified" badge in V0** (C10) | Ships a trust claim the platform cannot honour | Agree — seller type only |
| **6** | **Seller roles at launch** | Determines the wizard's first screen and moderation load | Owner + Agent + Builder as roles; **no public agent/builder profiles** |

Answerable later: OTP provider and DLT registration (Phase 5 — **start the registration now, it has a lead time**), object storage provider (Phase 5), free-listing quota (Phase 5), listing expiry period (Phase 6), hosting and managed Postgres (Phase 8).

---

## 11. What "done" means for V0

The loop closes end to end:

1. A seller posts a real listing from a phone and it goes live after review.
2. A buyer finds it through search, with no interaction losing state.
3. The buyer enquires, and reveals the phone after OTP.
4. The seller sees that enquiry and can act on it.
5. An admin can approve, reject with a reason, and the decision is audited.
6. The listing and its locality page are indexable; thin pages are not.
7. LCP ≤ 2.0s, CLS ≤ 0.05, INP ≤ 150ms, TTFB ≤ 400ms on a throttled mid-range Android.

Not "the website works". The loop closes.
