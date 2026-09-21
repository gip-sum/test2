# Phase 4 — Property detail page

**Status:** PROPOSED — awaiting approval. No code written.
**Source of scope:** `Phases.txt` → Phase 4.
**Depends on:** Phase 3 (results link here).

> Revised after the client's master roadmap arrived. My first draft split
> gallery, contact and similar properties into separate phases; `Phases.txt`
> puts all three in Phase 4's key focus. This spec follows `Phases.txt`.

---

## 1. Scope

The central conversion surface of the marketplace. Everything before it
exists to get a buyer here, and everything after it depends on the buyer
deciding to act here.

### In scope — the nine key-focus areas

| Focus | What Phase 4 delivers |
|---|---|
| **Gallery** | Working multi-image viewer: thumbnails, next/previous, counter, keyboard. Not the full media system — Phase 5 adds full-screen, swipe gestures and responsive sources. |
| **Price** | Price, price per carpet sqft, rent deposit and maintenance where known, price-reduced marker |
| **Property facts** | Carpet / built-up / super area stated separately, floor of total, facing, age or possession, furnishing, parking, ownership, availability |
| **Description** | Seller prose, clamped with an accessible expand |
| **Amenities** | Grouped, with absence never implied as presence |
| **Location** | Breadcrumb, locality and sub-locality, address line. No map — Phase 34. |
| **Seller information** | Owner / agent / builder, name, listing age, response expectation |
| **Contact / enquiry** | A working enquiry form that creates a real enquiry record through a new `lib/enquiry` seam |
| **Similar properties** | Ranked by an explainable rule, not a black box |

Plus: route and canonicalisation, structured data, metadata, and the
not-found / unavailable states.

### Explicitly out of scope, and where it lives

| Out | Phase |
|---|---|
| Full-screen gallery, swipe, floor plans, responsive image sources | 5 |
| Sign-in; enquiring is possible without an account | 6 |
| Enquiry inbox, lead status, duplicate handling, lead history | 9 |
| **Phone number reveal and OTP** — no reveal control ships in Phase 4 | 10 |
| Shortlist persistence — the save control stays local | 8 |
| Map, distance, commute | 34, 35 |
| Locality statistics, price trends, price positioning | 50, 51, 52 |
| Project and builder links from a listing | 43, 44 |
| Reviews, ratings, verification badges | 48, 65 |
| Report listing | 24 |
| Behavioural recommendations | 39 |

**No phone reveal in this phase.** Phase 10 owns controlled phone access
with OTP and an audit trail. Phase 4 ships the enquiry form only, and shows
no phone number anywhere — not masked, not partial. A masked number now
would have to be unshipped when the real access control arrives.

---

## 2. UX requirements

### Content order

Fixed, following the sequence a buyer actually decides in — *can I afford
it*, *does it fit*, *where is it*, *who is selling*, *what else is there*:

1. Breadcrumb — Kolkata › New Town › 3 BHK flat
2. Gallery
3. Price header — price, per-sqft, reduced marker, save control
4. Identity — configuration, society or title, address line
5. Key facts grid
6. Description
7. Amenities
8. Area detail — three bases separately, with a sentence on why they differ
9. Location
10. Seller information
11. **Contact** — the primary action
12. Similar properties
13. Disclaimers
14. Footer discovery — back into search for this locality and type

### Contact behaviour

- Primary CTA is present, prominent, and uses the **buyer** accent, not the
  seller's orange.
- On phones the CTA lives in a **sticky bottom bar** above the bottom nav,
  because the decision to contact happens anywhere on a long page. On
  desktop it sits in the sticky right column.
- The form asks for name, phone and an optional message. Nothing else.
  Every additional field measurably costs leads.
- Submitting shows an immediate, honest confirmation: the enquiry has been
  sent to the seller, the seller has the buyer's number, and the buyer will
  **not** see the seller's number in this release.
- Submitting twice for the same listing is not an error and not a silent
  no-op. The user is told the enquiry already went; Phase 9 owns real
  duplicate handling.
- A failed submission preserves everything typed.

### Similar properties

Explainable, because "similar" that cannot be explained is noise:

1. Same locality, same intent, same bedroom count, price within ±25%
2. Falls back to same locality and intent within ±40%
3. Falls back to the same sub-city area
4. Section is **omitted entirely** when fewer than three qualify

Never the current listing. Never padded to fill a row.

### Copy rules

- No claim the platform cannot stand behind: no "verified", "premium",
  "trending", no view counts, no "N people enquired".
- An absent field is absent, not "N/A" and not zero. A listing with no
  stated floor says nothing about floors.
- Disclaimer states plainly that listings are posted by owners, agents and
  builders, that we review against content rules, and that we do **not**
  verify ownership, documents, measurements or prices.

---

## 3. Technical requirements

- Server component. Only genuinely interactive parts — gallery, description
  expand, save, contact form — are client components.
- `lib/property/queries.ts` gains `getPropertyDetail(publicId)`.
  `lib/property/similar.ts` gains `getSimilarProperties(property)`. Both
  stay behind the existing data seam.
- **New `lib/enquiry/` domain module** with `createEnquiry(input)` and its
  own types. Backed by an in-memory store until the database lands, exactly
  as listings are today — same seam, same swap. Phase 9 extends the module;
  it does not replace it.
- A `PropertyDetail` type extends `PropertySummary` with what a page needs
  and a card does not. `PropertySummary` is **not** widened — the card
  payload stays small.
- URL is `/property/{slug}-{publicId}`. `publicId` is identity; the slug is
  decoration. A slug that does not match **301s** to canonical rather than
  rendering, or every stale share link mints a duplicate page.
- `generateMetadata` per listing: title, description, canonical, OG image.
- JSON-LD server-side. Every emitted field must be one we actually hold —
  no inferred values, no padding.
- Enquiry submission is a **server action** with server-side validation.
  Client validation is a convenience, never the boundary.
- Phone numbers are validated as Indian mobile numbers, stored normalised.
- No new npm dependency without naming it here first.

---

## 4. Data requirements

Introduces one new entity (`enquiry`, per the register) and extends the
listing fixture. No project, builder or agent entity — those are 44, 43, 41.

### New: `enquiry`

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `listingId` | string | |
| `name` | string | |
| `phone` | string | Normalised E.164 |
| `message` | string? | |
| `createdAt` | ISO | |
| `source` | enum | `property_page` for now |

Deliberately **not** in Phase 4: lead status, assignment, follow-ups, read
state, seller notes. Those are Phase 9 and Phase 68.

### Listing detail fields

| Field | Type | Notes |
|---|---|---|
| `description` | string? | |
| `builtUpArea` | number? | Stated separately, never merged |
| `possessionBy` | string? | Under construction only |
| `ownershipType` | enum | Freehold / leasehold / power of attorney |
| `deposit` | number? | Rent only |
| `maintenanceMonthly` | number? | |
| `isNegotiable` | boolean? | |
| `photos` | expanded | Several per listing, for the gallery |

### Fixture must include, deliberately

A listing with **no description**; one with a **2,000-character**
description; one with **no photo**; one with **one photo**; one with
**twelve photos**; one with **no floor / age / facing**; one with **all
three area bases** and one **carpet only**; a **₹3.25 Cr** and a **₹15 L**;
an **under-construction** listing with possession; a **rent** listing with
deposit, maintenance and availability; and a locality with **fewer than
three** comparable listings, so the similar-properties omission path is
reachable.

---

## 5. Edge cases

| Case | Required behaviour |
|---|---|
| Unknown `publicId` | 404, correct status, branded page |
| Slug mismatch | 301 to canonical |
| Listing not live | 404 today; Phase 18 gives it a real "no longer available" page |
| No photos | Architectural placeholder; gallery controls not rendered |
| One photo | Gallery renders without next/previous or counter |
| Twelve photos | Thumbnails scroll; no layout shift |
| No description / no amenities | Section omitted, not an empty heading |
| Carpet area only | Show carpet; never infer the others |
| Fewer than three similar | Section omitted entirely |
| Enquiry: invalid phone | Field-level error, nothing else lost |
| Enquiry: server failure | Everything typed is preserved, retry offered |
| Enquiry: submitted twice | Told plainly; not an error, not silent |
| Enquiry: JS disabled | Form still submits — it is a real form posting to a server action |
| 2,000-character description | Clamped with an accessible expand |
| Very long society or address | Wraps; never truncates the price |
| Direct load vs. soft navigation | Identical output |

---

## 6. Accessibility requirements

- One `h1` — the listing identity. Sections `h2`, sub-blocks `h3`, no level
  skipped.
- Every section is `<section aria-labelledby>` pointing at its heading.
- Key facts are a `dl` / `dt` / `dd` — the relationship is label-to-value.
- **Gallery**: arrow keys move between images, image position announced via
  a live region ("Image 3 of 12"), every control has a name, focus is never
  lost when the image changes.
- **Description expand**: a `button` with `aria-expanded` and
  `aria-controls`; collapsed text is not hidden from assistive tech in a way
  that loses it.
- **Contact form**: every input has a real `<label>`; errors use
  `aria-describedby` and `aria-invalid`; the error summary receives focus on
  failed submit; success is announced in a live region.
- **Sticky mobile CTA** never covers content — the page reserves its height
  and it does not overlap the bottom nav.
- Breadcrumb is `nav[aria-label="Breadcrumb"]` + `ol`, current page
  `aria-current="page"`.
- Every interactive target ≥ 44×44 CSS px.
- Focus order follows reading order; focus ring never removed.
- Contrast measured on every pairing, not eyeballed.
- The whole page, gallery and form included, is operable by keyboard alone,
  verified by scripted traversal.

---

## 7. Responsive requirements

Verified at **390 / 412 / 768 / 1280**, plus 360 as a stress width.

- **390–767** — single column. Gallery full-bleed to the gutter. Price
  header sticky on scroll. Key facts two columns. **Contact CTA in a sticky
  bottom bar** above the bottom nav.
- **768–1023** — single column, wider gutters, key facts three columns,
  gallery with a thumbnail strip.
- **1024+** — two columns: content left; sticky right column carrying
  price, seller and the contact form. The right column must never overlap
  the footer.
- Gallery reserves its aspect ratio so nothing shifts as images load.
- No horizontal overflow at any width — `npm run shots`.
- Light theme holds under a dark-mode browser — `npm run light-check`
  extended to this route.

---

## 8. Verification

**Unit** — detail resolution, slug canonicalisation, similar-properties
ranking including every fallback tier and the omission threshold, enquiry
validation (phone formats, required fields, normalisation), JSON-LD shape,
and section-omission logic for each absent field.

**Browser** — a new `scripts/property-check.mjs` in the same shape as
`search-check`, at all four widths:

1. A result card links to a page rendering that same listing
2. Slug mismatch returns a **301**, unknown id a **404** — asserted on the
   response, not on rendered content
3. Every section present for a fully-populated listing
4. Every optional section **absent** for the sparse listing
5. Heading hierarchy has no skipped level
6. Gallery: arrow keys change the image, counter updates, focus retained
7. Gallery with one photo renders no navigation; with none, no gallery
8. Description expand toggles `aria-expanded` and reveals full text
9. Contact form rejects an invalid phone without losing other input
10. Contact form succeeds, announces success, and the enquiry is readable
    back through `lib/enquiry`
11. Submitting twice is handled and explained
12. Similar properties never include the current listing, and the section
    is absent where fewer than three qualify
13. Sticky CTA does not overlap the bottom nav or the footer
14. Keyboard traversal reaches every control in reading order
15. Long society name and ₹3.25 Cr price do not overflow at 360
16. JSON-LD parses and contains only fields we hold
17. Back from the page returns to the same filtered results

**Standing suites** — `verify`, `build`, `shots`, `light-check`,
`search-check` all still pass; `shots` and `light-check` extended to the
new route.

**Not accepted as verification:** a screenshot, or a check that passes
because the state it tests was never reached.

---

## 9. Production readiness

- [ ] All standing suites green, plus the new property suite
- [ ] Status codes correct — 200, 301, 404 — verified by request
- [ ] JSON-LD validates; contains no field the platform does not hold
- [ ] No text asserts anything the platform has not checked
- [ ] No phone number appears anywhere on the page
- [ ] Enquiry validated server-side; the form works with JS disabled
- [ ] Phone numbers stored normalised
- [ ] Zero horizontal overflow, 360 → 1280
- [ ] Keyboard-only traversal completes the page including gallery and form
- [ ] Contrast measured on every new pairing
- [ ] CLS under 0.05 with a cold image cache
- [ ] Every new string brand-independent
- [ ] Seeded data still labelled as development data

**Known to remain incomplete by design:** no phone reveal (10), no lead
management (9), no full-screen gallery (5), no map (34), no project or
builder link (43, 44), no reviews (48).

---

## Open questions

1. **Sticky mobile CTA vs. sticky price.** Both compete for the same strip
   on a 390px screen. **Recommendation: CTA wins**; the price stays in the
   header and scrolls away. Contacting is the conversion.

2. **`ownershipType`** — freehold / leasehold / power-of-attorney is
   genuinely material in Kolkata and absent from the V0 model. It is a
   field, not an entity, so it does not conflict with the no-premature-
   models rule. **Recommendation: add it.**

3. **Enquiry without an account.** Phase 6 is auth, so Phase 4 necessarily
   allows enquiring while signed out. **Recommendation: keep it that way
   permanently** — requiring an account before contact costs more leads than
   it prevents spam, and Phase 26 owns spam properly.
