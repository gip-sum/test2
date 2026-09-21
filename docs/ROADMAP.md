# GharBazaar — roadmap

**Status:** living document. Expected to change as the product is
understood better or the client asks for something new.

This supersedes the eight-phase plan in `docs/PHASE-0-PLAN.md`, which was
written for a V0 scope. The Phase 0 decisions about architecture, route
grammar, the search state model and the V0 data model all still stand; only
the *phase list* is superseded.

---

## How to read this

Phases are grouped into milestones. A milestone is a coherent slice of
product, not a deadline. Phase numbers are stable once assigned — new work
gets a new number rather than renumbering what follows, so a commit message
or a conversation from three months ago still means something.

Several of the phases below will split into two or three once specified in
detail. That is expected. The list is the shape of the work, not a promise
about its granularity.

**Nothing here is approved except what is marked Done.** Each phase is
specified in `docs/phases/` and approved individually before it is built.

---

## M1 — Foundations · **Done**

| # | Phase | Status |
|---|---|---|
| 0 | Plan, contradictions, V0 architecture | Done |
| 1 | Design tokens and application shell | Done |
| 2 | Search-first homepage | Done |
| 2.5 | GharBazaar rebrand · light-first conversion | Done |
| 3 | Search, filters and results | Done |

## M2 — The core buyer loop

| # | Phase |
|---|---|
| 4 | Property detail page |
| 5 | Photo gallery and media viewer |
| 6 | Contact seller and enquiry capture |
| 7 | Similar properties and in-page discovery |
| 8 | Shortlist and saved properties |
| 9 | Recently viewed |
| 10 | Compare properties |

## M3 — Identity and supply

| # | Phase |
|---|---|
| 11 | Authentication — OTP, sessions, account recovery |
| 12 | Account profile and preferences |
| 13 | Post-a-property wizard |
| 14 | Photo upload, processing and moderation queue |
| 15 | Listing lifecycle — draft, review, live, expired, closed |
| 16 | Seller dashboard |
| 17 | Enquiry inbox and lead management |
| 18 | Listing edit, renew and close |

## M4 — Persistence and platform

| # | Phase |
|---|---|
| 19 | Database migration behind the existing seam |
| 20 | Search backend — SQL filtering and facet aggregation |
| 21 | Media storage and delivery |
| 22 | Transactional email and SMS |
| 23 | Background jobs and scheduling |
| 24 | Rate limiting, abuse prevention, bot handling |

## M5 — Place and discovery depth

| # | Phase |
|---|---|
| 25 | Locality landing pages |
| 26 | Locality statistics |
| 27 | Price trends |
| 28 | Map search |
| 29 | Commute times and points of interest |
| 30 | Landing matrix and internal linking |

## M6 — Projects and builders

| # | Phase |
|---|---|
| 31 | Project entity and project pages |
| 32 | Project configurations and unit plans |
| 33 | Builder entity and builder pages |
| 34 | New launch and under-construction flows |
| 35 | RERA registration data |

## M7 — Agents and trust

| # | Phase |
|---|---|
| 36 | Agent entity and agent profiles |
| 37 | Reviews and ratings |
| 38 | Verification — a defined, earned claim |
| 39 | Reporting and content moderation |
| 40 | Admin console |

## M8 — Retention

| # | Phase |
|---|---|
| 41 | Saved searches |
| 42 | Alerts and matching |
| 43 | Notification preferences |
| 44 | Email digests |

## M9 — Monetisation

| # | Phase |
|---|---|
| 45 | Packages and plans |
| 46 | Payments |
| 47 | Subscriptions |
| 48 | Promotions and featured placement |
| 49 | Billing, invoices and GST |

## M10 — Scale and polish

| # | Phase |
|---|---|
| 50 | Product analytics and event model |
| 51 | SEO hardening |
| 52 | Performance budget and Core Web Vitals |
| 53 | Full accessibility audit |
| 54 | Localisation — Bengali and Hindi |

---

## Deferred model register

Entities the product will need, and the phase that introduces each. Listed
here so they are **planned but not built**, and so nobody is tempted to
half-build one early by widening an existing table.

| Model | Introduced in | Trigger |
|---|---|---|
| `user`, `organisation` | 11 | Anyone can sign in |
| `listing_status_history` | 15 | A listing can change state |
| `media_asset` | 14 | Photos are uploaded rather than fixtures |
| `locality_stat` | 26 | A locality page shows a number about the place |
| `price_point` (time series) | 27 | A trend is shown over time |
| `project`, `project_configuration` | 31 | A project needs its own page |
| `builder` | 33 | A builder needs its own page |
| `agent` | 36 | An agent needs a profile beyond a name |
| `review`, `review_response` | 37 | Anyone can rate anyone |
| `verification_claim` | 38 | The platform asserts it checked something |
| `report`, `moderation_action` | 39 | Content can be reported |
| `saved_search` | 41 | A search can be stored and re-run |
| `alert`, `alert_delivery` | 42 | A stored search can notify |
| `plan`, `subscription`, `payment`, `invoice` | 45–49 | Money changes hands |
| `promotion`, `placement` | 48 | Position can be bought |
| `event` (analytics) | 50 | Behaviour is measured |

---

## Architectural audit against the future

An honest reading of what exists today against the capabilities above.
The question is not "is it built" — it is "would building it later be
*unnecessarily* hard because of a decision already made".

### Already well positioned

- **The data seam holds.** Only `lib/property/queries.ts`,
  `lib/property/search.ts` and their tests import a fixture. No route, page
  or component does. Phase 19 replaces the fixture without touching
  anything above that line.
- **The place tree already has the right levels.** `LocationType` includes
  `SOCIETY`, so societies and projects can become places without
  reshaping the hierarchy.
- **A saved search is already a value.** `SearchQuery` is a complete,
  serialisable object that round-trips to a URL and back, unit-tested.
  Phase 41 stores that shape in a row; it is not a redesign.
- **Facets map to SQL.** The filter predicates are one function per filter
  in a single table, and facet counts are computed by excluding exactly one
  of them. That structure becomes `WHERE` clauses and a `GROUP BY` per
  facet in Phase 20 without changing the semantics.
- **No unearned trust claims exist to unwind.** V0 ships no "Verified"
  badge, no ratings and no marketplace statistics, deliberately. Phase 38
  introduces verification as a *defined* claim rather than having to
  retrofit meaning onto a badge that already shipped without any.

### Will need care, and when

**1. `society` is free text.** *(Phase 13 at the latest, ideally with it.)*

Today a society name is a string repeated on every listing that mentions
it. Projects, project configurations and builders are all on the list, and
a project is a real entity — its own page, its own configurations, a
builder, a possession date, price trends.

The moment listings become user-generated, sellers will type forty
spellings of the same project. Resolving those into entities afterwards is
entity resolution over dirty data: slow, lossy, and it never fully
succeeds. Attaching an optional `projectId` **while the only writer is us**
costs almost nothing.

*Recommendation: Phase 13 writes `projectId` where a project is known, and
keeps `society` as the free-text fallback for listings that genuinely have
none. Phase 31 then promotes it rather than reconstructing it.*

**2. `sellerName` is free text.** *(Phase 11.)*

Agents, builders, reviews, subscriptions and payments all attach to a
seller *entity*, not to a display string on a listing. This resolves
naturally when auth lands and listings gain a real owner — the point is
that `PropertySummary` should carry `sellerId` from the first real listing,
not from the first agent profile.

**3. No status history on listings.** *(Phase 15.)*

Moderation, verification and any "why was this rejected" conversation all
need who-changed-what-when. History cannot be backfilled: a row added in
Phase 39 knows nothing about what happened in Phase 15. Listing state
changes should be written as events from the moment they can change.

**4. Money has no currency or minor units.** *(Phase 46.)*

Integer rupees is right for a listing price and should stay. A *payment* is
a different thing and needs currency and minor units explicitly. Worth
saying now so the two are not conflated later.

**5. Amenities are one flat enum.** *(Phase 32.)*

A project has amenities and so does a unit, and they are not the same list
— a swimming pool belongs to the complex, a modular kitchen to the flat.
The enum will need to split. Cheap either way; noted so it is a decision
rather than a surprise.

### Deliberate denormalisation, not an oversight

`localityName` and `cityName` are stored on the listing summary alongside
`localitySlug`. This is a read-model convenience so a card can render
without a join, and the slug remains the real key. It is intentional and
should survive the database migration — recorded here so it is not
"cleaned up" by someone reading it as a mistake.

### Known cost, already flagged

Each result card renders twice in the DOM — a horizontal list for phones
and a vertical grid from `md` up, one of them `display: none`. Screen
readers see one, so it is not an accessibility defect, but it doubles DOM
nodes on a results page. Phase 52 owns this.

---

## What is NOT changing today

Nothing in the audit above requires a code change now. Items 1–3 all land
naturally in phases that are already planned, and doing them early would
mean building entities before a feature needs them — which the working
agreement forbids as clearly as it forbids flattening them later.

They are recorded so that when those phases arrive, the work is *introduce
the entity properly*, not *discover the problem*.
