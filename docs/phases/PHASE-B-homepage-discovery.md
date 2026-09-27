# Phase B — Homepage discovery and content density

**Status:** Implemented on `main` (September 2026), at the client's request. It follows the Phase A shell and reworks the Phase 2 homepage below the search. The 75-phase numbering is unchanged.

The goal is to make the homepage more useful and information-rich per screen, while keeping its premium look and the rule that nothing claims more than the platform knows. The information architecture was prompted by larger Indian portals. The implementation is GharBazaar's own, with no borrowed branding, wording, icons or layouts.

## 1. Scope

**In.** The homepage below the hero, in this order:

1. **Hero and search** — unchanged.
2. **Quick routes** — unchanged from Phase A, with the sample-data notice.
3. **Property collections**, as horizontal rails:
   - newest for sale ("Homes worth a closer look");
   - newest to rent;
   - price reduced.
   Each appears only when it has listings.
4. **Localities.** Each popular locality shows how many homes are for sale and to rent, each a link to its own results. The disclosure lists every locality in the city.
5. **Property types.** Each supported type shows its sale and rent counts. Types with no listings are left out.
6. **Budget.** The sale bands (up to ₹25 L … above ₹2 Cr) and rent bands (up to ₹10,000 … above ₹50,000), each with a real count. Empty bands are left out.
7. **Size.** 1–4 BHK for sale and to rent, with counts. Empty sizes are left out.
8. **New developments,** as listings that are under construction, in a rail that appears only when such listings exist. There is no project entity: this is listing data, titled for what it is (see 5).
9. **Plan your purchase:** the two home-loan calculators, the only guide-like content that exists.
10. **Why GharBazaar:** four factual statements about the product.
11. **The owner invitation,** unchanged.

The collection cards gain an "Under construction" status badge where it is true.

**Out.**

- Project pages and project inventory (Phases 44–47).
- Guides and articles (Phase 54).
- Plots and land: there is no property type for them.
- "Recommended for you" (Phase 39).
- Price trends and demand (Phases 50–51, 69).
- Any statistic, user count, rating or "verified" mark.

Each is listed in "Homepage sections waiting on their phase" in `docs/ROADMAP.md`.

Also out: search, the results page, the property page, authentication, enquiries, contact reveal and the seller dashboard.

## 2. UX requirements

- **A browse-first page after the search:** rails of real listings, then places, types, prices and sizes as compact tiles with counts, then planning and trust.
- **Every count is a link, and it matches the number the results page shows** for the same search.
  - A link appears only when that search has listings. A place or type with nothing for one intent shows only the other.
  - A popular locality with nothing listed at all keeps a single "Explore" link, which reaches the results page's own nearby-localities recovery.
- **Rails:**
  - Each ends in a "See all" card with its real total.
  - No listing appears in two rails on the page, and no rail repeats a cover photo.
  - On phones the next card peeks at the edge. From 1024px a rail is a single row of up to four.
- **Colour:** green is kept for labels, links and the primary action. Tiles take the soft tints already in the palette, so the page is not uniformly green. Photography supplies the rest of the variety.
- **Cards** keep the existing design:
  - price on the photo;
  - BHK and carpet area;
  - name and locality;
  - seller type and freshness;
  - at most two status badges: New, Price reduced or Under construction.

## 3. Technical requirements

- **`lib/home/discovery.ts`** builds every count and collection through the search seam (`searchProperties`), so each count is computed the way its results page computes it.
  - It takes an optional corpus, so the empty and sparse states are unit-tested.
  - Components receive plain data.
- **Links:**
  - Links use `buildLandingUrl` wherever a landing slug covers the search: localities, types, BHK, under construction, "up to ₹25 L". Only the budget ranges without a landing page, and the collections' "See all", use query strings.
  - Those are the results pages' existing canonical forms: sorted views are `noindex, follow`, so no new indexable URLs are minted.
- **`ListingRail`** becomes presentational, taking listings, total and destination as props.
- **The chips' 40px height becomes 44px** (budget, size and the locality index).

## 4. Data requirements

- No new entity, table or fixture.
- Counts and collections read `PropertySummary` fields that already exist: `postedAt`, `isPriceReduced`, `constructionStatus`, `propertyType`, `bedrooms`, `price` and `localitySlug`.
- **The sample corpus has only three distinct cover images,** so each rail shows at most three cards with it. Real listings, with their own photos, fill the rails to eight.

## 5. Edge cases

- **An empty corpus:**
  - the sale and rent rails show their existing "Nothing is listed … yet" invitation;
  - the other rails are hidden;
  - locality tiles fall back to "Explore";
  - the type, budget and size sections are hidden entirely.
- **One listing in a collection:** the rail shows one card and its "See all" card.
- **Long locality and type names:** they truncate within the tile, never overflowing.
- **No photo:** a listing without a photo never enters a rail. It is still counted, and it appears on results pages.
- **Price-reduced listings** are sale listings only in the data, so the collection is sale-only.
- **Under construction:** these are sale listings only; the rail and link are for sale.

## 6. Accessibility requirements

- Every section is a `<section>` labelled by its heading.
- **Links name what they lead to:** a count link's accessible name includes its place, type, band or size (for example "5 for sale in New Town" or "13 homes for sale, ₹25 L – ₹50 L").
- Targets are at least 44px, including the chips.
- A rail is a list that can be navigated by keyboard, and the card shows the focus ring.
- **"Why GharBazaar"** is a heading and a list of short statements, with decorative icons hidden from assistive technology.

## 7. Responsive requirements

At 390, 412, 768, 1024 and 1280:

- no horizontal overflow and no layout shift;
- rails scroll sideways below 1024px;
- locality and type tiles scroll sideways on phones and become grids on wider screens;
- budget and size tiles are grids;
- on desktop, budget and size sit side by side, so there is no half-empty row.

## 8. Verification

- **`npm run verify`**, including new unit tests for `lib/home/discovery.ts`:
  - counts equal search totals;
  - collections are disjoint, and none repeats a cover;
  - only true listings go into the reduced and under-construction rails;
  - the empty corpus hides what it should;
  - zero-count bands are omitted.
- **`npm run build`.**
- **`npm run home-check`, updated:**
  - every rail's total, and every locality, type, budget and size count, equals its results page;
  - every link resolves;
  - rails scroll and snap;
  - targets are at least 44px;
  - no overflow at five widths, and CLS stays below 0.01;
  - keyboard focus reaches the cards;
  - no invented words or claims.
- The rest of the suite, and before-and-after full-page captures at 390, 412, 768, 1024 and 1280.

## 9. Production readiness

- **Counts** are live from the search seam, so they stay true when fixtures become a database.
- **Cost:** the page regenerates hourly (`revalidate = 3600`). With a real corpus, the count queries should be one grouped query, not one search per tile.
- **Photos:** the three-cover limit disappears with real listings.
- **Projects and guides** replace the stand-ins when their phases ship.
