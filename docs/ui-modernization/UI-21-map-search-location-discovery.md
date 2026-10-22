# UI-21 — Map search and location discovery

Status: complete, 22 October 2026, on `main`. Stage A (`b8a0d54`) was approved by the owner in one review. The eighth stage of the visual track, after [UI-20](UI-20-admin-workspace-visual-redesign.md).

Search gains a **Map** mode beside the list. A marker means **"this locality has matching homes"**, never "this property is here".

Relation to the roadmap: Phase 34 (Map search) in `Phases.txt` stays open. UI-21 delivers its locality-level part (the map, map/list synchronisation, the mobile map). Its property markers, search area and clustering need verified home coordinates and a geographic query, which do not exist yet.

Unchanged: the UI-15 list (still the default), the search engine and its filters, the schema, auth, seller permissions, moderation, enquiries, Saved and the listing lifecycle.

## Why locality-level, and why no property pins

- **No coordinates existed for the demo inventory.** The demo listings that Search serves carry no coordinates, and the gazetteer had none.
- **Seller coordinates are not suitable.** Real listings may carry them, but they are optional, seller-entered, unverified and exact, and buyers have never been shown them geographically. Pinning them would publish a precision the product has never claimed.
- **What the owner chose.** A locality map with one cited point per locality, and never more precise than the locality the card already names (Stage A decision).
- **No inventing.** No coordinate is invented and none is geocoded. A locality without a trustworthy point stays off the map.

## Location data

See the full record in [docs/data/locality-centres.md](../data/locality-centres.md), which lists every point, its source record, licence, independent reference and distance.

- **Sources:**
  - India Post pincode directory (data.gov.in, GODL-India);
  - GeoNames (CC BY 4.0).

  They were substituted for OpenStreetMap because the build environment could not reach OSM. The owner approved this for Stage A.
- **Stage B verification.** Every kept point was cross-checked against the locality's independent published coordinates and kept only within 2 km of them. The test `lib/location/centres.test.ts` fails on drift. The check changed three localities:
  - Garia → its GeoNames record;
  - Uttarpara Kotrung → its GeoNames record;
  - Rajarhat → **unplaced** (its sources disagree by up to 4.6 km).
- **OpenStreetMap verification: not done, a pre-launch blocker.** OSM, Nominatim, Overpass and the tile host stayed unreachable from this environment. This map makes a clearly labelled *approximate area* claim and nothing more.
- **25 localities placed.**
- **7 not on the map:** Rajarhat, E M Bypass, Baguiati, Kestopur, Bhowanipore, Kasba, Beliaghata. E M Bypass is a corridor, not an area, and would need a geometry model.

## The experience

**Mode and URL**
- **List is the default.** Map is chosen with List | Map, the Buy | Rent pill reused.
- **The mode is `?view=map`.** The switch is a pair of links, so it works without JavaScript, survives filters, sort, paging and Buy/Rent, and back, forward, refresh and a shared link all work.
- **Not indexed.** Canonical URLs drop the mode, and the map view is noindexed.

**Layouts**
- **Desktop (from 1024px):** results on the left, a sticky map on the right (about 1 : 1.15). The area index sits under the map, scrolling within its own share of the height. In map view the filters are in the sheet on every width.
- **Phone:** the map takes the results' place. The chosen area's preview is a card held above the bottom bar, at most 45% of the screen. Its button leads to the list of that area's homes.

**Markers**
- **One per placed locality.** Each shows the real count of matching homes.
- **Real buttons.** Each is named "Salt Lake: 4 homes, from ₹45.5 L. Approximate area." (the price through the product's formatter) and pressed when chosen.
- **Chosen is shown by shape, not colour alone:** inverted, ringed, larger and named.
- **Sizes:** markers and zoom buttons are 44px targets.
- **No clustering:** at most 25 points.

**Counts and prices**
- **Counts cover every match, not the page.** They come from the same filtered set the list pages (`LocalityMatch` in the search seam). Sub-localities roll up into their locality (`lib/search/areas.ts`).
- **No second filtering path.** The map has no filtering logic of its own.

**Card ↔ marker**
- **A press on a marker** opens its preview and outlines that area's cards on the page, all of them: many homes share one marker.
- **A focused or hovered card** marks its area's marker, so a keyboard gets the same link a pointer does.
- **"Show only these"** is the ordinary filter link for that area's localities.

**Area index**
- **Every area in the results** with its count and lowest price, plus a "Not on the map" group.
- **The map's equivalent:** for keyboard users, without JavaScript, when the basemap fails, and for unplaced areas.

**Not built**
- **No "Search this area."** Search has no geographic bounds query, and these points are areas, not home positions. Deferred until database-backed geographic search exists.

## Accessibility and no-JavaScript

- **Structure:** one h1. The map section is labelled, and the map canvas is named with its keys (arrows pan, plus and minus zoom; rotation is off).
- **Keyboard order:** markers come in alphabetical order.
- **Focus:**
  - Enter moves focus into the preview.
  - Escape or Close returns focus to the marker.
  - Switching modes keeps focus on the switch, because the frame does not remount.
  - Selections are announced.
- **Reduced motion:** markers change size and the preview appears without easing. Validation caught both moving under reduced motion.
- **Without JavaScript:**
  - the list works as before;
  - in map view the map frame gives way to a sentence, and the area index links narrow the search;
  - List brings the cards back.

## Failure

- **Every map failure becomes one notice in the map's place:**
  - no WebGL2 (checked before MapLibre is fetched);
  - MapLibre's code not loading;
  - the style failing;
  - a 15-second timeout.
- **Recovery:** the notice says "Show the list", with no dead controls over it. The list and the area index keep working.
- **After the map loads,** a missing tile is a gap in the basemap, and the markers stay right.

## Map stack

- **MapLibre GL JS 6.12.0** (BSD-3-Clause).
  - **Why this version:** pinned exactly, because 6.15.0 was 4 days old at Stage A. No upgrade in Stage B.
  - **How it loads:** `scripts/vendor-maplibre.mjs` copies the package's ES modules to `/vendor/maplibre-gl/6.12.0/` before build and dev (git-ignored, served `immutable`). The map imports them at runtime only when the map view mounts.
  - **Why it is not bundled:** bundled, webpack gives the page and the worker each a copy of the 147 KB shared module. Served, it is fetched once (checked per page load).
  - **Isolation:** the map component itself is a lazy chunk. Map CSS is a Search-only stylesheet. A unit test keeps the served version equal to the installed package.
- **Basemap: OpenFreeMap's public instance** (`positron` style). Free, no key, no account.
  - **No availability guarantee.** It has no availability promise and GharBazaar has no SLA with it. If it fails, Search still works (above).
  - **Self-hosting:** production may later host its own copy and point `NEXT_PUBLIC_MAP_STYLE_URL` at it (a URL, not a secret). Self-hosted tiles are not part of UI-21.
- **Attribution:**
  - **The basemap's credit** is never collapsed: bottom-right beside the list (the preview is top-left, and validation checks it is not covered), top-left on a phone.
  - **The area positions' credit** (India Post, GeoNames) is under the map.
- **Real basemap not verified here.** The tile host was blocked throughout, so real-basemap behaviour (tile rendering, marker alignment over streets) could not be seen. The browser checks answer the style request with a minimal stand-in, only inside the test, to exercise this product's behaviour.

## Performance

Measured against UI-20, production build, first load:

| | Before | After |
|---|---|---|
| Search, list view JS (gzip) | 182.3 KB | 183.6 KB |
| Search, map view: on demand | — | MapLibre 295 KB (149.6 + 145.5) + 10.7 KB CSS + map component 3.9 KB; worker ~6 KB |
| Home / Property / Login / 404 / Post JS | 179.5 / 214.7 / 171.8 / 179.5 / 171.4 KB | unchanged (Property +0.1) |
| Shared CSS | 31.3 KB | 31.4 KB (new utility classes); map CSS loads on Search only |

- **No leaks.** No map code, centre data or map CSS reaches any other route. Validation found the centre table leaking into Home's chunk through the typeahead's import of the place tree; it is now read only by the map's query.
- **Tiles are not measured:** the tile host was unreachable.

## Sources

- **Kokonut UI** (`bb9120f8`): nothing added. Four candidates were rejected:
  - `topo-background` would fake geography;
  - `smooth-drawer` and `morph-popover` bring Motion and drag behaviour a static card does not need;
  - `smooth-tab` is in-page tab state, but List | Map is URL navigation.
- **Motion** and **Anime.js:** not used. The preview's CSS pop-in is enough, and there is no timeline or SVG sequence.
- **Bklit:** not applicable. Geography is not charted.
- **Dependency:** one new, `maplibre-gl` 6.12.0, recorded above.

## Validation

One comprehensive run on the final build; after the fixes below, only the checks that cover Search were re-run.

| Command / check | Result |
|---|---|
| `npm run verify` | lint clean; 715 unit tests, including the locality cross-check (every point within 2 km of its reference), the area grouping and `view=map` parsing, round-trip and canonical |
| `npm run build` | passes |
| **map-check** (new, in CI) | **94**. Marker counts and lowest prices recomputed from the cards on every page for six searches: Buy, Rent, bedrooms, type with a price ceiling, one locality, and localities that include unplaced E M Bypass. Also covered: page 2 draws page 1's markers; the unplaced area is listed and never drawn; the split, the sticky map, credits and 44px targets; selection, outlines, Escape, Enter into the preview, Close, the card ↔ marker link; pan and zoom changing nothing; back, forward and refresh; one MapLibre download, nothing more on reopening; canonical and noindex; phone widths 320 / 360 / 390 / 430 (map replaces results, preview above the bar and at most 45% tall, credit not covered); no overflow from 320 to 1920 in both modes; a failing basemap, missing WebGL2 and no JavaScript; reduced motion |
| search-check | 80 |
| phase-e, moderation 65, users 170, listing, dashboard 176, performance 229, admin 289, description, preview | all pass |
| shots, light, home 163, calculator, shell 355, motion 117, ui 137, pricing, post, notfound, login (public and signed in), property 73, media | all pass |
| lead, saved, draft, photo 62, auth | all pass |

**Defects found and fixed:**
- **Reduced motion:** the preview's entrance and the markers' size transitions ran under reduced motion; they are now behind `prefers-reduced-motion: no-preference`, like the rest of the motion layer.
- **Marker focus and Escape:** a pointer press on a marker never focused it, because MapLibre cancels the press to start a drag. The pressed state was unreachable and Escape went to `<body>`. The marker now takes focus on press, and Escape closes an open preview from anywhere unless a dialog has handled it.
- **Locality data:** the cross-check moved Garia and Uttarpara Kotrung to their GeoNames records and took Rajarhat off the map.

**Test-layer fixes (no product change):**
- the price selector (cards use `text-price-lg`);
- a search with no placed area has no map to wait for;
- MapLibre credits a source only while a layer uses it, so the stand-in style now uses its source;
- request routing turns Chromium's cache off, so the one-download check runs unrouted;
- back is a client transition, so the check waits for the list itself.

**Not provoked here:**
- the real basemap: its host was unreachable;
- tile errors after load: no tiles exist in this environment.

**Unexplained:** one run of the design tests failed three file-walking tests once during editing. Eleven further runs and both verify runs passed, and the failure output was not captured. If it recurs, capture it.

## Privacy follow-up (not changed in UI-21)

- **The exposure.** Anonymous reads can select a live listing's `address`, `latitude` and `longitude`: the `submission_public` policy with the Phase 18 column grant. `lib/listings/queries.ts` also selects them for the public listing page. This holds even though the product deliberately shows no exact pin.
- **What happens next:** a dedicated security and privacy review should decide whether exact coordinates may stay readable anonymously.
- **UI-21's part:** UI-21 does not read or display them.

## Remaining issues

- **OSM verification of the 25 points** is a pre-launch blocker (above).
- **The real OpenFreeMap basemap** is unverified in this environment.
- **The public OpenFreeMap instance** carries no availability guarantee.
- **The anonymous exact-coordinate exposure** awaits its review.
- **Seven localities are unplaced.** A locality polygon or corridor model would be needed for E M Bypass.
- **From UI-20:** dead Home CSS; gallery and dashboard/admin thumbnails at size.

## UI-22 recommendation

The planned final polish:
- a cross-site consistency pass;
- sized private thumbnails for gallery, dashboard and admin;
- dead Home CSS removed under style-diff.

Before any launch, separately:
- the OSM check of the locality points;
- the coordinate-exposure review.
