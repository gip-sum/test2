# Phase 0 — Product, UX & Technical Plan (V0)

> **The eight-phase build order in §10 is superseded by `docs/ROADMAP.md`.**
> That was a V0 plan; the project is now an incremental production build
> across many more phases, specified one at a time in `docs/phases/`.
> Everything else in this document — the contradictions and their
> resolutions, the scope categories, the screen map, the search state
> model, the component architecture and the V0 data model — still stands.
> The working agreement governing how phases are specified, built and
> verified is in `CLAUDE.md`.

**Version 1.1** — product scope revised after the "should feel like 99acres" direction.
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
| `docs/Property_Marketplace_Master_Roadmap.xlsx` | 213 tasks, 24 phases | Superseded as a build order by §10 here; keep as the project tracker |
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

These are **technical** simplifications and they all stand. They are separate from product scope, which §5 revises upward.

Carried in from the earlier planning documents, and cut here:

| Carried in | V0 decision |
|---|---|
| 32-table data model | **14 tables** (§9) — still a two-thirds cut |
| PostGIS + spatial indexes | Deferred (C8) |
| Transactional outbox | Deferred — it exists to sync a search index we are not building |
| `SAVED_SEARCH`, `SEARCH_EVENT`, `REVIEW`, `LOCALITY_STATS`, `PRICE_HISTORY` | Deferred |
| `PROJECT`, `PROJECT_CONFIGURATION`, `AGENT_PROFILE`, `BUILDER_PROFILE` | Deferred (roles still exist on `user`) |
| `PLAN`, `SUBSCRIPTION`, `PAYMENT`, `PROMOTION`, `QUOTA_LEDGER` | Deferred — nothing is charged in V0 |
| `VERIFICATION_REQUEST` | Deferred (C10) |
| Perceptual image hashing pipeline | **Store the hash column, skip the pipeline.** Cheap to populate later, impossible to backfill if the column never existed |
| Zustand | **Not installed in V0.** URL is the state; nothing else is global yet |
| TanStack Query | **Only from Phase 3**, and only for the search/typeahead surfaces that genuinely re-fetch |
| 19 design-system components | All 19 are needed — see §5. `LeadRow` and `StepIndicator` arrive in Phase 5–6, `RangeControl` in Phase 3 |

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

---

## 5. Product scope — what "feels like 99acres" actually requires

### 5.1 The distinction this section exists to draw

My first pass scoped V0 for implementation convenience and produced a generic `Home → Search → Property → Contact` MVP. That was the wrong trade. A property marketplace that a buyer will trust with a ₹60 lakh decision has to feel substantial on the first visit, and a thin one does not.

But "substantial" is widely misdiagnosed as *more content verticals* — projects, builders, price trends, reviews, guides. It is not. Studying the research, what actually makes a large property portal feel like one is **depth inside the core loop**:

| What creates the feeling | What it costs |
|---|---|
| ~20 filters with live facet counts, grouped and sensible | fields + one count query. **No new tables** |
| A result count in the H1, the page title, the chips and the Apply button | one cached query |
| A governed matrix of city × intent × type × BHK × budget landing pages | routing + slug resolution. **No new tables** |
| Internal link clusters on every results page | generated from the location tree |
| A property page with 10+ real sections, not 4 | columns on `property` |
| Cards dense enough to compare without opening | fields |
| Location discovery — popular localities, multi-select, counts per suggestion | the location tree already models this |
| A seller dashboard with lifecycle states and per-listing numbers | three counter columns |
| Moderation with reasons, reports and an audit trail | two small tables |

Almost all of it is **fields, routes and interaction quality** — not entities. Which is why V0 can be genuinely 99acres-like in experience while staying at 14 tables.

What *does* cost a second data model — projects with configurations and payment plans, builder profiles, agent directories, locality statistics, reviews, editorial — is exactly the set that can follow the core without making the launch feel thin, because **none of it is on the path from "I want a 2 BHK in New Town" to "I contacted the owner."**

**The organising rule for V0: go deep on the loop, defer the verticals.**

### 5.2 CORE 99ACRES-LIKE EXPERIENCE — in the first release

All twenty areas, with what "deep enough" concretely means.

| # | Area | What ships in V0 | Why it is core |
|---|---|---|---|
| 1 | **Homepage / search-first discovery** | Intent tabs, multi-locality search, popular Kolkata localities, budget and BHK entry tiles, recent listings rail, supply CTA, trust band | It is the router into search. A homepage that cannot get you to a filtered result in one interaction fails the product's only job |
| 2 | **Buy / Rent intent** | Separate namespaces, separate field sets, separate funnels. Switching keeps localities and clears budget, and says so | Buy and Rent are different products with different economics. Modelling them as a filter value is the mistake that makes a marketplace feel amateur |
| 3 | **Location discovery** | Typeahead grouped by city / locality / sub-locality / society, **with listing counts per suggestion**; multi-select chips; popular-locality chips; city hub page; alias resolution | Location is how Indians search for property. Counts beside suggestions measurably improve selection. This is a top-three "feels real" signal |
| 4 | **Property search** | One normalised query object serving both the indexable routes and `/search` | The spine of the product |
| 5 | **Advanced filters** | **~20 filters**: type, budget, BHK, carpet area, bathrooms, furnishing, floor, facing, age, availability, construction status, parking, amenities (grouped), seller type, posted-since, photos-only. Live facet counts, correct exclusion semantics, zero-count options shown disabled | The clearest single differentiator between a serious portal and a listings page. Five filters feels like a directory; twenty with counts feels like a marketplace |
| 6 | **Sort** | Relevance (default), Price ↑, Price ↓, Newest, Area, Price per sqft | Explicit sorts must be pure — nothing interleaved. Users detect violations immediately |
| 7 | **Search results** | Count in H1 and title, applied-filter chips, sort control, dual pagination (crawlable `/page/n` + infinite scroll), SEO copy block, internal link clusters, FAQ block | The internal-link clusters are the connective tissue that makes a portal feel deep rather than flat |
| 8 | **Property cards** | Price, config with **area basis**, title, locality, three attributes, seller type, freshness, photo count, save. Horizontal on phone, vertical on grid | The unit of comparison. Dense but not cluttered — maximum two badges |
| 9 | **Property detail page** | Gallery · price + per-sqft · config · address · **full spec grid** (type, status, floor/total, facing, age, furnishing, parking, bathrooms, balconies, availability, ownership) · grouped amenities · description · society/project name · nearby landmarks (text) · seller block · similar properties · breadcrumbs · FAQ · internal links · report | Four sections feels like a classified ad. Twelve feels like a property portal. This is mostly columns, not complexity |
| 10 | **Gallery** | Swipe / arrows / keyboard, counter, fullscreen lightbox, lazy beyond first, photos-only in V0 | Photos are the most-used element on the page |
| 11 | **Seller / agent information** | Type (Owner / Agent / Builder), name, agency where applicable, member-since, active listing count, response indicator | Posted-by is a top-three buyer filter. A faceless listing converts worse and trusts worse |
| 12 | **Enquiry / contact** | Enquiry form with message, prefilled from profile, dedupe, seller notification | The lower-friction half of the lead loop |
| 13 | **OTP / contact reveal** | Form → OTP → **inquiry written first** → reveal → seller notified. Rate-limited, deduplicated | The monetisable event, instrumented from day one even though nothing is charged |
| 14 | **Save / shortlist** | Optimistic, replays after login, persists across devices, dedicated page | Primary retention action in a months-long decision |
| 15 | **Similar properties** | Locality → type → BHK → ±20% price, widening if thin. No ML | Keeps users on site after they reject a listing |
| 16 | **Post Property** | Full 6-screen wizard, autosave from first blur, config-driven fields, ≤30 photos with reorder and cover, description sanitisation, completeness score, true preview, submit for review | Supply is the scarce side. A weak posting flow starves the marketplace |
| 17 | **Seller dashboard** | Lifecycle tabs, per-listing **views / saves / enquiries**, edit, renew, mark sold, withdraw, enquiry inbox with status and notes | Where the seller's perceived value lives, and the reason they come back |
| 18 | **Listing lifecycle** | draft → under_review → active → rejected / expired / sold_or_rented / deleted, with plain-language labels and specific rejection reasons | Lifecycle is a product feature, not an implementation detail |
| 19 | **Moderation** | Queue oldest-first, review screen, approve / reject with mandatory reason / request changes, **report listing** by users, audit trail | Listing quality *is* the product. Without it the catalogue rots in weeks |
| 20 | **SEO city / locality landing pages** | Governed matrix: `/buy/kolkata`, `/buy/kolkata/{locality}`, `/buy/kolkata/{filter-slug}` for BHK, budget band, property type and ready-to-move. Live counts in titles, canonicals, thin-content gate, breadcrumbs, structured data, segmented sitemaps | The primary acquisition channel *and* a major part of feeling large. Hundreds of genuine, inventory-backed pages — never thousands of thin ones |

### 5.3 NEXT RELEASE — v1.1 and v1.2, after the loop is proven

Each of these is a real marketplace feature. Each is deferred for a reason that is about *readiness*, not laziness.

| Feature | Target | Why it waits |
|---|---|---|
| **Saved searches + alerts** | v1.1 | The strongest retention mechanism in a months-long purchase — but it needs enough inventory that "3 new matches" is true. Sending an alert that fires once a fortnight teaches people to ignore you |
| **Map search** | v1.1 | High feel-value, but the map library is typically the single largest frontend dependency and V0's LCP budget is 2.0s. It also needs coordinate data quality that only accumulates once sellers have posted. We collect lat/lng from day one so this is a pure frontend add |
| **Locality profile pages** (connectivity, landmarks, character) | v1.1 | Distinct from the SEO landing pages, which already capture the search intent. Profiles need editorial or sourced content that does not exist at launch — and a locality page with three empty sections is worse than none |
| **Agent profiles + directory** | v1.2 | Agents are the eventual paying cohort, but a profile page is only credible with a portfolio behind it. Agent *identity* ships in V0 on the listing; the *destination page* waits for volume |
| **Reviews & ratings** | v1.2 | Needs a user base first. An empty review section actively damages trust — it advertises that nobody is here |
| **Guides / articles** | v1.2 | Ranks for informational queries that listings can never win, which is real value. But it is an ongoing editorial commitment, not a build task, and it competes for the same launch attention as inventory |
| **Promoted / featured listings + payments** | v1.2 | Do not monetise before proving lead quality. Charging on thin liquidity is how marketplaces die. The quota and lead accounting are built in V0 so this is a commercial switch, not a rebuild |

### 5.4 FUTURE PLATFORM — v2 and beyond

| Feature | Why it is a platform-scale project |
|---|---|
| **Projects (new construction)** | A second full data model: configurations, floor plans, payment plans, possession dates, RERA registration, construction status. Different buyer psychology and a different sales motion. The highest-value advertising inventory, and the heaviest single build on this list |
| **Builder profiles + microsites** | Depends on Projects existing first. Builders have the largest marketing budgets in the category, which makes this commercially attractive and architecturally expensive |
| **Price trends** | Needs years of listing history plus statistical rigour and a minimum sample size. Publishing a trend computed from four listings destroys the credibility of every other number on the site |
| **Home-loan tools + lender referral** | A mortgage lead is worth far more than a listing lead, but it needs partner integrations and compliance work. The EMI calculator alone is cheap and could be pulled forward as an SEO asset |
| **Advanced recommendations / learning-to-rank** | Needs traffic volume before it can learn anything. Deterministic ranking is better than a model trained on nothing |
| **OpenSearch / dedicated search cluster** | Only when Postgres stops meeting the latency budget — a measured trigger, not a milestone |

### 5.5 What this revision costs

Honestly: V0 roughly doubles in build effort versus the thin version, concentrated in Phases 3, 4 and 7 (filters, PDP depth, moderation). Two tables are added. The architecture, stack and technical simplifications are unchanged — nothing here reintroduces PostGIS, a search cluster, an outbox or a state library.

The trade is deliberate: a marketplace that feels thin on launch day does not get a second look from either side of the market.

---

## 6. Screen map — revised

**31 screens.** Additions over the previous draft are marked ★.

| # | Screen | Route | Render | Access | Indexed |
|---|---|---|---|---|---|
| 1 | Home | `/` | SSG + ISR | public | yes |
| 2 | Buy — city | `/buy/kolkata` | SSR | public | yes |
| 3 | Rent — city | `/rent/kolkata` | SSR | public | yes |
| 4 | Buy — locality | `/buy/kolkata/{locality}` | SSR + ISR | public | gated |
| 5 | Rent — locality | `/rent/kolkata/{locality}` | SSR + ISR | public | gated |
| 6 ★ | **Filter landing** | `/buy/kolkata/{filter-slug}` — `2-bhk-flats`, `under-50-lakh`, `ready-to-move` | SSR + ISR | public | gated |
| 7 ★ | **Locality filter landing** | `/buy/kolkata/{locality}/{filter-slug}` | SSR + ISR | public | gated |
| 8 | Paginated results | `…/page/{n}` | SSR | public | yes |
| 9 ★ | **City hub / locality discovery** | `/in/kolkata` | SSG + ISR | public | yes |
| 10 | Search (app surface) | `/search?…` | client + API | public | **noindex** |
| 11 | Property detail | `/property/{slug}-p{publicId}` | SSR | public | yes |
| 12 | Property unavailable | same route, **HTTP 410** | SSR | public | 410 |
| 13 | Log in / Register | `/login` | client | public | no |
| 14 | Saved properties | `/account/saved` | SSR | buyer | no |
| 15 | My enquiries | `/account/enquiries` | SSR | buyer | no |
| 16 | Profile | `/account/profile` | SSR | any | no |
| 17–22 | Post property — 6 steps | `/post/{draftId}/{step}` | client + actions | seller | no |
| 23 | My properties | `/dashboard/properties` | SSR | seller | no |
| 24 ★ | **Listing performance** | `/dashboard/properties/{id}/stats` | SSR | seller | no |
| 25 | Enquiries received | `/dashboard/enquiries` | SSR | seller | no |
| 26 | Admin — listings queue | `/admin/listings` | SSR | admin | no |
| 27 | Admin — review listing | `/admin/listings/{id}` | SSR | admin | no |
| 28 ★ | **Admin — reports** | `/admin/reports` | SSR | admin | no |
| 29 | Admin — users | `/admin/users` | SSR | admin | no |
| 30 | 404 / 500 | — | static | public | no |
| 31 | Terms / Privacy | `/terms`, `/privacy` | static | public | yes |

**The landing matrix (screens 6–7) is the piece that makes the site feel large.** It is generated, not authored: `{intent} × {city} × [locality] × {filter-slug}` where `filter-slug` resolves against an **allowlist** of BHK values, budget bands, property types and ready-to-move. A page renders only if it clears the inventory gate (proposed ≥5 active listings); below it, `noindex` and a link to the parent. This yields a few hundred genuine pages in Kolkata alone — deep enough to feel like a portal, governed enough to avoid the thin-content penalty that this pattern causes when ungoverned.

---

## 7. Search state model

Unchanged in shape from the previous draft, extended to the full V0 filter set.

```ts
type SearchQuery = {
  intent: 'buy' | 'rent'
  city: string
  localities: string[]
  propertyTypes: PropertyType[]
  priceMin?: number; priceMax?: number          // rupees, integer
  bedrooms: number[]
  bathrooms?: number
  areaMin?: number; areaMax?: number            // sqft, carpet
  furnishing: Furnishing[]
  constructionStatus?: 'ready' | 'under_construction'
  availableFrom?: string
  ageMax?: number
  floorMin?: number; floorMax?: number
  facing: Facing[]
  parking?: boolean
  amenities: string[]
  sellerType: SellerType[]
  postedSince?: '1d' | '7d' | '30d'
  withPhotosOnly?: boolean
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'area_desc' | 'psf_asc'
  page: number
}
```

`parseSearchParams` / `toSearchParams` remain pure, unit-tested functions in `lib/search/` — the first thing built in Phase 3. Both surfaces and every landing route resolve through them. **State changes are URL changes**; there is no second source of truth to drift.

Facet counts use standard exclusion semantics: within a facet, counts reflect every filter **except that facet's own selection**. Getting this wrong is what makes multi-select appear broken.

---

## 8. Component architecture

```
components/
  ui/            Button Field Select Chip Badge StatusPill Sheet Modal Toast
                 Skeleton EmptyState Pagination Tabs Tooltip Accordion
  property/      PropertyCard PropertyCardHorizontal PriceDisplay AreaDisplay
                 SpecGrid AmenityGroup Gallery SellerBlock SimilarProperties
                 NearbyLandmarks ReportDialog PropertyFaq
  search/        SearchBar IntentTabs LocationTypeahead SortControl
                 ResultGrid ResultCount ActiveFilterChips InternalLinkCluster
                 SeoContentBlock
  filters/       FilterRail FilterSheet PriceRange AreaRange BedroomFilter
                 PropertyTypeFilter AmenityFilter SellerTypeFilter
                 FurnishingFilter FloorFilter PostedSinceFilter FacetGroup
  navigation/    AppHeader BottomNav Breadcrumbs Footer CityLocalityNav
  forms/         FormField PhotoUploader StepIndicator OtpInput
  seller/        DraftCard ListingRow EnquiryRow ListingStats
  admin/         ModerationRow ReviewPanel AuditTrail UserRow ReportRow
  layout/        PageShell Section StickyBar
```

Three rules, unchanged:

1. **`ui/` knows nothing about property.** Domain folders compose it.
2. **No component imports `lib/db`.** Data arrives as props from a server component, or via a server action.
3. **`PriceDisplay` and `AreaDisplay` are components, not helpers.** Every price formats identically (`₹ 62.5 L`, `₹ 42,000 /mo`); every area carries its basis (`1,240 sqft carpet`). Centralising these prevents the two most damaging content inconsistencies in Indian property listings.

---

## 9. Data model — revised

**14 tables** (was 12). Two added for the moderation and trust surface that §5.2 item 19 requires.

```
user ──1:N── property ──1:N── property_media
 │              │ N:1
 │              ├──── location (self-referencing tree: country▸state▸city▸locality▸sub-locality▸society)
 │              ├──── property_type (ref)
 │              └──M:N─ amenity (via property_amenity)
 │
 ├──1:N── favorite ──N:1── property
 ├──1:N── inquiry  ──N:1── property
 ├──1:N── session
 └──1:N── otp_challenge

report ★         ──N:1── property, user     (user-submitted, SLA timer)
moderation_event ──N:1── property, user     (append-only)
audit_log        ──N:1── user               (append-only)
```

Changes from the previous draft:

| Change | Reason |
|---|---|
| ★ **`report`** added | "Report listing" is in the core scope (§5.2 #19). Users are the largest moderation workforce |
| **`location.type`** gains `SOCIETY` | Lets the PDP show a society/project name and lets search group by it — **without** a Project entity. This is how V0 gets project-adjacent feel for the cost of one enum value |
| **`property`** gains `view_count`, `save_count`, `inquiry_count` | Denormalised counters powering the seller's listing-performance screen. Three integers, not an analytics pipeline |
| **`property`** gains `society_location_id`, `facing`, `age_years`, `balconies`, `ownership_type`, `available_from`, `nearby_landmarks` (text) | The spec-grid depth that makes a PDP feel like a portal rather than a classified ad |

Still deferred: `saved_search`, `search_event`, `review`, `locality_stats`, `price_history`, `project`, `project_configuration`, `agent_profile`, `builder_profile`, `plan`, `subscription`, `payment`, `promotion`, `verification_request`, `outbox`.

**The four non-negotiables in `property` are unchanged:** three separate area columns with a unit; a short non-sequential `public_id`; `status` enforced as a state machine in `lib/property/`; and `latitude`/`longitude` collected but unused in V0.

**The one thing to get right in `inquiry`:** the row is written **before** a phone number is returned, `dedupe_key` is `UNIQUE`, and seller contact fields are never serialised before a reveal — enforced at the `lib/property/` selector, not in the component.

---

## 10. Implementation order — revised

Each phase ends with: `lint` → `typecheck` → `test` → responsive check at **390 / 412 / 768 / 1280** → empty, loading and error states verified.

| Phase | Deliverable | Done when |
|---|---|---|
| **1** | Scaffold, tokens, fonts, app shell, header + bottom nav | Renders at all four widths; tokens drive every colour; `₹1,25,00,000` correct in both faces |
| **2** | Homepage + city hub | A visitor reaches a filtered results URL in one interaction; LCP ≤ 2.0s throttled |
| **3a** | Search core: query model, results, cards, sort, pagination | `parseSearchParams`/`toSearchParams` round-trip under test |
| **3b** | **Filter depth**: all ~20 filters, facet counts, rail + sheet, chips | Counts use correct exclusion semantics; **no filter or sort action loses state, including on API error** |
| **4** | Property detail — full section depth, gallery, similar, report | Contact bar reachable at every scroll position; area basis labelled everywhere; CLS ≤ 0.05 |
| **5** | Auth + posting wizard | A real listing posted from 390px in under 8 minutes; refresh mid-form loses nothing |
| **6** | Seller dashboard, listing stats, enquiries, OTP reveal | Reveal writes the inquiry **first**; no contact field in any pre-reveal payload |
| **7** | Admin: queue, review with reasons, reports, users, audit | Reject requires a reason; every decision writes one audit row |
| **8a** | **SEO landing matrix** + internal linking + sitemaps + structured data | Matrix generated and inventory-gated; thin pages `noindex`; markup validates |
| **8b** | Performance + accessibility hardening | Budgets met on 5 routes; keyboard-only completion of search and enquiry |

Phase 3 splits because filter depth is the largest single piece of the revised scope, and 8 splits because the landing matrix is now a feature rather than a hardening task.

**Sequencing:** supply (5) before the lead loop (6) before seeding, because a marketplace with no listings cannot be tested by buyers. Phases 2–4 can run against seeded fixtures in parallel with 5 if more than one person is building.

---

## 11. Definition of done for V0

The loop closes end to end, and the product feels like a marketplace while doing it:

1. A seller posts a real listing from a phone and it goes live after review.
2. A buyer finds it through **search with twenty working filters and live counts**, and no interaction loses state.
3. The property page answers their questions without a phone call.
4. The buyer enquires, and reveals the phone after OTP.
5. The seller sees the enquiry, and can see how the listing is performing.
6. An admin approves, rejects with a reason, or acts on a report — all audited.
7. **A few hundred inventory-backed landing pages are indexable**; thin ones are not.
8. LCP ≤ 2.0s, CLS ≤ 0.05, INP ≤ 150ms, TTFB ≤ 400ms on a throttled mid-range Android.

Not "the website works". The loop closes, and it does not feel small.

---

## 12. Decisions needed before Phase 1

The revised product scope does not change these six. It raises the stakes on two of them: the route grammar (#2) now carries the landing matrix, and the typeface (#3) now appears across far more price-dense surfaces.

| # | Decision | Why it blocks the first commit | Recommendation |
|---|---|---|---|
| **1** | **Brand name + domain** | The wordmark, `metadata`, OG images, email sender and every canonical URL depend on it. Nothing indexable can ship without it | *Needs your answer* |
| **2** | **Route grammar** (C1) | Routing is the first thing built and the most expensive thing to change after indexing. The landing matrix multiplies this | Adopt this brief's `/buy/{city}/{locality}` and `/buy/{city}/{filter-slug}`. Retire the screen spec's `/kolkata/flats-for-sale` grammar |
| **3** | **Typeface** (C5) | Loaded in the root layout in Phase 1. The current choice cannot render ₹ | **Archivo** for display and prices with `subsets: ['latin','latin-ext']`, **IBM Plex Sans** for UI text |
| **4** | **Drop PostGIS for V0** (C8) | Changes the database setup and the migration baseline | Yes — keep `latitude`/`longitude` columns so map search in v1.1 is a pure frontend add |
| **5** | **No "Verified" badge in V0** (C10) | Ships a trust claim the platform cannot honour, and your brief forbids inventing verification | Agree — seller type, "New" and "Price reduced" only. The badge returns when a real check exists |
| **6** | **Seller roles at launch** | Determines the wizard's first screen and the moderation load | Owner + Agent + Builder as **roles on the account**. No public agent or builder *profile pages* — those are v1.2 |

**Answerable later, but start now:** DLT template registration for SMS has a lead time that can delay launch independently of any code. Begin it during Phase 1 even though OTP is not built until Phase 5.

Deferred to the phase that needs them: OTP provider (5), object storage provider (5), free-listing quota (5), listing expiry period (6), hosting and managed Postgres (8).
