# UI-14 — Home visual redesign

Status: complete, 18 October 2026, on `main`. The first stage of the visual
track (UI-14 … UI-21). It builds on UI-01 to UI-13
([UI-13](UI-13-search-discovery.md)).

UI-14 is a visual redesign of the homepage, approved by the owner in two
screenshot reviews. Approved state: local commit `ccdbe9d`. Final
validation then found five defects, fixed below. Every figure on the page
is still a count of what is listed, and the sample-data notice stays.
The login and 404 scenes are untouched (style-diff fingerprints identical).
Outside Home, only the header and footer changed.

## Before → after

| | Before (UI-13) | After (UI-14) |
|---|---|---|
| Hero | Banner carousel above a search launcher that opened the search in a sheet | Kolkata photograph under a forest shade; one headline; the real search inline in a white card; shortcut chips with real counts |
| Search | One tap more on every visit (launcher → sheet) | Buy/Rent, locality, More filters and Search on the first screen at 360–430px; the picker and More filters are the only sheets |
| Width | A 1320px frame, which the owner found undersized on desktop | One 1400px frame for header, sections and footer (measured: same left edge at 1280/1440/1920) |
| Listing cards | Compact cards, four per row | Framed photo, then price (large), name, place, beds and carpet area as chips, then seller and date; three per row and a forest See-all card carrying the real total |
| Neighbourhoods | Twelve tinted tiles in scrolling panels | Eight cards with CSS map tiles, each count its own link; all 32 localities one disclosure away |
| Types / budget / size | Five separate bands of near-identical tiles | A property-type row with drawings; one "Browse your way" band of three panels (budget, bedrooms, seller and possession) |
| Surfaces | Many tinted blocks | White for listings, two soft mint zones for discovery |
| Seller | Light invitation | Forest band with the real posting steps |
| Footer | Light | Forest, with the logo, groups and legal line (contrast ≥ 6.6:1, measured) |

## Component and library decisions

- **Kokonut UI:** reused the existing SmoothTabs (UI-05) for Buy/Rent.
  No new component. `topo-background` was rejected (a canvas animation
  loop). `bento-grid` and `carousel-cards` were rejected (they bring
  Motion and lucide for layouts CSS grid already gives).
- **Motion:** not used. Card lift, photo zoom and arrow nudge are CSS
  transitions on the existing tokens, under `(hover: hover) and
  (pointer: fine)`. Reduced motion keeps the shadow, not the movement.
- **Anime.js:** not installed. Nothing on Home needs a timeline.
  A scroll-driven reveal (`animation-timeline: view()`) was tried and
  removed: it left sections blank in full-page captures and in print.
- **Bklit:** untouched. Home has no chart: there is no measured series
  to show, and Home figures are current counts, never history.
- **Other sources:** none. The hero photograph was already in the repo
  (`public/brand/kolkata-hero-v2.webp`, Phase 40A). Map tiles, property
  type drawings and icons are local CSS and SVG. Three tokens were added:
  `--text-display-xl`, `--shadow-lift` and `--shadow-hero`.

## Defects found in final validation, and fixed

1. **Rails snapped cards to the screen edge on phones.** Chrome snaps a
   mandatory scroller on load. Without scroll padding, the first card
   rested at x = 0, not on the 16px gutter, and so did every swiped
   card. Fix: `scroll-padding-inline` on both rails. `home-check` now
   requires cards to land in line with the section heading.
2. **The desktop locality list was clipped.** The hero's
   `overflow: hidden` cut the open suggestions off at its bottom edge
   (about 128px of options hidden). Fix: no clipping, and the hero gets
   `z-index: 1`. `home-check` hit-tests the list's lower part.
3. **The Home card moved under reduced motion.** It lifted 4px and
   zoomed its photo. Fix: `transform: none` under reduced motion, as for
   `.property-card`. `motion-check` asserts both cases.
4. **"Review" in the seller steps** tripped the honesty guard (it reads
   as ratings). The step is now "See it as buyers will".
5. **The header overflowed at 320px** on every page that shows its menu
   button: property pages, the post flow and login, 14 screens in
   `shots`. The plus icon added to Post property cost 22px. Below 360px
   the link drops the icon and keeps its pre-UI-14 width.
   performance-, lead-, photo- and login-check caught it too.

`DiscoveryBands.tsx` had no importer and is removed.

## Checks moved to the approved behaviour

Five browser checks still drove the removed launcher, banner and old
class names. Each now tests the new behaviour at least as strictly.

- **`home-check`:**
  - all four search controls are measured on the first screen at four
    phone sizes (it used to measure one launcher button);
  - without JavaScript, the hero swaps the form for sale and rent links
    (390 and 1280);
  - Tab order runs from the search into the hero shortcuts;
  - the 1400px frame is measured;
  - all 56 counts on the page are matched against their results pages,
    hero shortcuts included.
- **`ui-check`:** the tabs and the locality picker are reached from the
  inline form, and the field is a 44px target.
- **`motion-check`:** the nested-sheet test became a single-sheet test.
  No sheet opens over another any more, so it covers a key pressed
  during the picker's exit, three cycles, with focus back on the hero
  field. Home card hover and reduced-motion cases are added.
- **`light-check`:** the footer, See-all card, seller band and header
  Post button are forest by design. Their text is now held to 4.5:1 on
  the real surface, with alpha text blended over that surface (blending
  over white overstated it). New Home surfaces are probed too.
- **`phase-e-check`:** the carousel tests went with the carousel. Focus
  around More filters is tested over four fast open/close cycles, and
  the header stays pinned while scrolling.
- **Also updated:**
  - `saved-check`'s rail selector;
  - style-diff's Home scenes (the picker and the filters sheet).

## Mobile

- No horizontal overflow at 320, 360, 375, 390, 412, 430, 768, 1024 and
  1280 (`shots`, `home-check`).
- CLS 0.0000 while the page loads and scrolls, at every width measured.
- At 390×844:
  - the whole search sits on the first screen, clear of the header and
    the bottom bar;
  - the first listings section's heading is on the first screen, and its
    first card starts just below the bottom bar;
  - on a 412×915 phone, the first card is on the first screen too.
- Rails swipe with a next-card peek and land on the gutter.
- Every count link, shortcut and hero chip is at least 44px tall.

## Bundle and performance

Measured against UI-13 (`9d25871`), both built with `npm run build`:

| | UI-13 | UI-14 | Δ |
|---|---|---|---|
| Home, client JS on first load (gzip) | 178.6 KB | 177.9 KB | −0.7 KB: the launcher's sheet code is gone |
| Every other public route, client JS | | | ±0.0 KB |
| Signed-in routes (manifest upper bound) | | | −0.7 KB: the same shared chunk |
| Shared stylesheet, every page (gzip) | 25.3 KB | 27.4 KB | +2.1 KB: the Home styles; the dead old-Home rules still ship |
| Home HTML (gzip) | 31.5 KB | 38.4 KB | +6.9 KB: the search form is server-rendered inline, and the cards and neighbourhood tiles carry more markup |
| Search and property HTML (gzip) | 28.5 / 25.7 KB | 28.9 / 26.0 KB | +0.3–0.4 KB: header and footer |

The hero photograph used to be a 244 KB CSS background, which the
browser found late. It is now the page's responsive priority image (and
its LCP element):

| First-screen images | UI-13 | UI-14 |
|---|---|---|
| Phone, 390px at 2x | 296 KB (photo 244 KB) | 83 KB (photo 31 KB) |
| Desktop, 1280px | 266 KB (photo 244 KB) | 73 KB (photo 46 KB) |

There is no layout shift (CLS 0.0000) at any width measured.

style-diff, UI-13 against the final build, over 73 screens:
- the login street and the 404 scene are fingerprint-identical;
- outside Home, the only changes are the header, the footer and the
  page height the taller footer adds;
- workspace and admin screens are unchanged.

No new dependency. No 20-run benchmarks: nothing measured a regression
that called for one.

## Known remaining issues

- **Dead CSS:** about 60 rules of old Home CSS (`reference-banner`,
  `quick-*`, `locality-tile*`, `type-tile*`, `count-tile*`,
  `discovery-band*`, `why-*` …) are now unreferenced. Removing them is a
  shared-CSS change, which needs its own `style-diff --expect-none` run.
  It belongs at the start of UI-15. Some names look dead but are built
  at runtime (`home-map-${i}`, `type-tone-${i}`); keep those.
- **Header and footer width:** both use the 1400px frame on every page,
  but other pages' content is still 1320px, so on wide screens their
  edges sit 40px apart. UI-15 onwards bring those pages to 1400px.
- **Gallery:** `media-check` still fails locally (25/26), as before
  UI-14. Unrelated to Home.
- **No-JS filters:** the results page's filter rail still needs
  JavaScript (UI-13 §10).

## UI-15 recommendation

Search Results visual redesign:
- the same 1400px frame and zones;
- the UI-14 card hierarchy (price, name, place, figure chips, then
  seller and date) on the results card;
- a forest-and-mint filter rail;
- a results header in the display type.

Start by removing the dead Home CSS under `style-diff --expect-none`.
Keep URL semantics, no-JS search and the UI-13 focus rules as they are.
