# GharBazaar — roadmap companion

**The roadmap itself is `Phases.txt` at the repository root, and it is
authoritative.** 75 phases across twelve tracks, client-owned. When
anything here disagrees with it, it wins.

This document holds the two things `Phases.txt` deliberately does not: an
engineering audit of what already exists against what is coming, and a
register of the domain models each phase will introduce. Both are mapped to
`Phases.txt` numbering.

`docs/PHASE-0-PLAN.md` remains valid for its architecture decisions — route
grammar, search state model, component architecture, the V0 data model —
but its eight-phase build order is superseded.

---

## Status

| Phase | | |
|---|---|---|
| 1 | Design system and application foundation | **Complete** |
| 2 | Homepage and discovery | **Complete** |
| 3 | Search, filters and results | **Complete** |
| 4 | Property detail page | **Complete** (development fixtures) |
| 5 | Property gallery and media system | **Complete** |
| 6 | User authentication | Implemented; live provider setup pending |
| 7 | Buyer account | Deployed; real-account profile verification pending |
| 8 | Save and shortlist | Implemented; real-account save verification pending |
| 9 | Enquiry and lead system | Implemented; live seller assignment pending |
| 10 | Phone contact and OTP reveal | Postponed by client decision |
| 11 | Post property entry flow | **Complete** and deployed |
| 12 | Property information form | Implemented; CI on `main` and deployment pending |
| 40A | Home loan calculators | Implemented ahead of order at client request |

Phase 0 (planning) and the GharBazaar rebrand plus light-first conversion
sit outside the numbering; both are complete and are recorded in the git
history. So is the mobile-first homepage redesign that followed Phase 12,
which reworked Phase 2's homepage without starting a new phase; the
sections it deliberately left out are listed below. The budget and EMI
calculators it first listed there are now Phase 40A, inserted without
renumbering at the client's request.

Each phase is specified in `docs/phases/` with the nine sections required
by `CLAUDE.md` before any code is written for it.

---

## Homepage sections waiting on their phase

Larger portals open with sections this homepage does not have yet. Each is
absent because the data or the feature behind it does not exist, and a
placeholder would claim what the platform cannot show. The homepage gains
each one in the phase that makes it real, not before.

| Section on larger portals | Why it is absent today | Phase that makes it real |
|---|---|---|
| New and upcoming projects, with RERA numbers | There is no project entity | 44–47, with RERA claims verified in 65–66 |
| "Recommended for you" | No recommendation logic; the rails show the newest listings and are titled that way | 39 |
| Demand by locality ("n% of buyers…") | Nothing measures demand yet | 69 measures it, 50 presents it |
| Price trends and locality insights | No price history | 50–51 |
| Offers | No project commercial terms, no paid placement | 47 (builder terms), 61 (featured listings) |
| "Post property FREE" | No seller plan defines what is free | 59 |
| A localities page | The homepage section at `/#localities` stands in, and the header, footer and quick routes point there | 29 (city hub), 30 (locality pages) |
| Short videos | Not in `Phases.txt` | Needs a roadmap decision |
| Terms of use and privacy policy | The pages do not exist; their links, which returned 404, were removed | Client-supplied text; not yet in `Phases.txt` |

## Navigation destinations waiting on their phase

The marketplace navigation (Phase A, `lib/navigation/marketplace.ts`) links
only to routes that exist. Larger portals' headers also offer the entries
below. Each one joins the navigation model — one entry, reaching the
header, the menu and the quick routes' "View all" together — in the phase
that builds its page, and not before.

| Destination | Why it is absent today | Phase that makes it real |
|---|---|---|
| Projects | There is no project entity or project page | 44–45 |
| Agents | No agent profiles | 41 |
| Builders | No builder profiles | 43 |
| Insights and price trends | No price history or locality insight pages | 49–51 |
| A localities page | `/#localities` on the homepage stands in, as it does for the homepage section | 29 (city hub), 30 (locality pages) |

---

## Deferred model register

Entities the product needs, and the phase that introduces each. Recorded so
they are **planned but not built** — and so nobody half-builds one early by
widening an existing table.

| Model | Phase | Trigger |
|---|---|---|
| `enquiry` / `lead` | 9 | A buyer can contact a seller |
| `contact_reveal` | 10 | A phone number can be released |
| `user`, `organisation` | 6 | Anyone can sign in |
| `buyer_profile` | 7 | A signed-in buyer saves contact details and preferences |
| `media_asset` | 15 | Photos are uploaded rather than fixtures |
| `listing_draft` | 16 | A posting can be resumed |
| `listing_status_history` | 18 | A listing can change state |
| `listing_stat` | 20 | A seller is shown views and saves |
| `moderation_action` | 22 | A human approves or rejects |
| `report` | 24 | Content can be reported |
| `audit_log` | 27 | Actions must be reconstructable |
| `location` with stable IDs | 28 | Places outlive their slugs |
| `saved_search` | 36 | A search can be stored and re-run |
| `alert`, `alert_delivery` | 37 | A stored search can notify |
| `agent` | 41 | An agent needs a profile beyond a name |
| `builder` | 43 | A builder needs its own page |
| `project`, `tower`, `unit` | 44 | The second property domain |
| `project_configuration` | 46 | A project has unit types |
| `payment_plan` | 47 | A project has commercial terms |
| `review`, `review_response` | 48 | Anyone can rate anything |
| `locality_stat` | 50 | A locality page states a fact about the place |
| `price_point` (time series) | 51 | A trend is shown over time |
| `article`, `author`, `category` | 55 | Content is authored and published |
| `plan`, `quota` | 59 | Sellers have limits |
| `order`, `payment`, `refund` | 60 | Money changes hands |
| `promotion`, `placement` | 61–62 | Position can be bought |
| `invoice` | 63 | Money needs a record |
| `ledger_entry` (append-only) | 64 | Commercial accounting must reconcile |
| `verification_claim`, `evidence` | 65–66 | The platform asserts it checked something |
| `risk_signal`, `risk_score` | 67 | Behaviour is scored |
| `event` (analytics) | 69 | Behaviour is measured |

---

## Architectural audit

What exists today, read against what is coming. The question is not "is it
built" — it is "would building it later be *unnecessarily* hard because of
a decision already made".

### Already well positioned

- **The data seam holds.** Only `lib/property/queries.ts`,
  `lib/property/search.ts` and their tests import a fixture. No route, page
  or component does. The database migration replaces the fixture without
  touching anything above that line.
- **The place tree already has the right levels.** `LocationType` is
  `CITY | ZONE | LOCALITY | SUB_LOCALITY | SOCIETY`, which is exactly the
  hierarchy Phase 28 formalises. Societies already have a home.
- **A saved search is already a value.** `SearchQuery` is a complete,
  serialisable object that round-trips to a URL and back, unit-tested.
  Phase 36 stores that shape in a row; it is not a redesign. Phase 37 then
  re-runs stored rows against new inventory.
- **Facets map to SQL.** Filter predicates are one function per filter in a
  single table, and facet counts are computed by excluding exactly one of
  them. That becomes `WHERE` clauses and a `GROUP BY` per facet without
  changing the semantics — and the same structure is what Phase 73 would
  hand to a search engine.
- **Zero-result recovery already counts alternatives correctly.**
  `suggestLocalities` counts nearby places with every *other* filter still
  applied, which is the behaviour Phase 33 formalises.
- **No unearned trust claims exist to unwind.** V0 ships no verified badge,
  no ratings, no marketplace statistics — deliberately. Phase 65 introduces
  verification as a defined claim rather than retrofitting meaning onto a
  badge that already shipped without any.

### Needs care, and where it lands

**1. `society` is free text.** *(Phases 13, 28, 44.)*

Today a society name is a string repeated on every listing that mentions
it. Phase 13 collects a society during posting and Phase 44 makes projects
a real domain with configurations, towers and a builder.

The risk is the window between them: if Phase 13 lets sellers *type* a
society, we inherit forty spellings of one project, and resolving those
afterwards is entity resolution over dirty data — slow, lossy, never
complete. **Phase 13 should select from the gazetteer, not free-type**,
with free text only as the explicit fallback for a genuinely unlisted
building. Phase 28 gives those places stable IDs, and Phase 44 promotes the
ones that are projects.

**2. `sellerName` is free text.** *(Phase 6.)*

Agents, builders, reviews, subscriptions and payments all attach to a
seller *entity*, not a display string on a listing. This resolves when auth
lands — the point is that a listing should carry `sellerId` from the first
real listing, not from the first agent profile in Phase 41.

**3. Listings have no status history.** *(Phases 18, 27.)*

Moderation, verification and every "why was this rejected" conversation
need who-changed-what-when. History cannot be backfilled: a table added in
Phase 27 knows nothing about what happened in Phase 18. State changes
should be written as events from the moment a listing can change state.

**4. Contact reveals need an audit trail from day one.** *(Phase 10.)*

Phase 10 lists "audit trail" in its own focus, and Phase 67 scores contact
abuse. Both depend on every reveal being recorded when it happens. There is
no way to reconstruct this later.

**5. Money has no currency or minor units.** *(Phase 60.)*

Integer rupees is right for a listing price and should stay. A *payment* is
a different thing and needs currency and minor units explicitly. Worth
saying now so the two are never conflated.

**6. Amenities are one flat enum.** *(Phases 45, 46.)*

A project has amenities and so does a unit, and they are not the same list
— a swimming pool belongs to the complex, a modular kitchen to the flat.
The enum splits when project pages arrive. Cheap either way; noted so it is
a decision rather than a surprise.

### Deliberate, not an oversight

`localityName` and `cityName` are stored on the listing summary alongside
`localitySlug`. This is a read-model convenience so a card renders without
a join, and the slug remains the real key. It should survive the database
migration — recorded here so it is not "cleaned up" by someone reading it
as a mistake.

### Known cost, already flagged

Each result card renders twice in the DOM — a horizontal list for phones, a
vertical grid from `md` up, one of them `display: none`. Screen readers see
one, so it is not an accessibility defect, but it doubles DOM nodes on a
results page. Phase 71 owns it.

---

## Nothing changes today

None of the audit above requires a code change now. Every item lands in a
phase that is already planned, and doing them early would be exactly the
premature modelling that `CLAUDE.md` forbids — as clearly as it forbids
flattening an entity into a string later.

They are recorded so that when those phases arrive, the work is *introduce
the entity properly*, not *discover the problem*.
