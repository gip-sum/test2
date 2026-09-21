# Phase 4 — Property detail page

**Status:** PROPOSED — awaiting approval. No code has been written.
**Depends on:** Phase 3 (search results link here).
**Blocks:** Phase 5 (gallery), Phase 6 (contact), Phase 7 (similar).

---

## 1. Scope

The page a buyer lands on from a result card, and the page that carries
most of this product's organic traffic. It answers one question in full —
*is this the property, and who is behind it* — and it is the last screen
before a buyer decides to contact someone.

### In scope

- Route `/property/{slug}-{publicId}` with canonical URL handling
- Twelve content sections (§2) covering everything the V0 data model knows
- Breadcrumb reflecting the place hierarchy
- Media area rendering the cover image or the honest no-photo state
- Seller identity block — who is advertising, and since when
- Structured data (`schema.org` `RealEstateListing` / `Residence`)
- Metadata, canonical, Open Graph per listing
- Not-found, unpublished and stale-slug states
- Full responsive and accessibility treatment

### Explicitly out of scope

| Out | Phase |
|---|---|
| Multi-photo gallery, lightbox, floor plans | 5 |
| Contact seller, phone reveal, enquiry capture | 6 |
| Similar properties, recently viewed | 7, 9 |
| Shortlist persistence (the button stays local-only) | 8 |
| Map, commute, points of interest | 28, 29 |
| Locality statistics and price trends in the location section | 26, 27 |
| Project and builder links from a listing | 31, 33 |
| Reviews, ratings, verification badges | 37, 38 |
| Report listing | 39 |

**The page ships without a primary contact CTA.** A button that opens
nothing is worse than no button, and folding contact into this phase would
make it two phases wearing one number. The seller block states who is
advertising; Phase 6 adds the action. We are not deploying to real users
between phases, so an information-complete page is a coherent stopping
point.

---

## 2. UX requirements

### Content order

Fixed, and derived from what a buyer decides in sequence — *can I afford
it*, *does it fit*, *where is it*, *who is selling*:

1. **Breadcrumb** — Kolkata › New Town › 3 BHK flat
2. **Media** — cover image, 4:3, or the no-photo state
3. **Price header** — price, price per carpet sqft, price-reduced marker
4. **Identity** — configuration, society or title, full address line
5. **Key facts** — a scannable grid: carpet / built-up / super area, floor
   of total, facing, age or possession, furnishing, parking, status
6. **Description** — the seller's prose, the only long-form text here
7. **Amenities** — grouped, with absent ones not implied
8. **Area detail** — the three area bases stated separately, with a plain
   sentence explaining why they differ
9. **Location** — locality, sub-locality, what the place is (no map yet)
10. **Seller** — owner / agent / builder, name, listing age
11. **Disclaimers** — what we check and what we do not
12. **Footer discovery** — back into search for this locality and type

### Behaviour

- The page reads top-to-bottom on a phone with no horizontal scrolling and
  no section requiring a tap to reveal essential information. Progressive
  disclosure is allowed for the description (clamp + "Read more") and
  amenities beyond the first eight.
- The save control is present and optimistic, exactly as on a card, and is
  honest that it is local until Phase 8.
- Price and area render only through `PriceDisplay` and `AreaDisplay`.
- Long values must not break the layout: a 60-character society name, a
  ₹3.25 Cr price, a four-line address, a 2,000-character description.

### Copy rules

- No claim the platform cannot stand behind. No "verified", no "premium",
  no "trending", no view counts.
- An absent field is absent, not "N/A" and not zero. A listing with no
  stated floor says nothing about floors rather than "Floor — of —".
- The disclaimer states plainly that listings are posted by owners, agents
  and builders, that we review against content rules, and that we do not
  verify ownership, documents, measurements or prices.

---

## 3. Technical requirements

- Server component. No listing data reaches the client bundle except what
  an interactive control genuinely needs.
- `lib/property/queries.ts` gains `getPropertyDetail(publicId)`. It is the
  only new data entry point, and it stays behind the existing seam.
- A `PropertyDetail` type extends `PropertySummary` with the fields a page
  needs and a card does not — description, the full amenity list, all three
  area bases, availability. `PropertySummary` is not widened.
- URL is `{slug}-{publicId}`. `publicId` is the identity; the slug is
  decoration. A request whose slug does not match the stored slug **301s**
  to the canonical URL rather than rendering — otherwise every stale share
  link becomes a duplicate page.
- `generateMetadata` produces a per-listing title, description, canonical
  and OG image.
- JSON-LD emitted server-side. Every field in it must be a field we
  actually hold; no inferred or padded values.
- `revalidate` consistent with the results route.
- No new npm dependency without it being named here first.

---

## 4. Data requirements

Extends the fixture; introduces no new entity. (`project`, `builder` and
`agent` are Phases 31, 33 and 36 — see the deferred model register.)

New fields on the detail type:

| Field | Type | Notes |
|---|---|---|
| `description` | `string` | Seller prose. May be absent. |
| `builtUpArea` | `number?` | Stated separately, never merged |
| `availableFrom` | `string?` | Already present for rent |
| `possessionBy` | `string?` | Under-construction only |
| `ownershipType` | enum | Freehold / leasehold / power of attorney |
| `facingDetail` | reuse `facing` | — |
| `waterSource`, `powerBackup` | enum? | Already partly in amenities |

Fixture must include, deliberately:

- a listing with **no description**
- a listing with a **2,000-character** description
- a listing with **no photo** (already present)
- a listing with **no floor**, **no age**, **no facing**
- a listing with **all three area bases** and one with **carpet only**
- a **₹3.25 Cr** listing and a **₹15 L** listing
- an **under-construction** listing with a possession date
- a **rent** listing with an availability date

---

## 5. Edge cases

| Case | Required behaviour |
|---|---|
| Unknown `publicId` | 404 with correct status, branded page |
| Slug mismatch | 301 to canonical, never a soft duplicate |
| Listing not live (draft, expired, closed) | 404 today; Phase 15 gives it a real "no longer available" page |
| No photos | Architectural placeholder, never a broken image |
| No description | Section omitted entirely, not an empty heading |
| No amenities | Section omitted |
| Only carpet area known | Show carpet; do not infer the others |
| Missing floor / age / facing | Row omitted from the key-facts grid |
| Very long society or address | Wraps, never truncates the price |
| 2,000-character description | Clamped with an accessible expand |
| Price of ₹3.25 Cr and ₹6,000/mo | Both render correctly through `PriceDisplay` |
| Direct load vs. soft navigation from results | Identical output |
| JavaScript unavailable | Every piece of information is still readable |

---

## 6. Accessibility requirements

Specific and testable:

- One `h1` — the listing identity. Sections are `h2`, sub-blocks `h3`,
  with no level skipped.
- Every section is a `<section>` with `aria-labelledby` pointing at its
  heading, so a screen reader can jump between them.
- The key-facts grid is a definition list (`dl`/`dt`/`dd`), not a table and
  not a div soup — the relationship is label-to-value.
- The description expand control is a `button` with `aria-expanded` and
  `aria-controls`, and the collapsed text is not hidden from assistive tech
  in a way that loses it.
- The save control keeps `aria-pressed` and a label naming the property.
- Breadcrumb is `nav` + `aria-label="Breadcrumb"` + `ol`, current page
  marked `aria-current="page"`.
- Every interactive target is at least 44×44 CSS px.
- Focus order follows reading order; focus ring never removed.
- Contrast: every text/background pairing measured, not eyeballed, at the
  thresholds already established (4.5:1 normal, 3:1 large).
- The page is fully operable by keyboard alone, verified by scripted
  traversal, not by assertion.

---

## 7. Responsive requirements

Verified at **390 / 412 / 768 / 1280**, plus 360 as a stress width.

- **390–767** — single column. Media full-bleed to the gutter. Price header
  sticky at the top on scroll so the figure stays visible while reading
  specs. Key facts two columns.
- **768–1023** — single column, wider gutters, key facts three columns.
- **1024+** — two columns: content left, a sticky right column carrying the
  price, seller identity and (from Phase 6) contact. Right column must
  never overlap the footer.
- No horizontal overflow at any width, enforced by `npm run shots`.
- The light theme holds under a dark-mode browser, enforced by
  `npm run light-check` extended to this route.
- Media area reserves its aspect ratio so the page does not shift as the
  image loads.

---

## 8. Verification

**Unit** — `getPropertyDetail` resolution, slug canonicalisation, JSON-LD
shape (every emitted field is one we hold), section omission logic for each
absent field, and the area/price formatting paths not already covered.

**Browser** — a new `scripts/property-check.mjs` in the same shape as
`search-check`, asserting at all four widths:

1. A result card links to a page that renders that same listing
2. Slug mismatch redirects, and the response is a 301
3. Unknown id returns a real 404 status, not a 200 with a 404 page
4. Every section present for a fully-populated listing
5. Every optional section **absent** for the sparse listing — asserted as
   absent, not merely "not visible"
6. Heading hierarchy has no skipped level
7. Keyboard traversal reaches every interactive control in reading order
8. Description expand toggles `aria-expanded` and reveals the full text
9. Sticky price header does not cover content or overlap the footer
10. Long society name and ₹3.25 Cr price do not overflow the card at 360
11. JSON-LD parses and validates against the expected shape
12. Back from the page returns to the same filtered results, scrolled to
    the same place

**Standing suites** — `verify`, `build`, `shots`, `light-check`,
`search-check` all still pass; `shots` and `light-check` extended to cover
the new route.

**Not accepted as verification:** a screenshot, or a check that passes
because the state it tests was never reached.

---

## 9. Production readiness

What would have to be true to put this in front of real buyers:

- [ ] All four standing suites green, plus the new property suite
- [ ] Every status code correct — 200, 301, 404 — verified by request, not
      by rendered content
- [ ] JSON-LD validates and contains no field the platform does not hold
- [ ] No text on the page asserts something the platform has not checked
- [ ] Zero horizontal overflow, 360 through 1280
- [ ] Keyboard-only traversal completes the page
- [ ] Contrast measured on every pairing introduced by this phase
- [ ] Cumulative layout shift under 0.05 with a cold image cache
- [ ] The page renders correctly with JavaScript disabled
- [ ] Every new string is brand-independent — reads from `lib/brand.ts`
      where it names the product
- [ ] Seeded data still labelled as development data

**Known to remain incomplete after this phase**, by design: no contact
action, no gallery, no similar properties, no map, no project or builder
link. Each has a phase.

---

## Open questions for approval

1. **Contact CTA.** Proposed: omit it entirely this phase rather than ship
   a dead control. Alternative: fold Phase 6 in and deliver a converting
   page in one go. The first is cleaner; the second gets a usable page
   sooner. **Recommendation: omit, keep Phase 6 separate.**

2. **Sticky price on mobile.** Costs vertical space on a 390px screen.
   Proposed: sticky, because the price is what the rest of the page is
   being judged against. Happy to make it non-sticky if you disagree.

3. **Ownership type.** Freehold / leasehold / power-of-attorney is
   genuinely material in Kolkata and absent from the V0 model. Proposed:
   add it as a listing field now. It is a field, not an entity, so it does
   not conflict with the "no premature models" rule.
