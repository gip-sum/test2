# Phase 4 — Property detail page

**Status:** COMPLETE — implementation and acceptance checks recorded below.
**Scope source:** `Phases.txt` → Phase 4.
**Behaviour source:** `docs/kolkata-marketplace-screen-spec.md` §5 (Screen 4).
**Data source:** `docs/PHASE-0-PLAN.md` §9.

> **Revision note.** The first draft was written before screen-spec §5 was
> read, and split gallery, contact and similar properties into later
> phases. This revision follows §5 and the client decisions of 2026-09-22
> (B–I). Where §5 and `Phases.txt` disagree on *sequencing*, `Phases.txt`
> wins; where they agree on *behaviour*, §5 is the detail.

### Completion record (2026-09-23)

The property route, gallery, facts, description, amenities, location, seller
information, similar properties and signed-out enquiry are implemented.
`npm run verify` passes lint, types and 176 unit tests; `npm run build`
passes. `shots` passes every route at 390/412/768/1280, `light-check`
passes under a dark-mode browser, `search-check` passes 64/64, and the new
`property-check` passes 67/67, including 360px, status responses, keyboard
focus, contrast, layout shift, validation and JavaScript-disabled submission.

The following implementation decisions supersede the earlier proposal text
in this document:

- Stored public IDs keep their `p_` prefix; the URL normalises it to
  `-p{id}`. Legacy `-p_id` links 301 to the canonical URL.
- Similar properties use actual sub-locality siblings only and order by
  recency. City-wide adjacency and coordinate proximity await Phases 33/35.
- Repeat enquiries are recorded and flagged by listing and phone; there is
  no reliable signed-out returning-buyer identity.
- Enquiries are held in process memory, and **no seller is notified**.
  The UI says so. Lead persistence and delivery belong to Phase 9; the
  current form is usable for development, not real customer leads.
- The property route has no automatic `loading.tsx` boundary. It caused
  JavaScript-disabled visitors to see only a loading shell, hiding the
  required real form. This trade-off preserves the accessible server page.
- Similar-property matching is synchronous over the small development
  fixture and has no network wait. Phase 9+ data access must revisit the
  first-paint condition when matching becomes asynchronous.

---

## 1. Scope

The central conversion surface. Every phase before this one exists to get a
buyer here; several after it depend on the buyer acting here.

Before Phase 4, **every property link from results was a dead 404**. The
implemented route closes that gap and redirects legacy `-p_id` links.

### In scope

| Area | Phase 4 delivers |
|---|---|
| **Route** | `/property/{slug}-p{id}`, canonicalisation, 404 |
| **Gallery** | Multi-image viewer: thumbnail strip, next/previous, counter, keyboard, reserved aspect ratio |
| **Development imagery** | Generated sample images so the gallery is genuinely testable, labelled as sample inventory |
| **Price** | Price, per carpet sqft, deposit and maintenance for rent, negotiable marker, price-reduced marker |
| **Property facts** | Full §5 grid: type, status, furnishing, floor/total, facing, age, parking, bathrooms, **balconies**, availability, **ownership** |
| **Description** | Seller prose, clamped with an accessible expand |
| **Amenities** | Grouped, expandable, absence never implied as presence |
| **Location** | Breadcrumb, locality, sub-locality, **society**, **nearby landmarks** (text) |
| **Seller information** | Owner / agent / builder, name, listing age |
| **Contact / enquiry** | Working enquiry, **signed out**, via a new `lib/enquiry` seam |
| **Similar properties** | §5 tiered rule, minimum 4 |
| **Structured data** | `RealEstateListing` + `BreadcrumbList` JSON-LD |
| **Gazetteer** | SOCIETY-type locations seeded so `society_location_id` has a target |
| **Docs** | `README.md` refreshed; `docs/PROJECT-CONTEXT.md` created |

### Out of scope, and who owns it

| Out | Phase |
|---|---|
| Full-screen gallery, swipe gestures, video, floor plans, responsive sources | 5 |
| Authentication; enquiry works signed out | 6 |
| Shortlist persistence — save stays local | 8 |
| Enquiry inbox, lead status, real duplicate handling, lead history | 9 |
| **Phone reveal, OTP, payload protection, reveal dedup, reveal quotas** | 10 |
| Posting flow that authors descriptions and landmarks | 11–17 |
| **HTTP 410 "Property unavailable" (screen-spec §6)** — no lifecycle exists to make a listing unavailable | 18 |
| Report this property (§5 mobile layout item 8) | 24 |
| Proper adjacency and nearby-location discovery | 33 |
| Map, coordinates, distance | 34, 35 |
| Locality statistics, price trends, price positioning | 50–52 |
| Builder and project links from a listing | 43, 44 |
| Reviews and verification badges | 48, 65 |
| Behavioural recommendations | 39 |

### Explicitly NOT judged against these §5 criteria

Per decision **E**, these are Phase 10's and Phase 18's:

- Seller contact details absent from the payload until reveal
- Enquiry row written *before* the number renders
- Repeat reveals deduplicated
- HTTP 410 for a removed listing

**No phone number appears anywhere in Phase 4** — not revealed, not masked,
not partial. A masked number would have to be unshipped when real access
control arrives.

---

## 2. UX requirements

### Mobile layout (§5, minus deferred items)

1. `AppHeader`
2. **Gallery** — full-bleed, 4:3, counter
3. **Header block** — price, per sqft, BHK · baths · area **with basis**, locality, badges
4. **Key details grid**
5. **Amenities** — grouped, expandable
6. **Description**
7. **Location** — society, sub-locality, locality, nearby landmarks
8. **Seller block**
9. **Similar properties** — horizontal scroller
10. **Sticky contact bar** — reachable at every scroll position
11. **Legal disclaimer**

Gallery tabs for Photos / Video / Floor plan are **not rendered** in Phase
4: there is only one media kind, and a one-tab tab bar is noise. Phase 5
introduces the tab bar with the tabs it earns.

### Desktop layout (§5)

Two columns. Left: gallery, details, amenities, description, location,
similar. Right: sticky card with price, contact action and seller block.
In-page anchor navigation at 1280+.

### Contact behaviour

- Primary CTA uses the **buyer** accent, never the seller's orange.
- Reachable at every scroll position — sticky bottom bar on phones (above
  the bottom nav), sticky right card on desktop.
- Form asks **name, phone, optional message**. Nothing else; every extra
  field measurably costs leads.
- Success confirmation states that the development enquiry was recorded
  temporarily and that seller notification is not available yet.
- **Enquiring twice** is not an error and not a silent no-op — see §5's
  "Enquire again" behaviour and the ambiguity in §10.
- Failed submission preserves everything typed.

### Similar properties — §5 rule, verbatim

1. Same locality → same property type → same BHK → price within **±20%**
2. If fewer than 4 → widen to **adjacent localities**
3. If still fewer than 4 → widen price to **±35%**
4. Never the current listing. Never padded. Section **omitted** if still
   under 4.

§5 orders by "proximity then recency". **There are no coordinates in this
project**, so proximity is not computable — see §10 for the options.

### Copy rules

- No claim the platform cannot stand behind: no "verified", "premium",
  "trending", no view counts, no "N people enquired".
- An absent field is absent — not "N/A", not zero.
- **Every gallery image carries a visible sample-inventory marker.** The
  images are generated for development and must never read as photographs
  of a real property.
- Disclaimer states that listings are posted by owners, agents and
  builders, that we review against content rules, and that we do **not**
  verify ownership, documents, measurements or prices.

---

## 3. Technical requirements

### Route and identity — decision D

Canonical: **`/property/{slug}-p{id}`** → `/property/2-bhk-flat-for-sale-in-behala-pc70il`

- `publicId` retains the stored `p_` prefix (`p_c70il`); the URL normalises
  this to `pc70il` after the last hyphen, preserving fixture identity.
- **Id charset: lowercase `a–z0–9`, no hyphens, length 6–12.** Excluding
  hyphens is what makes parsing unambiguous.
- **Parsing rule:** split the final path segment on its *last* hyphen; the
  right side must match `^p[a-z0-9]{6,12}$`; the id is that minus the
  leading `p`. Unambiguous even when a slug ends in a word starting with
  `p` (`…-in-park-pc70il` → `c70il`).
- Ids are opaque and non-sequential. The fixture generator produces them
  deterministically for reproducibility; **a real generator is Phase 19's**
  and must not be sequential.
- Slug is decoration. A mismatched slug **301s** to canonical rather than
  rendering — otherwise every stale share link mints a duplicate page.

### Modules

- `lib/property/queries.ts` gains `getPropertyDetail(publicId)`.
- **New `lib/property/similar.ts`** — `getSimilarProperties()`, pure and
  unit-tested per tier.
- **New `lib/enquiry/`** — `types.ts` and `commands.ts` with
  `createEnquiry(input)`. In-memory store behind the same seam listings
  use, so Phase 9 *extends* the module rather than replacing it.
- `PropertyDetail` extends `PropertySummary`. **`PropertySummary` is not
  widened** — the card payload stays small.
- Server component. Only gallery, description expand, save and the contact
  form are client components.
- Enquiry submission is a **server action** with server-side validation.
  Client validation is convenience, never the boundary.
- Phone validated as an Indian mobile number and stored normalised.
- JSON-LD server-side; every emitted field must be one we actually hold.
- Similar matching runs synchronously against the development fixture;
  revisit first-paint behavior when this seam becomes asynchronous.
- No new npm dependency without naming it here first.

### Development imagery — decision B

**All outbound HTTP is blocked in this environment** (verified: `000` from
every image host), so licensed stock photography cannot be fetched.
Images are therefore **generated locally with Pillow**, which decision B
permits.

- A committed generator script produces a fixed set of interior/exterior
  images at 4:3, several per listing.
- They are **illustrative, not photographic** — see §10.
- Stored under `public/dev-media/`, referenced by the fixture, and
  **removed with the fixture** when real inventory arrives.
- Every rendered image carries a visible sample marker, and the existing
  development-data banner stays.

---

## 4. Data requirements

No new **entity** except `enquiry`. Projects, builders and agents remain
Phases 44, 43, 41.

### New entity: `enquiry`

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `listingId` | string | |
| `name` | string | |
| `phone` | string | Normalised |
| `message` | string? | |
| `createdAt` | ISO | |
| `source` | enum | `property_page` |

Deliberately **not** in Phase 4: lead status, assignment, follow-ups, read
state, seller notes — Phases 9 and 68.

### New property fields — decision F

| Field | Type | Notes |
|---|---|---|
| `description` | string? | |
| `builtUpArea` | number? | **Separate from carpet and super. Never merged.** |
| `balconies` | number? | |
| `ownershipType` | enum | Freehold / leasehold / power of attorney |
| `nearbyLandmarks` | string[] | Text only; no coordinates |
| `societyLocationId` | string? | FK to a `SOCIETY` location |

Plus, for the price block: `deposit`, `maintenanceMonthly`, `isNegotiable`.

### Gazetteer addition

**There are currently zero `SOCIETY`-type locations**, so
`societyLocationId` has nothing to point at. Phase 4 seeds SOCIETY
locations from the ~30 society names already used in the fixture, parented
to their locality. This is the `location.type` extension `PHASE-0-PLAN §9`
anticipated and it is what lets a PDP show a project-adjacent name without
a Project entity.

Listings keep `society` as a display string **and** gain
`societyLocationId`. Per `docs/ROADMAP.md`, the posting flow (Phase 13)
must *select* a society rather than free-type it.

### Fixture must include, deliberately

No description · a 2,000-character description · no photo · exactly one
photo · twelve photos · no floor/age/facing · all three area bases · carpet
only · ₹3.25 Cr · ₹15 L · under construction with possession · rent with
deposit, maintenance and availability · a listing whose locality yields
**fewer than 4** similar properties, so the omission path is reachable · a
listing with no society.

---

## 5. Edge cases

| Case | Required behaviour |
|---|---|
| Unknown id | 404, correct status |
| Slug mismatch | **301** to canonical |
| Malformed id (`-pXX`, `-p`, no `-p`) | 404, never a crash |
| Listing not live | 404 in Phase 4; **410 is Phase 18** |
| No photos | Placeholder; no gallery controls |
| One photo | No thumbnail strip, no counter (§5) |
| Twelve photos | Strip scrolls; no layout shift |
| No description / amenities / landmarks / society | Section or row omitted, not an empty heading |
| Carpet only | Show carpet; never infer the others |
| Fewer than 4 similar after all tiers | Section omitted |
| Enquiry: invalid phone | Field error; nothing else lost |
| Enquiry: server failure | Input preserved, retry offered |
| Enquiry: submitted twice | Handled per §10 decision |
| Enquiry: **JS disabled** | Form still submits — a real form posting to a server action; no automatic route loading boundary |
| 2,000-char description | Clamped with accessible expand |
| Long society or address | Wraps; never truncates the price |
| Direct load vs soft navigation | Identical output |
| Sticky bar + bottom nav + safe area | Never overlap, never cover content |

---

## 6. Accessibility requirements

- One `h1`. Sections `h2`, sub-blocks `h3`, no level skipped.
- Every section `<section aria-labelledby>` pointing at its heading.
- Key details are a `dl`/`dt`/`dd` — the relation is label-to-value.
- **Gallery** — arrow keys move between images; position announced in a
  live region ("Image 3 of 12"); every control named; focus never lost on
  change; images have meaningful `alt` naming configuration and locality.
- **Description expand** — `button` with `aria-expanded` + `aria-controls`;
  collapsed text not hidden in a way that loses it.
- **Contact form** — real `<label>` per input; errors via
  `aria-describedby` + `aria-invalid`; error summary receives focus on
  failed submit; success announced in a live region.
- **Sticky contact bar** — page reserves its height; it never covers
  content and never overlaps the bottom nav.
- Breadcrumb `nav[aria-label="Breadcrumb"]` + `ol`, `aria-current="page"`.
- Similar-properties scroller is keyboard reachable and not a focus trap.
- Every interactive target ≥ 44×44 CSS px.
- Focus order follows reading order; focus ring never removed.
- Contrast measured on every new pairing, not eyeballed.
- Whole page operable by keyboard alone, verified by scripted traversal.

---

## 7. Responsive requirements

Verified at **390 / 412 / 768 / 1280**, plus **360** as a stress width.

- **390–767** — single column; gallery full-bleed; key details two columns;
  **contact bar sticky at the bottom** above the bottom nav.
- **768–1023** — single column, wider gutters, three-column details,
  gallery with thumbnail strip.
- **1024+** — two columns; sticky right card; must never overlap the
  footer.
- **1280+** — in-page anchor navigation (§5).
- Gallery reserves aspect ratio; **CLS ≤ 0.05 with the gallery loading**
  (§5 acceptance).
- No horizontal overflow at any width — `npm run shots` extended.
- Light theme holds under a dark-mode browser — `npm run light-check`
  extended.

---

## 8. Verification

**Unit** — detail resolution; id parsing including every malformed form;
slug canonicalisation; similar-properties ranking **per tier** and the
minimum-4 omission; enquiry validation (phone formats, required fields,
normalisation); JSON-LD shape; section-omission for each absent field;
society gazetteer resolution.

**Browser** — new `scripts/property-check.mjs`, shaped like
`search-check`, at 390/412/768/1280:

1. A result card links to a page rendering that same listing
2. Slug mismatch → **301**; unknown id → **404**; malformed id → **404** —
   asserted on the response, not the rendered body
3. Every section present for a fully-populated listing
4. Every optional section **absent** for the sparse listing
5. Heading hierarchy has no skipped level
6. Gallery: arrow keys change image, counter updates, focus retained
7. One photo → no strip, no counter; none → no gallery
8. Description expand toggles `aria-expanded` and reveals full text
9. Contact form rejects an invalid phone without losing other input
10. Contact form succeeds, announces success, and the enquiry is readable
    back through `lib/enquiry`
11. Enquiry works with **JavaScript disabled**
12. Similar never includes the current listing; section absent under 4
13. Sticky contact bar reachable at **every** scroll position (top, middle,
    bottom) and never overlapping the bottom nav or footer
14. Keyboard traversal reaches every control in reading order
15. Long society name and ₹3.25 Cr price do not overflow at 360
16. JSON-LD parses; contains only fields we hold
17. Back returns to the same filtered results
18. Every gallery image carries a visible sample-inventory marker

**Standing suites** — `verify`, `build`, `shots`, `light-check`,
`search-check` all still pass; `shots` and `light-check` extended to the
new route.

**Not accepted as verification:** a screenshot, or a check that passes
because the state it tests was never reached.

---

## 9. Production readiness

- [x] Standing suites green, plus the 67-assertion property suite
- [x] Status codes 200, 301, 404 verified by request
- [x] JSON-LD parses and draws on held listing fields
- [x] Enquiry copy states the process-local limitation honestly
- [x] No seller phone number anywhere on the page
- [x] Enquiry validated server-side; form works with JavaScript disabled
- [x] Phone numbers stored normalised (unit tests)
- [x] Sample imagery visibly marked as development inventory
- [x] Area basis labelled in the price and area blocks
- [x] Contact action reachable at top, middle and bottom scroll positions
- [x] Gallery CLS ≤ 0.05 at 360/390/412/768/1280
- [x] Similar lookup is synchronous and performs no external I/O in Phase 4
- [x] Zero horizontal overflow, 360 → 1280
- [x] Gallery, description and enquiry traversed by keyboard in reading order
- [x] New heading, detail and action text pairings measured at ≥ 4.5:1
- [x] `README.md` references the 75-phase roadmap and current brand
- [x] `docs/PROJECT-CONTEXT.md` records implementation and limitations

**Incomplete by design after this phase:** no phone reveal (10), no lead
management (9), no full-screen gallery/video/floor plans (5), no 410 page
(18), no report (24), no map (34), no project or builder link (43, 44).

---

## 10. Original implementation questions — resolved in completion record

The alternatives below record the planning discussion. The completion record
at the top gives the implemented decisions and supersedes the recommendations
below where they differ.

**A1 — "Adjacent localities" has no data behind it.** 🔴

§5 tier 2 widens to adjacent localities. There is no adjacency relation:
**32 of 37 localities share the single parent `kolkata`**, so "same parent"
literally means "anywhere in Kolkata". Only 7 sub-localities have a
meaningful sibling set. Decision G says use existing relationships and
leave real adjacency to Phase 33.

- **(a)** Sub-localities use true siblings; city-level localities skip tier
  2 entirely and go straight to ±35%. Honest, no invented adjacency.
  *Recommended.*
- **(b)** Treat "same parent" as adjacent for everyone — tier 2 becomes
  "anywhere in Kolkata", which reaches 4 results almost always but makes
  "adjacent" meaningless.
- **(c)** Hand-author an adjacency table for the 32 localities now.
  Accurate, but it is the Phase 33 model arriving early under another name.

**A2 — "Ordered by proximity" is not computable.** 🔴

§5 orders similar results by proximity then recency. **No coordinates exist
anywhere** — not on properties, not on locations.

- **(a)** Order by recency alone, and state in the spec that proximity
  ordering arrives with Phase 35. *Recommended.*
- **(b)** Proxy proximity by price-difference from the current listing.
  Defensible but it is not proximity and would be misleading to call it so.

**A3 — Generated imagery is illustrative, not photographic.** 🟠

With egress blocked, Pillow can produce consistent, attractive,
clearly-synthetic interiors and exteriors — **not** photorealistic ones. I
judge this a *better* fit for "do not imply sample images represent real
properties", but you should confirm you are happy that the PDP gallery
shows stylised illustrations during development rather than photos.

**A4 — "Enquire again" needs to know who you are.** 🟠

§5 says a repeat visitor sees "Enquire again" plus the previous enquiry
date. Phase 4 has no auth and no stable identity.

- **(a)** Scope it to the browser session/`localStorage` and word it
  honestly ("You enquired about this property"). Does not survive a device
  change, which is fine and true. *Recommended.*
- **(b)** Omit the repeat state entirely and let Phase 9 introduce it with
  real identity.

**A5 — `nearbyLandmarks` has no author.** 🟡

The field is free text written during posting, and posting is Phases 11–17.
In Phase 4 it exists only in the fixture. Confirm that is intended, and
that Phase 4 should not invent an editing surface for it.

**A6 — Changing `publicId` changes every id in the fixture.** 🟡

Decision D drops the `p_` prefix from the stored value. No production links
exist, so nothing breaks — but every fixture id changes, and any URL you
may have bookmarked from a local run will 404. Confirming this is expected.

**A7 — `deposit` / `maintenanceMonthly` / `isNegotiable` were not in
decision F.** 🟡

§5's price block and `PHASE-0-PLAN §9` both imply them for rent listings.
I have included them in §4 as price fields. Flagging because they were not
in your explicit list — say if they should wait.
