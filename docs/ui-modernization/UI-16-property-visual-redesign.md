# UI-16 — Property Details visual redesign

Status: complete, 20 October 2026, on `main`. The third stage of the visual
track, after [UI-15](UI-15-search-visual-redesign.md).

The property page now uses the Home and Search design language, and real
published listings (`/listing/[id]`) use the same layout and components.
The owner approved it in one review (Stage A, `2fb8028`), along with the
Motion gallery and its +30.7 KB gzip cost on the property route.
Behaviour from earlier phases is unchanged: the enquiry form's UI-12
guarantees, save, Copy link, the gallery's keyboard handling, no-JS
pages and forms. The login and 404 scenes are untouched.

## Before → after

| | Before (UI-15) | After (UI-16) |
|---|---|---|
| Frame | 1320px under a 1400px header and footer | The 1400px frame; a mint band holds the sample notice, the trail and the photos |
| Gallery, desktop | Lead photo, 2×2 previews, a thumbnail strip under them | A framed mosaic across the page: lead photo, four previews, "View all 12 photos", a counter, "+7 more"; thumbnails live in the viewer |
| Gallery, phone | Framed 4:3 photo, strip, "View photos" | Edge-to-edge 4:3 photo with swipe, the counter, a full-screen button and the save heart; no mosaic, no strip |
| Summary | Price, then save, name, a grey line of facts | Price (badges beside it), rate per sqft, terms (deposit, maintenance, negotiable), name, place, a bedrooms/bathrooms/carpet panel, type and status, then furnishing, availability, possession and floor; Copy link and the EMI link |
| Facts | 15 equal small boxes | Grouped label–value rows (the home; building and floor; ownership and availability), then the three areas in one panel with the rate's basis marked |
| Content | Boxes and pills | A reading measure for the description (same Read more), amenity checklists in columns, an address card beside the seller's landmarks (no map) |
| Contact | Price card with the form, separate seller box | One sticky card led by the seller (initials, name, category, posted), the listing and price reminder, the form, the self-declared note |
| Similar | Old card | The results card (UI-15) |

Real listings had their own simpler page, with an older contact card and
its own phone bar. Both are retired.

## Gallery architecture

- **`Gallery`** (client): one state (index, open, failed photos) drives two compositions:
  - `wide`: the mosaic from five photos, used on the property pages;
  - `column`: preview, moderation, and listings with fewer than five photos.
- **Motion and Kokonut.** Motion drives it, using Kokonut UI's Lightbox Grid technique (`gallery-motion.ts`, below):
  - a swipe moves the photo with the finger, and on release distance or speed decides;
  - the next photo arrives from the side it came from (72px, with a fade);
  - full screen grows the photo out of the frame or tile you pressed (transform plus clip-path); closing returns it to the frame;
  - on a phone, pulling the photo down closes the viewer.
- **Motion values** set transforms directly, so a drag re-renders nothing. The page renders on the server at rest (transform none, opacity 1); nothing waits for Motion to appear.
- **Viewer:** still our Radix dialog, with focus trap, the page made inert, Escape and focus returned. The arrows are 44px, positions are announced, and arrow keys work.
- **Reduced motion:** nothing follows the finger and nothing moves; photos change in place and the viewer fades.
- **Removed:** UI-08's CSS 16px nudge and the old CSS lightbox fade.

## `/listing/[id]`: one implementation

- **Shared layout.** `PropertyLayout` (frame, band, columns, sticky aside, phone bar, `<noscript>` form) and `Section` are used by both pages.
- **Shared data shapes.** `PropertyOverview` and the contact panel take one data shape each, built by adapters:
  - fixtures: `lib/property/overview.ts`;
  - real listings: `lib/listings/overview.ts`.
- **Generalised for real data:**
  - `LocationBlock` shows a real listing's own address, marked "Seller-provided location. It has not been verified.";
  - `KeyDetails` gained possession month and "available now";
  - preview and moderation dropped their loose duplicate lines.
- **Left out, not invented:** a real listing has no amenities, landmarks, facing or ownership, so those sections or rows are absent. "Maintenance not specified" is left out.
- **Callers:**
  - **Visitor:** the card, bar and sheet.
  - **Owner:** an owner panel in place of the form, and no save heart.
  - **Submitted copy:** neither, with "Listed by" shown at every width.
- **Covered by dashboard-check:** six photos (mosaic, viewer), one photo, a failed photo, a named society versus the title, rent terms, owner versus visitor, no-JS content, and a no-JS enquiry that posts and is confirmed.

## Broken-image fix

- **Root cause:** media-check blocked `living-warm.png`; the file had become `.webp`, so nothing was blocked. The check now blocks the real file.
- **One fallback.** `PhotoFallback` serves the gallery, viewer (dark), cards and photo manager:
  - a faint street drawing, a slashed-photo icon and "Image could not load";
  - one `role="img"` carrying the photo's description;
  - it fills the reserved box, and every control on it still works.
- **Without JavaScript:** `img[data-photo]::before` paints the media ground over a failed image. Only a failed image draws pseudo-elements, so the browser's broken icon never shows.
- **Checks:** the media-check assertion was strengthened (same box, in the viewer, no icon without JS); photo-check covers the manager.

## Motion and bundle

Measured against UI-15 (`06feb9d`), both built with `npm run build`:

| | UI-15 | UI-16 | Δ |
|---|---|---|---|
| Property, client JS on first load (gzip) | 178.9 KB | 211.8 KB | **+33.0 KB**: Motion's animation engine ~28.9 KB, the gallery and new parts the rest |
| Other routes | | | +0.6 to +1.9 KB (see below) |
| Shared stylesheet (gzip) | 28.1 KB | 28.6 KB | +0.5 KB |
| Property HTML (gzip) | 26.0 KB | 28.1 KB | +2.1 KB |

- **Motion's cost** is confined to pages that render the gallery: property, real listing, draft preview and moderation.
- **Other routes:** no gallery code reaches them. Their growth is:
  - webpack moving `SavedProvider` into its own shared chunk (about +0.6 KB of chunk overhead) and a slightly larger runtime and layout;
  - the photo fallback inside the card on Home, Search and Saved.
- **Layout shift:** media-check and motion-check confirm no layout shift as photos arrive or change.
- **No benchmark run.** No regression called for one.
- **style-diff (UI-15 → UI-16, 40 screens):**
  - login and 404 scenes are identical;
  - outside the property page, the only computed change is the photo guard's `::before` on listing images (never drawn for a loaded image);
  - a resolved `auto` margin on the guest activity page, with nothing moved;
  - Home card transitions differ only by capture timing (verified identical).

## Sources

- **Kokonut UI:** Lightbox Grid technique, adapted.
  - **Pinned source:** github.com/kokonut-labs/kokonutui `bb9120f8`, `components/kokonutui/lightbox-grid.tsx` v1.0.0 by @dorianbaffier. MIT License.
  - **Kept:** the transform-and-clip flight from the box, release by distance or speed, axis lock, and pull to close.
  - **Changed:** Radix Dialog kept instead of a hand-rolled dialog; 44px targets; position announcements and arrow keys; GharBazaar tokens and styling; springs on the motion scale with no bounce; reduced motion with no movement; phone arrows kept; wrap-around; integration with the existing gallery, data and fallback.
  - The Kokonut component itself was not shipped. Provenance is recorded in `components/property/gallery-motion.ts`.
- **Motion:** in production for the first time, on the gallery only, as above.
- **Anime.js:** not added. There is no timeline or SVG sequence on this page.
- **Bklit:** not applicable. There is no data visualisation here; Bklit stays on seller analytics (UI-10).
- **Others:** none. Radix Dialog was already in use. Embla would have been a new dependency for what Motion covers.

## Mobile, accessibility, no JavaScript

- **Mobile:**
  - no horizontal overflow at 320 to 1440px, on six listing shapes and the real listing;
  - at a true 320px viewport, the carpet figure now wraps (it overflowed by 1px);
  - 16px fields and 44px targets;
  - one bottom bar (the bottom nav hides on these routes) with the strip reserved;
  - the full card is never at the top of a phone page.
- **Accessibility:**
  - one h1 and no skipped heading levels;
  - the facts are definition lists;
  - the gallery's group, status and announcements are kept;
  - the viewer has a focus trap and returns focus;
  - Read more is unchanged;
  - the contact card's heading labels its aside.
- **No JavaScript:** content, photos at full opacity, the description in full, the enquiry form (inline on phones through `<noscript>`) and navigation all work.

## Validation

| Command / check | Result |
|---|---|
| `npm run verify` | lint and typecheck clean; 683 unit tests, including the new gallery-geometry and overview-adapter tests |
| `npm run build` | passes |
| media-check | **26/26**: tile and viewer-thumbnail assertions replace the strip and old tile names; the broken-image assertion is stronger |
| property-check | 73/73 |
| motion-check | 117: the zoom out of the frame, the ground fade, Escape back to the frame, focus return, directional arrival, swipe follow, vertical gesture as scroll, pull to close, reduced motion, no-JS effective opacity |
| dashboard-check | 134, with the real-listing coverage above |
| photo-check | 49, with the manager fallback |
| lead, saved, preview, moderation, listing, performance, ui, light, shots, shell, search, home, login, notfound, auth, draft and the rest | all pass |

**Defects fixed during validation:**
- the 320px overflow above;
- tests reading the opening fade frames late;
- a swipe started on an arrow (by design, presses on buttons never drag);
- a CDP touch split across sessions;
- shell-check's second results page not waiting out the UI-15 loading shell's header.

## Remaining issues

- **Similar properties:** no fixture meets the similarity rule today, so the section (now the results card) has not been seen live.
- **Real listings:** amenities and landmarks will appear when posting collects them.
- **Dead CSS:** the ~60 UI-13 Home rules remain.

## UI-17 recommendation

Post Property visual redesign:

- the posting steps in the 1400px frame and the UI-14 to UI-16 language;
- the photo manager restyled around `PhotoFallback` and the framed-photo treatment;
- the review step reusing `PropertyLayout`, so a seller previews exactly the page buyers will see.

Keep the UI-07 and UI-12 form guarantees and the UI-08 photo FLIP.
